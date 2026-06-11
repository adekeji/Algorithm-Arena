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

## 2. 2-Minute Demo Video Script

Contest hard cap is **2:00**. Aim for **1:50 spoken** to leave headroom.
Four beats, one breath each, no fluff.

### 0:00 — 0:20 · Hook (talking head or voiceover over the live URL)

> "This is **Algorithm Arena**. The dead textbook table of sorting and
> graph algorithms, rebuilt as a living app you can compare, benchmark
> on your own hardware, and ask a grounded **Microsoft Foundry IQ**
> agent for a recommendation — with citations. Built in a **GitHub
> Copilot** loop. Let me show you."

(Cut to the hosted demo: `https://happy-island-0e196290f.7.azurestaticapps.net/`)

### 0:20 — 0:50 · Catalog + Compare (one combined beat)

- Catalog tab → click Quicksort.
  > "21 algorithms across 10 categories. Complexity, CPU notes, ARM vs
  > x86-64 fit, gaming tags — same shape every entry."
- Compare tab → pin Insertion / Merge / Quicksort / Radix.
  > "Sorting a real-time leaderboard, small N, nearly sorted. The matrix
  > already names insertion sort — O(n) best case, cache-friendly."

### 0:50 — 1:15 · Live benchmark

- Benchmark tab → Run the sorting suite.
  > "This isn't a JSON dump. The browser generates the inputs and times
  > the algorithm live. Recharts plots latency by input size — the
  > catalog claim is verified on *my* machine in real time."

### 1:15 — 1:50 · Foundry IQ Agent + citations (the money shot)

- Foundry IQ Agent tab. Auth mode = `relay`. No token in the browser.
- Ask:
  > "Best sort for a 32-player real-time leaderboard?"
- While it answers, narrate over the request:
  > "That POST hit a Static Web Apps Function. The Function ran a top-6
  > **Azure AI Search** query over the catalog index, injected the hits
  > as a system message, then called the **Microsoft Foundry** `gpt-41-mini`
  > deployment with the account key — server side only."
- Point at the `Citations: [1]` line and click the chip → catalog entry
  highlights.
  > "That `[1]` isn't a hallucination — it points at the exact retrieved
  > catalog doc the relay sent the model. Grounded RAG, no browser keys.
  > Built entirely with GitHub Copilot. Repo and live URL on screen."

(Hold the repo + live URL on screen for the last 2 seconds.)

### Recording tips

- Record at 1080p, 30 fps, system audio + mic. Final file ≤ 2:00.
- Pre-warm the Foundry deployment (one throwaway call) so the live
  question returns in < 3 s.
- Have a second tab pre-loaded on the GitHub repo for the close cut.
- Keep the cursor calm — no jittery hover. Cut hard between beats; no
  fade transitions.
- Upload to **YouTube or Vimeo** (contest requires public link); paste
  the URL into the portal Project Description field as well as the
  Demo Video field.

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
