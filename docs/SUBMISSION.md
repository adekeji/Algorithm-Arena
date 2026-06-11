# Algorithm Arena — Agents League Submission Materials

These materials are written for the Microsoft Agents League AISF challenge
submission. Copy-paste into the contest portal and a teleprompter as
needed.

---

## 1. Project Description (≈ 430 words)

**Algorithm Arena** turns the classic textbook table of algorithms into a
living, browsable, comparable, runnable, and ask-it-anything reference
that anyone — students, game developers, simulation engineers — can use
to pick the right algorithm for the job.

The app combines four things in one place:

1. **A curated catalog of 21 algorithms** across sorting, searching,
   graphs, dynamic programming, hashing, trees, machine learning,
   cryptography, numerical methods, and strings — each with complexity,
   strengths, weaknesses, CPU/memory notes, ARM vs x86-64 fit, and tags
   for gaming and simulation use-cases.
2. **A side-by-side comparison engine** that lays the matrix bare so you
   can answer questions like "merge sort vs heapsort for a 5 MB log file
   on a Snapdragon" in one screen.
3. **A live, in-browser benchmark engine** that runs the marked
   algorithms against generated inputs and plots latency with Recharts —
   so the user verifies the catalog claims on their own machine.
4. **A Foundry IQ Agent panel** that takes natural-language questions
   ("which sort is best for a real-time leaderboard with 32 players?")
   and returns answers grounded in the catalog, with bracket citations
   that map back to the exact entries used.

**How Microsoft IQ is integrated.** The Agent panel POSTs to a Static Web
Apps managed Function. For every turn the Function (a) issues a top-6
simple search against an **Azure AI Search** index built from the
catalog, (b) injects the hits as a system message with `[n] id=…`
markers, and (c) calls the **Microsoft Foundry** `gpt-41-mini`
chat-completions deployment with the Foundry account API key —
**server-side only**. The relay attaches a `_retrieval[]` array to the
response so the React UI maps every cited bracket index back to the
catalog entry it came from, and renders it as a clickable citation card.
This is retrieval-augmented generation grounded in a Microsoft IQ
deployment, no browser-side keys, no token paste in the hosted demo.

**How GitHub Copilot was used.** The entire app — React + TypeScript +
Vite + Tailwind v4 SPA, the benchmark harness, the catalog seed data,
the Azure Function relay, the AI Search index schema, the Bicep infra,
and the GitHub Actions deploy workflow — was built in a Copilot Agent
loop. Copilot wrote, refactored, debugged the Free→Standard SWA
provisioning failure, the SWA-MSI propagation gap, and the
`searchMode=any` retrieval bug, then drove the live smoke tests.

**Tech.** React 19 · TypeScript 5 · Vite 6 · Tailwind v4 · Recharts ·
Azure Static Web Apps (Standard) · Azure Functions v4 (Node) · Azure AI
Search (Basic) · Microsoft Foundry AI Services · Bicep · GitHub Actions.

**Live demo:** https://happy-island-0e196290f.7.azurestaticapps.net/
**Repo:** https://github.com/adekeji/Algorithm-Arena

---

## 2. 5-Minute Demo Video Script

Aim for **4:45 spoken**, leaving headroom. Talk fast but clear. Every
beat is one breath.

### 0:00 — 0:30 · Hook & framing

> "This is **Algorithm Arena**. Every CS student gets handed the same
> table — bubble sort, merge sort, quicksort, BFS, DFS — and told
> 'memorize the complexities.' That table is dead. I rebuilt it as a
> living app: you can compare, you can benchmark on your own hardware,
> and you can ask a grounded Foundry IQ agent for a recommendation
> with citations. Built in a GitHub Copilot loop, deployed on Azure
> Static Web Apps with a Microsoft Foundry backend and Azure AI Search
> for retrieval. Let me show you."

(Cut to the live URL in the browser.)

### 0:30 — 1:30 · Catalog browse

- Open the hosted demo.
- Click into a sorting algorithm (e.g. Quicksort).
- Show the detail card: complexity, strengths, weaknesses, CPU notes,
  ARM vs x86-64 fit, gaming/simulation tags.
- "21 algorithms across 10 categories. Every entry is the same shape."

### 1:30 — 2:30 · Side-by-side compare

- Switch to the Compare tab.
- Pin Insertion Sort, Merge Sort, Quicksort, Radix Sort.
- "I want to sort a real-time game leaderboard. Small N, mostly sorted
  frame to frame. Look at the *Best case* row — insertion sort is O(n),
  and the *Gaming notes* call it 'cache-friendly, predictable
  branches'. The matrix already told me the answer."

### 2:30 — 3:30 · Live benchmark

- Switch to a benchmarkable algorithm (e.g. sorting suite).
- Click **Run**.
- "This isn't reading a JSON file. The browser generates inputs and
  times the algorithm right here. Recharts plots latency by input size.
  The catalog claim is now verified on *my* machine."

### 3:30 — 4:30 · Foundry IQ Agent + retrieval (the money shot)

- Switch to the Foundry IQ Agent tab.
- Auth mode is already `relay`. No token, no key in the browser.
- Ask:
  > "Recommend an algorithm for sorting a real-time multiplayer
  > leaderboard with about 32 players and explain the choice."
- While the answer streams in, narrate:
  > "Behind the scenes the SWA Function just hit Azure AI Search for the
  > top six catalog entries that match this question — insertion sort,
  > bubble sort, quicksort, merge sort, KMP, radix sort — injected them
  > as a system message into a Microsoft Foundry `gpt-41-mini`
  > deployment, and told it to ground every claim in those entries."
- Read the answer. Point at the `Citations: [1]` line.
- Hover/click the `[1]` chip → it lights up the Insertion Sort catalog
  entry side-panel.
  > "That isn't the model hallucinating insertion sort. The [1] points
  > at the *exact* retrieved doc the relay sent it."

### 4:30 — 5:00 · Architecture + close

- Cut to the mermaid diagram in the README (or a still slide).
- "User browser → Static Web App SPA → SWA-managed Function → Azure AI
  Search for retrieval → Foundry `gpt-41-mini` for generation. Keys
  never leave the server. Whole thing built in a Copilot agent loop,
  whole thing deployed by `git push`."
- End on the live URL + repo URL on screen for 3 seconds.

### Recording tips

- Record at 1080p, 30 fps, system audio + mic.
- Pre-warm the Foundry deployment (one throwaway call) so the live
  question returns in <4 s.
- Have a second tab open on the GitHub repo so you can cut to it for
  the close.
- Keep the cursor calm — no jittery hover.

---

## 3. Submission Portal Checklist

| Field                         | Value                                                              |
|-------------------------------|--------------------------------------------------------------------|
| Project name                  | Algorithm Arena                                                    |
| Track                         | Creative Apps (GitHub Copilot)                                     |
| Microsoft IQ integration      | Foundry AI Services (`gpt-41-mini`) + Azure AI Search retrieval    |
| Public repo                   | https://github.com/adekeji/Algorithm-Arena                         |
| Live demo                     | https://happy-island-0e196290f.7.azurestaticapps.net/              |
| Demo video                    | (paste URL after upload)                                           |
| Description                   | Use Section 1 above                                                |
| Architecture diagram          | `README.md` mermaid block (or export as PNG)                       |
| Region                        | SWA eastus2 · Foundry northcentralus · AI Search centralus         |
