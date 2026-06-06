import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  messages?: ChatMessage[]
  temperature?: number
  max_completion_tokens?: number
}

interface SearchDoc {
  id: string
  name: string
  category: string
  summary: string
  content: string
}

interface SearchResponse {
  value: Array<SearchDoc & { '@search.score': number }>
}

const SEARCH_API_VERSION = '2024-07-01'
const TOP_K = 6

async function retrieveContext(
  query: string,
  ctx: InvocationContext,
): Promise<Array<SearchDoc & { score: number }>> {
  const endpoint = process.env.SEARCH_ENDPOINT?.replace(/\/+$/, '') ?? ''
  const index = process.env.SEARCH_INDEX ?? ''
  const key = process.env.SEARCH_QUERY_KEY ?? ''
  if (!endpoint || !index || !key) return []

  const url = `${endpoint}/indexes/${encodeURIComponent(index)}/docs/search?api-version=${SEARCH_API_VERSION}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: query,
        top: TOP_K,
        queryType: 'simple',
        searchMode: 'all',
        select: 'id,name,category,summary,content',
      }),
    })
    if (!res.ok) {
      ctx.warn(`Search returned ${res.status}; falling back to no retrieval`)
      return []
    }
    const json = (await res.json()) as SearchResponse
    return json.value.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      summary: d.summary,
      content: d.content,
      score: d['@search.score'],
    }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    ctx.warn(`Search call threw: ${msg}`)
    return []
  }
}

function lastUserContent(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return messages[i]!.content ?? ''
  }
  return ''
}

function buildGroundingMessage(docs: Array<SearchDoc & { score: number }>): ChatMessage {
  const body = docs
    .map(
      (d, i) =>
        `[${i + 1}] id=${d.id} | ${d.name} (${d.category})\n${d.content}`,
    )
    .join('\n\n')
  return {
    role: 'system',
    content:
      `Retrieved context from the Algorithm Arena catalog (top ${docs.length} matches, ` +
      `ordered by relevance). Ground every claim ONLY in these entries and end your ` +
      `answer with a line "Citations: [n], [m]" using the bracket indices below.\n\n` +
      body,
  }
}

export async function chat(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  if (request.method !== 'POST') {
    return { status: 405, jsonBody: { error: { message: 'Method not allowed.' } } }
  }

  const base = process.env.FOUNDRY_BASE_URL?.replace(/\/+$/, '') ?? ''
  const deployment = process.env.FOUNDRY_DEPLOYMENT ?? ''
  const apiVersion = process.env.FOUNDRY_API_VERSION ?? '2025-01-01-preview'
  const apiKey = process.env.FOUNDRY_API_KEY ?? ''

  if (!base || !deployment || !apiKey) {
    return {
      status: 500,
      jsonBody: {
        error: { message: 'Server is missing FOUNDRY_BASE_URL, FOUNDRY_DEPLOYMENT, or FOUNDRY_API_KEY.' },
      },
    }
  }

  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return { status: 400, jsonBody: { error: { message: 'Body must be valid JSON.' } } }
  }

  if (!body?.messages?.length) {
    return {
      status: 400,
      jsonBody: { error: { message: 'Body must include a non-empty messages[] array.' } },
    }
  }

  const userQuery = lastUserContent(body.messages)
  const retrieved = userQuery ? await retrieveContext(userQuery, context) : []
  const messages: ChatMessage[] = retrieved.length
    ? [...body.messages.slice(0, -1), buildGroundingMessage(retrieved), body.messages[body.messages.length - 1]!]
    : body.messages

  const url = `${base}/openai/deployments/${encodeURIComponent(
    deployment,
  )}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: body.temperature ?? 0.2,
        max_completion_tokens: body.max_completion_tokens ?? 800,
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upstream call failed'
    context.error('Foundry upstream error', msg)
    return { status: 502, jsonBody: { error: { message: `Upstream error: ${msg}` } } }
  }

  const upstreamText = await upstream.text()
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(upstreamText) as Record<string, unknown>
  } catch {
    payload = { raw: upstreamText }
  }

  if (retrieved.length) {
    payload['_retrieval'] = retrieved.map((d, i) => ({
      index: i + 1,
      id: d.id,
      name: d.name,
      category: d.category,
      score: d.score,
    }))
  }

  return {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

app.http('chat', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: chat,
})
