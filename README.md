# MoE AI

A complete, working web application that visualises how a **Mixture-of-Experts (MoE)** AI system routes a question to the right specialist, gets an answer from a real LLM (or a local Demo Mode), and reports honest token, cost and environmental metrics.

> This is a **simplified, educational representation** of sparse MoE. It does not reproduce DeepSeek's (or any vendor's) exact architecture.

## Pipeline

```
Question → Subject Detection → MoE Router → Selected Expert → LLM API → Answer → Token / Cost / Environmental Metrics
```

- Router returns `subject`, `expert`, `confidence`, `routingReason` and only the **selected** expert receives the question.
- 8 experts: **Mathematics, Physics, Chemistry, Biology, History, Coding, Language, General**.
- If confidence is below the threshold, the question falls back to the **General** expert.

## Quick start

```bash
./moe-ai
```

The launcher installs dependencies on first run, creates a `.env` from `.env.example`, starts the server and opens your browser at `http://localhost:3000`.


### Options

```
./moe-ai            # install deps (first run), start server, open browser
./moe-ai --no-open  # start server without opening a browser
./moe-ai --port 8080
```

## Demo Mode vs live providers

Out of the box the app runs in **Demo Mode**: the full pipeline (classification → routing → expert → simulated answer → metrics) works with no API key. Every demo answer is clearly labelled as simulated.

To use a real LLM, open **Settings → API Configuration**:

- **Provider**: OpenAI, DeepSeek, Anthropic, or any OpenAI-compatible endpoint.
- **Model**, **Base URL** (for compatible endpoints) and **Test Connection**.
- **API Key** — stored **server-side only** in `server/data/secrets.json` (mode `0600`). It is never sent back to the browser.

If no key is configured for the selected provider, chat automatically falls back to Demo Mode and tells you why.

## Metrics honesty

Everything is labelled in the UI:

| Label | Meaning |
|---|---|
| **ACTUAL** | Measured directly by this app (token counts via a local tokenizer, response time). |
| **ESTIMATED** | Derived from configurable assumptions (cost = tokens × price; energy/water/CO₂e). |
| **HYPOTHETICAL** | Comparison against a simulated dense architecture where all 8 experts process every question. |

The "dense equivalent" comparison models what a dense model would have cost — it is **not** a claim that the API actually processed all 8 experts, and activating 1 of 8 experts does **not** imply an 87.5% electricity saving. The default environmental model uses a conservative, editable MoE energy-reduction assumption.

## Environmental estimates

All environmental figures are estimates and are labelled as such. Formulas:

```
energy = queries × energyPerQuery          (Wh)
water  = energy[kWh] × waterIntensity      (L/kWh)
CO₂e   = energy[kWh] × carbonIntensity     (kg CO₂e/kWh)
savings = dense baseline − modelled MoE scenario
```

Defaults: 2.9 Wh baseline per query · 45% MoE reduction · 2.0 L/kWh water · 0.4 kg CO₂e/kWh. All are editable in **Settings → Environmental Assumptions** (with a reset button) because there is no universal electricity/water use per AI query. Sources (IEA, Joule, FAccT, "Making AI Less Thirsty") are listed on the **Environmental** page with an explanation of the methodology.

## Project structure

```
moe-ai/
├── moe-ai                  # executable launcher
├── .env.example            # PORT + provider API key env vars
├── server/
│   ├── index.js            # Express app + all API routes
│   ├── config.js           # providers, default pricing, env assumptions
│   ├── store.js            # settings/history/keys persistence (server-side)
│   ├── experts.js          # the 8 experts (system prompts + routing keywords)
│   ├── router.js           # offline subject classifier (confidence + reason)
│   ├── tokenizer.js        # token counting (gpt-tokenizer)
│   ├── metrics.js          # token / cost / environmental engines
│   ├── providers.js        # OpenAI / DeepSeek / Anthropic / compatible adapters
│   └── demo.js             # clearly-labelled simulated answers
└── public/
    ├── index.html          # SPA shell
    ├── styles.css          # light/dark design system, responsive
    ├── app.js              # views: Chat, Dashboard, Experts, Analytics, History, Settings, About, Environmental
    ├── charts.js           # dependency-free canvas charts
    └── api.js              # fetch wrapper (same-origin, no secrets)
```

Runtime data (settings, history, keys) is stored under `server/data/` (git-ignored).

## API reference

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/chat` | Run the full pipeline and return a `QueryRecord`. |
| `GET` | `/api/settings` | Current settings, providers, defaults (never the API key). |
| `PUT` | `/api/settings` | Update settings; store an API key server-side. |
| `POST` | `/api/providers/test` | Test a provider connection. |
| `GET` | `/api/history` | List records (`?q=`, `?limit=`, `?full=1`). |
| `GET` | `/api/history/:id` | Full record incl. prompt sent and answer. |
| `DELETE` | `/api/history/:id` · `/api/history` | Delete one / clear all. |
| `GET` | `/api/stats` | Aggregated dashboard/analytics data. |
| `GET` | `/api/experts` | Expert catalogue with live usage stats. |

## QueryRecord

Each history record stores: `id, timestamp, question, subject, confidence, expert, inputTokens, outputTokens, totalTokens, denseEquivalentTokens, tokensSaved, energyEstimate, energySaved, waterEstimate, waterSaved, co2Estimate, co2Saved, cost, costSaved, model, provider` — plus routing reason, the prompt sent, the answer, and response time.

## Notes

- Token counts use OpenAI's cl100k encoding via `gpt-tokenizer` as an approximation for all providers and are therefore labelled **ESTIMATED**.
- This project intentionally does **not** claim to measure a provider's real data-centre resources.
