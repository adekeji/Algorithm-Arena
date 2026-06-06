import { app, HttpRequest, HttpResponseInit } from '@azure/functions'

export async function debug(_req: HttpRequest): Promise<HttpResponseInit> {
  const keys = Object.keys(process.env)
    .filter((k) => /identity|msi|webjobs|website|functions|foundry/i.test(k))
    .sort()
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = process.env[k] ?? ''
    out[k] = k.toLowerCase().includes('secret') || k.toLowerCase().includes('header') || k.toLowerCase().includes('key')
      ? `<len=${v.length}>`
      : v
  }
  return {
    status: 200,
    jsonBody: {
      node: process.version,
      cwd: process.cwd(),
      hostKey: process.env.WEBSITE_HOSTNAME ?? null,
      env: out,
    },
  }
}

app.http('debug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'debug',
  handler: debug,
})
