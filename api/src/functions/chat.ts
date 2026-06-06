import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { ManagedIdentityCredential } from '@azure/identity'

const FOUNDRY_SCOPE = 'https://cognitiveservices.azure.com/.default'
const FOUNDRY_RESOURCE = 'https://cognitiveservices.azure.com/'

const credential = new ManagedIdentityCredential()
let cachedToken: { token: string; expiresOnMs: number } | null = null

async function fetchTokenFromIdentityEndpoint(): Promise<{ token: string; expiresOnMs: number }> {
  const endpoint = process.env.IDENTITY_ENDPOINT
  const header = process.env.IDENTITY_HEADER
  if (!endpoint || !header) {
    throw new Error('IDENTITY_ENDPOINT / IDENTITY_HEADER not set in this runtime.')
  }
  const url = `${endpoint}?resource=${encodeURIComponent(FOUNDRY_RESOURCE)}&api-version=2019-08-01`
  const r = await fetch(url, { headers: { 'X-IDENTITY-HEADER': header } })
  const text = await r.text()
  if (!r.ok) throw new Error(`MSI endpoint ${r.status}: ${text.slice(0, 300)}`)
  let parsed: { access_token?: string; expires_on?: string | number }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`MSI endpoint non-JSON: ${text.slice(0, 300)}`)
  }
  if (!parsed.access_token) throw new Error(`MSI endpoint missing access_token: ${text.slice(0, 300)}`)
  const expRaw = parsed.expires_on
  const expSec = typeof expRaw === 'string' ? Number(expRaw) : (expRaw ?? Math.floor(Date.now() / 1000) + 3000)
  return { token: parsed.access_token, expiresOnMs: expSec * 1000 }
}

async function getBearerToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresOnMs - now > 60_000) {
    return cachedToken.token
  }
  try {
    const t = await credential.getToken(FOUNDRY_SCOPE)
    if (t) {
      cachedToken = { token: t.token, expiresOnMs: t.expiresOnTimestamp }
      return t.token
    }
  } catch {
    // fall through to raw MSI
  }
  const t = await fetchTokenFromIdentityEndpoint()
  cachedToken = t
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
