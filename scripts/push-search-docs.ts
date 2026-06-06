// Pushes the algorithm catalog from src/data/algorithms.ts into the Azure AI
// Search index `algorithm-catalog`. Run with:
//
//   $env:SEARCH_ENDPOINT="https://srch-algorithm-arena.search.windows.net"
//   $env:SEARCH_ADMIN_KEY="<primary admin key>"
//   $env:SEARCH_INDEX="algorithm-catalog"
//   npx tsx scripts/push-search-docs.ts
//
// Uses Node fetch + the Search REST API; no extra deps required.

import { algorithms } from '../src/data/algorithms'

const endpoint = (process.env.SEARCH_ENDPOINT ?? '').replace(/\/+$/, '')
const key = process.env.SEARCH_ADMIN_KEY ?? ''
const index = process.env.SEARCH_INDEX ?? 'algorithm-catalog'

if (!endpoint || !key) {
  console.error('SEARCH_ENDPOINT and SEARCH_ADMIN_KEY must be set.')
  process.exit(1)
}

const tags = (a: (typeof algorithms)[number]): string[] => {
  const t: string[] = [a.category]
  if (a.stable) t.push('stable')
  if (a.inPlace) t.push('in-place')
  if (a.parallelizable) t.push('parallelizable')
  return t
}

const buildContent = (a: (typeof algorithms)[number]): string =>
  [
    `Name: ${a.name}`,
    `Category: ${a.category}`,
    `Summary: ${a.summary}`,
    `Time complexity (best/avg/worst): ${a.complexity.time.best} / ${a.complexity.time.average} / ${a.complexity.time.worst}`,
    `Space complexity: ${a.complexity.space}`,
    `Strengths: ${a.strengths.join('; ')}`,
    `Weaknesses: ${a.weaknesses.join('; ')}`,
    `Gaming use: ${a.gamingUse}`,
    `Simulation use: ${a.simulationUse}`,
    `CPU notes: ${a.cpuNotes}`,
    `Memory notes: ${a.memoryNotes}`,
    `Architecture notes: ${a.architectureNotes}`,
    `Hardware: ${a.hardware}`,
    `Software: ${a.software}`,
  ].join('\n')

const docs = algorithms.map((a) => ({
  '@search.action': 'mergeOrUpload' as const,
  id: a.id,
  name: a.name,
  category: a.category,
  summary: a.summary,
  content: buildContent(a),
  strengths: a.strengths,
  weaknesses: a.weaknesses,
  tags: tags(a),
  ratingSpeed: a.ratings.speed,
  ratingMemory: a.ratings.memory,
  ratingCpu: a.ratings.cpu,
  ratingUsability: a.ratings.usability,
  ratingGaming: a.ratings.gaming,
  ratingSimulation: a.ratings.simulation,
  complexityBest: a.complexity.time.best,
  complexityAverage: a.complexity.time.average,
  complexityWorst: a.complexity.time.worst,
  spaceComplexity: a.complexity.space,
}))

const url = `${endpoint}/indexes/${encodeURIComponent(index)}/docs/index?api-version=2024-07-01`

const res = await fetch(url, {
  method: 'POST',
  headers: { 'api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: docs }),
})

const text = await res.text()
if (!res.ok) {
  console.error(`Upload failed: HTTP ${res.status}`)
  console.error(text)
  process.exit(1)
}

const parsed = JSON.parse(text) as { value: Array<{ key: string; status: boolean; errorMessage?: string }> }
const ok = parsed.value.filter((r) => r.status).length
const fail = parsed.value.length - ok
console.log(`Uploaded ${ok} docs, ${fail} failures.`)
if (fail > 0) {
  for (const r of parsed.value) {
    if (!r.status) console.error(`  ${r.key}: ${r.errorMessage}`)
  }
  process.exit(1)
}
