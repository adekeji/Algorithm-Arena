import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { DefaultAzureCredential } from '@azure/identity'

const FOUNDRY_SCOPE = 'https://cognitiveservices.azure.com/.default'

const credential = new DefaultAzureCredential()
let cachedToken: { token: string; expiresOnMs: number } | null = null

async function getBearerToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresOnMs - now > 60_000) {
    return cachedToken.token
  }
  const t = await credential.getToken(FOUNDRY_SCOPE)
  if (!t) throw new Error('Failed to acquire bearer token for Foundry.')
  cachedToken = { token: t.token, expiresOnMs: t.expiresOnTimestamp }
  return t.token
}

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

  if (!base || !deployment) {
    return {
      status: 500,
      jsonBody: {
        error: { message: 'Server is missing FOUNDRY_BASE_URL or FOUNDRY_DEPLOYMENT.' },
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

  let token: string
  try {
    token = await getBearerToken()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token acquisition failed'
    context.error('Token error', msg)
    return { status: 500, jsonBody: { error: { message: msg } } }
  }

  const url = `${base}/openai/deployments/${encodeURIComponent(
    deployment,
  )}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      max_completion_tokens: body.max_completion_tokens ?? 800,
    }),
  })

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
