# Sensei — DSA Partner

A Socratic DSA practice partner: it never hands you the solution, it makes you find it.

## What you need first

- **Node.js 18+** installed ([nodejs.org](https://nodejs.org))
- **An API key from one provider:**
  - **Anthropic** (Claude) — [console.anthropic.com](https://console.anthropic.com) → API Keys. Pay-as-you-go, billed by usage.
  - **Groq** (fast, open-weight models like GPT-OSS) — [console.groq.com](https://console.groq.com) → API Keys. Has a free tier with per-model rate limits.

## Setup (one time)

1. Unzip this folder somewhere, then open a terminal in it.
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the env file:
   ```
   cp .env.example .env
   ```
   Then open `.env` and:
   - Set `LLM_PROVIDER=anthropic` **or** `LLM_PROVIDER=groq`
   - Paste your real key into the matching `ANTHROPIC_API_KEY` or `GROQ_API_KEY` line
   - You only need the key for the provider you picked — the other one can stay as the placeholder
   - Never share this file or commit it anywhere public.

   **If using Groq**, the default model is `openai/gpt-oss-120b` — Groq's own recommended general-purpose model as of mid-2026. You can override it by uncommenting `GROQ_MODEL=` in `.env` and setting it to any model listed at [console.groq.com/docs/models](https://console.groq.com/docs/models).

## Running it

You need **two terminals open at once**, both inside this folder:

**Terminal 1 — the backend** (holds your API key, talks to Anthropic/Groq):
```
npm run server
```
You should see: `Sensei backend running on http://localhost:3001`

**Terminal 2 — the frontend** (the actual app UI):
```
npm run dev
```
You should see a local URL like `http://localhost:5173` — open that in your browser.

Leave both terminals running while you use the app. Stop either with `Ctrl+C`.

## Why two servers?

The API key has to live somewhere that isn't visible to anyone opening your browser's dev tools. The backend (`server.js`) is the only thing that ever sees the key; your browser talks to `localhost:3001`, which forwards the request to Anthropic and sends back the reply. Vite's dev server proxies `/api` requests to it automatically (see `vite.config.js`), so there's no CORS setup needed.

## Your progress

Solved-problem stats and hint history are saved in your browser's `localStorage`, scoped to `localhost:5173`. Clearing your browser data for that origin will reset them.

## AUTHOR

PRINCY JAIN