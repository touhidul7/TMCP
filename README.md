# TMCP Tool Gateway

TMCP is a Next.js 16 dashboard and API gateway for connecting third-party tools to scoped agents. Users connect provider accounts, create agents, issue hashed API keys, grant feature-level permissions, and route external agent calls through `/api/gateway/*`.

## Current Application State

- Public UI: professional homepage at `/`, public documentation at `/docs`, shared public header/footer, and sign-in entry at `/login`.
- Dashboard UI: responsive tools registry, connected accounts, agents, API keys, approvals, logs, settings, mobile navigation, and the Tassistant help widget. Tassistant works with any OpenAI-compatible endpoint — its Base URL, model, and API key are configured per user in **Settings** (default `https://openrouter.ai/api/v1`). It can also point at this app's own Rotate-tool bases (`/api/openrouter/v1`, `/api/gemini/v1`) using an `mcp_live_` agent key.
- Dashboard data surfaces now use workspace state for overview statistics, health summaries, recent gateway activity, connected tool coverage, API key counts, and audit logs instead of static demo panels.
- Gateway API:
  - `POST /api/gateway/execute` runs an allowed feature key through a connected account.
  - `GET /api/gateway/tools` lists the calling agent's allowed connected tools.
  - `GET /api/gateway/status` validates the API key and returns agent identity.
  - `GET /api/gateway/docs` returns agent-readable endpoint reference, schemas, allowed tools, feature keys, and examples.
- Documentation UI:
  - `/docs` is the main public user-facing documentation page.
  - `/dashboard/docs` redirects to `/docs` for compatibility.
  - Tool detail pages show per-feature cURL, JavaScript, and Python snippets using the current tool slug and connected account id.
  - API Keys links users to the full documentation page and exposes the agent docs endpoint.
- Implemented built-in router modules currently include Gmail, Google Drive, Google Sheets, Hunter, Consulti, IMAP/SMTP email, Slack, GitHub, SSH, Apify, Resend, Serper, Scrape.do, OpenAI, Anthropic (Claude), OpenRouter, Notion, Airtable, HubSpot, Stripe, Linear, Twilio, Mailchimp, Asana, PostgreSQL, and Meta social automation (WhatsApp Business, Facebook Page, Instagram).
- API key rotation tools (Gemini API Rotate, OpenRouter API Rotate) store a pool of provider keys and expose OpenAI-compatible endpoints (`POST /chat/completions`, `POST /responses`, `POST /embeddings`, `GET /models`). Streaming is supported (`"stream": true` relays the provider's SSE stream unchanged) and standard params (`temperature`, `top_p`, `max_tokens`, …) are forwarded as-is. Each tool has its own dedicated base URL so it can be dropped into any OpenAI-compatible app: `/api/gemini/v1` (Gemini pool) and `/api/openrouter/v1` (OpenRouter pool). A shared `/api/v1` base also works and auto-selects the provider from the model name (`gemini*` → Gemini, otherwise OpenRouter). Apps authenticate with a single TMCP agent key; TMCP rotates the pool round-robin, cools down keys on `429`/quota errors, retries the next key, and returns the provider's original error once all keys are exhausted.
- Scrape.do API Rotate is a rotation tool for the Scrape.do proxy API (which is not OpenAI-compatible). It stores a pool of Scrape.do tokens and exposes a Scrape.do-compatible gateway at `/api/scrapedo` — a drop-in for `https://api.scrape.do/`. Send the same parameters (`url`, `render`, `super`, `geoCode`, …) and pass a TMCP agent key as the `token` query parameter (an `Authorization: Bearer` header also works); TMCP injects a real token from the pool, relays the response (HTML/JSON/binary) unchanged, and fails over to the next token on `429`/`401`/`402` (rate-limit/invalid-token/out-of-credit) errors. Both `GET` and `POST` are supported, with the request body forwarded to the target.
- Apify API Rotate is a rotation tool for the Apify platform API (not OpenAI-compatible). It stores a pool of Apify tokens and exposes a transparent, path-agnostic gateway at `/api/apify/v2` — a drop-in for `https://api.apify.com/v2`. Keep the exact same endpoint path, HTTP method, query parameters, and request body; only swap the base URL and use a TMCP agent key in place of the Apify token (bearer header or `token` query param). Any Apify endpoint and any actor works without custom code (`GET/POST/PUT/PATCH/DELETE/HEAD` are all proxied). TMCP injects a real token from the pool, preserves Apify's response (status/headers/body) as closely as possible, and fails over to the next token on `401`/`402`/`403`/`408`/`429`. Successful responses are streamed straight through (only the small failover-status error payloads are buffered), so large dataset/run-sync downloads pass through with minimal memory overhead. Real Apify tokens are never exposed to the caller.
- Serper API Rotate is a rotation tool for Serper (not OpenAI-compatible). It stores a single pool of Serper keys that serves both Serper products (the same account key works for both), and exposes a transparent, path-agnostic gateway for each: the **Search API** at `/api/serper` is a drop-in for `https://google.serper.dev` (`/search`, `/images`, `/news`, `/places`, `/scholar`, `/webpage`, …), and the **Scrape API** at `/api/serper/scrape` is a drop-in for `https://scrape.serper.dev` (POST a `{ url }` body). Keep the exact same path, HTTP method, query parameters, and JSON body; only swap the base URL and put a TMCP agent key in the `X-API-KEY` header in place of the Serper key. Any endpoint works without custom code (`GET/POST/PUT/PATCH/DELETE/HEAD` are all proxied). TMCP injects a real key from the pool, streams the response straight through, preserves Serper's response as closely as possible, and fails over to the next key on `401`/`402`/`403`/`429`. Real Serper keys are never exposed to the caller.
- Some catalog tools are visible for future integration, but account creation is guarded so unsupported built-ins cannot create misleading connected accounts.
- Gateway hot paths are latency-optimized: pre-flight checks (permission matrix, daily rate limit, credentials) run in parallel; audit-log writes, rotation key-pool bookkeeping, and API-key `last_used_at` refreshes are deferred until after the response is sent (Next.js `after`), so they add no request latency and streamed rotate responses start immediately. `last_used_at` refreshes at most once per 5 minutes per key. Built-in tool runner modules load lazily on first use. Migration `009_add_hot_path_indexes.sql` adds the supporting indexes (unique `api_keys.key_hash`, rate-limit log lookup, connected-account resolution, rotation-pool ordering) — apply it like any other migration.

## Development

Install dependencies and run the local server:

```bash
npm install
npm run dev
```

Build and test:

```bash
npm test
npm run build
```

`npm run lint` currently reports pre-existing React lint findings in dashboard/component files. The production build succeeds.

## Documentation Maintenance Rule

When adding or changing any feature, endpoint, tool runner, tool configuration, permissions behavior, or user workflow:

1. Update the relevant dashboard documentation or generated examples.
2. Update this README or another project Markdown file when the project state changes.
3. Keep examples aligned with real endpoint responses and current feature keys.

## Next.js Version Note

This project uses Next.js `16.2.7`. Before changing route handlers, pages, layouts, caching, or framework conventions, read the relevant local documentation under:

```text
node_modules/next/dist/docs/
```
