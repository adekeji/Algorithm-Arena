export interface FoundryIqConfig {
  endpointUrl: string
  apiKey: string
  authMode: 'api-key' | 'bearer'
  apiVersion?: string
}

export interface FoundryCitation {
  title: string
  url?: string
  source?: string
}

export interface FoundryIqReply {
  text: string
  citations: FoundryCitation[]
  reasoningSteps: string[]
  conversationId?: string
  raw: unknown
}

interface FoundryInvocationPayload {
  input: string
  conversationId?: string
}

const DEFAULT_API_VERSION = '2025-05-01-preview'

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return v
        if (v && typeof v === 'object' && 'text' in v) return String((v as { text?: unknown }).text ?? '')
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function parseCitations(payload: Record<string, unknown>): FoundryCitation[] {
  const direct = toArray<Record<string, unknown>>(payload.citations)
  const nested = toArray<Record<string, unknown>>(payload.output)
    .flatMap((o) => toArray<Record<string, unknown>>(o.citations))

  const all = [...direct, ...nested]
  const unique = new Map<string, FoundryCitation>()

  for (const c of all) {
    const title = String(c.title ?? c.name ?? c.id ?? 'Source')
    const url = c.url ? String(c.url) : undefined
    const source = c.source ? String(c.source) : undefined
    const key = `${title}::${url ?? ''}::${source ?? ''}`
    if (!unique.has(key)) unique.set(key, { title, url, source })
  }

  return [...unique.values()]
}

function parseReasoning(payload: Record<string, unknown>): string[] {
  const direct = toArray<string>(payload.reasoningSteps).map(String)
  const alt = toArray<Record<string, unknown>>(payload.reasoning)
    .map((r) => String(r.step ?? r.text ?? ''))
    .filter(Boolean)
  return [...direct, ...alt]
}

function parseText(payload: Record<string, unknown>): string {
  const candidates: unknown[] = [
    payload.output_text,
    payload.answer,
    payload.text,
    (payload.choices as Array<{ message?: { content?: unknown } }> | undefined)?.[0]?.message?.content,
    (payload.output as Array<{ content?: unknown }> | undefined)?.[0]?.content,
  ]

  for (const candidate of candidates) {
    const t = toText(candidate)
    if (t.trim()) return t
  }

  return 'No answer text returned by endpoint.'
}

export async function invokeFoundryIq(
  cfg: FoundryIqConfig,
  payload: FoundryInvocationPayload,
): Promise<FoundryIqReply> {
  if (!cfg.endpointUrl.trim()) throw new Error('Foundry IQ endpoint URL is required.')
  if (!cfg.apiKey.trim()) throw new Error('API key/token is required.')

  const url = new URL(cfg.endpointUrl)
  if (!url.searchParams.has('api-version')) {
    url.searchParams.set('api-version', cfg.apiVersion?.trim() || DEFAULT_API_VERSION)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (cfg.authMode === 'api-key') headers['api-key'] = cfg.apiKey.trim()
  else headers.Authorization = `Bearer ${cfg.apiKey.trim()}`

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      input: payload.input,
      conversation_id: payload.conversationId,
      require_citations: true,
      include_reasoning: true,
    }),
  })

  const rawText = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {}
  } catch {
    throw new Error(`Endpoint returned non-JSON response (${response.status}).`)
  }

  if (!response.ok) {
    const msg = String(data.error ?? data.message ?? `Request failed (${response.status}).`)
    throw new Error(msg)
  }

  return {
    text: parseText(data),
    citations: parseCitations(data),
    reasoningSteps: parseReasoning(data),
    conversationId: data.conversation_id ? String(data.conversation_id) : undefined,
    raw: data,
  }
}
