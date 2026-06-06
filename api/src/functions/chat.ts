import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

interface ChatRequestBody {
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  max_completion_tokens?: number
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
        messages: body.messages,
        temperature: body.temperature ?? 0.2,
        max_completion_tokens: body.max_completion_tokens ?? 800,
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upstream call failed'
    context.error('Foundry upstream error', msg)
    return { status: 502, jsonBody: { error: { message: `Upstream error: ${msg}` } } }
  }

  const text = await upstream.text()
  return {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
    body: text || '{}',
  }
}

app.http('chat', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: chat,
})
