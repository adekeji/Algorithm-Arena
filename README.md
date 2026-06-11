# Algorithm Arena

Algorithm Arena compares computer-science algorithms across complexity, speed, memory, CPU behavior, architecture fit (ARM vs x86-64), usability, gaming fit, and simulation fit.

It also includes a live benchmark engine and a Foundry IQ Agent panel for retrieval-grounded recommendations with citations, backed by an Azure AI Search index over the algorithm catalog.

**Live demo:** https://happy-island-0e196290f.7.azurestaticapps.net/

**Demo video (5 min):** https://youtu.be/zx4MXF4V-QE

No sign-in, no token paste — the Foundry IQ Agent tab works out of the box against a hosted Microsoft Foundry chat deployment via a Static Web Apps managed Function relay.

## Challenge Alignment (Agents League)

Track target: Creative Apps (GitHub Copilot) with Microsoft IQ integration via Foundry IQ.

This project includes:
- A working, demoable app
- Foundry IQ integration path (Foundry IQ Agent tab)
- Public source code
- Submission checklist and architecture diagram

## Features

- Catalog view with 20+ algorithms across categories
- Side-by-side comparison matrix for strengths/weaknesses and technical traits
- Live browser benchmarking for benchmarkable algorithms
- Black glassmorphism interface
- Foundry IQ Agent tab for grounded, cited recommendations

## Architecture

![Algorithm Arena architecture diagram](docs/architecture.png)

Mermaid source ([`docs/architecture.mmd`](docs/architecture.mmd)) — same diagram inline below for editors that render Mermaid:

```mermaid
flowchart LR
  U[User browser] --> W[Algorithm Arena SPA on Azure Static Web Apps]
  W --> C[Catalog and Compare Engine]
  W --> B[Live Benchmark Engine]
  W --> A[Foundry IQ Agent Panel]
  A -- POST /api/chat --> F1[SWA Managed Function chat]
  F1 -- top-k search --> S[Azure AI Search algorithm-catalog index]
  S -- top 6 hits --> F1
  F1 -- api-key header + grounding --> F[Microsoft Foundry AI Services account]
  F --> M[gpt-41-mini chat deployment]
  M --> R[Grounded answer with bracket citations]
  R --> A
```

The browser never sees a Foundry token, a search key, or the catalog
itself. For each user turn the SWA-hosted Function in
[`api/src/functions/chat.ts`](api/src/functions/chat.ts):

1. Issues a top-6 simple search against the `algorithm-catalog` Azure AI
   Search index using `SEARCH_QUERY_KEY` (server-side, scoped to query-only).
2. Builds a system message that lists each retrieved entry as
   `[n] id=… | Name (Category)\n<content>` and tells the model to ground
   every claim in those entries and finish with `Citations: [n], [m]`.
3. Calls the Foundry chat-completions endpoint with the Foundry account
   API key (`FOUNDRY_API_KEY`), then attaches a `_retrieval[]` array to
   the response so the UI can map each cited bracket index back to the
   matching catalog entry.

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open the printed local URL (default: http://localhost:5173).

## Foundry IQ Setup

The Foundry IQ Agent tab calls a Foundry-hosted chat deployment via the
Azure OpenAI-compatible data plane. In the hosted demo every turn is
retrieval-grounded against an Azure AI Search index built from the
algorithm catalog: the SWA Function pulls the top 6 matching entries and
injects them as a system message, and the model is instructed to cite
with `[n]` indices that map to those retrieved entries.

The Agent tab supports three auth modes:

- `relay` (default in production) — calls `/api/chat` on the same origin.
  No token in the browser. Used by the public hosted demo.
- `bearer` — paste a short-lived Azure AD bearer token. Used for local dev
  through the Vite proxy at `/foundry`.
- `api-key` — paste the Foundry account key. Convenient for one-off testing
  only; never expose this in a shipped frontend.

Defaults are read from `.env` (copy `.env.example` to `.env`) and can be
overridden in the UI form at runtime.

### Current Provisioned Azure Resources

- Resource group: `rg-algorithm-arena`
- Foundry account: `ai-account-skldjimkph5a6` (kind=AIServices, S0, northcentralus)
- Foundry project: `ai-project-algorithm-arena`
- Chat deployment: `gpt-41-mini` (model `gpt-4.1-mini` @ `2025-04-14`, GlobalStandard)
- Azure OpenAI base: `https://ai-account-skldjimkph5a6.cognitiveservices.azure.com`
- Static Web App: `algorithm-arena-web` (Standard, eastus2)
- Hosted URL: https://happy-island-0e196290f.7.azurestaticapps.net/
- SWA-managed Function: `POST /api/chat` (relay; does AI Search retrieval, then chat-completions; reads `FOUNDRY_*` and `SEARCH_*` app settings)
- Azure AI Search: `srch-algorithm-arena` (Basic SKU, centralus, 1 replica × 1 partition, ~$75/month)
- Search index: `algorithm-catalog` (21 docs, schema in [`infra/search-index.json`](infra/search-index.json), seeded via [`scripts/push-search-docs.ts`](scripts/push-search-docs.ts))

Infra is defined in [`infra/swa.bicep`](infra/swa.bicep) and deploys via the
`Deploy Static Web App` GitHub Actions workflow in
[`.github/workflows/deploy-swa.yml`](.github/workflows/deploy-swa.yml).

### Quick Bearer Token Flow (local dev only)

1. Get a fresh bearer token (expires in ~1 hour):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\get-foundry-token.ps1
```

2. In the app Foundry IQ Agent tab:

- Auth mode: `bearer`
- Endpoint URL: `/foundry` (dev proxy) or your prod relay base
- Deployment: `gpt-41-mini`
- API version: `2025-01-01-preview`
- Token: paste the script output

3. Ask a question. The model is grounded to the catalog and will end with a
   `Citations: [n], [m]` line; the UI maps those indices to algorithm entries.

4. If the token expires, run the script again and paste a fresh one.

4. If the token expires, run the script again and paste a fresh one.

## Submission Checklist

- [x] Register for Agents League
- [x] Select your challenge track (Creative Apps with GitHub Copilot)
- [x] Foundry IQ integration working end-to-end against `gpt-41-mini` deployment with Azure AI Search retrieval and bracket-indexed citations
- [x] Public hosted demo with tokenless Foundry calls: https://happy-island-0e196290f.7.azurestaticapps.net/
- [x] Project description and 5-minute demo video script drafted: [`docs/SUBMISSION.md`](docs/SUBMISSION.md)
- [x] Demo video recorded and uploaded (≤ 5 min, public): https://youtu.be/zx4MXF4V-QE
- [x] Public repository: https://github.com/adekeji/Algorithm-Arena
- [x] README updated with architecture, setup, and provisioned resources
- [x] Architecture diagram included
- [x] No credentials or secrets committed (`.env` is gitignored, only `.env.example` is tracked)
- [ ] Submit project description + video + repo + diagram in contest portal

## Security Notes

- Never commit API keys, tokens, or secrets.
- This project intentionally keeps token entry runtime-only in the UI.
- Use a backend relay in production if you need stronger key protection.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Recharts
