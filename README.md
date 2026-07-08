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
  - `GET /api/gateway/approvals/{approval_id}` lets the requesting agent poll an approval-gated call and retrieve the executed result once an administrator approves it.
- MCP server: `POST /api/mcp` is a spec-compliant Model Context Protocol server (Streamable HTTP transport, stateless, JSON responses). Any MCP client — Claude Desktop/Code, Cursor, etc. — connects with the URL plus an `Authorization: Bearer mcp_live_...` agent key. It implements `initialize` (protocol versions 2024-11-05 / 2025-03-26 / 2025-06-18), `ping`, `tools/list` (each allowed feature key becomes an MCP tool, e.g. `gmail.send` → `gmail__send`, with `inputSchema` from the tool registry or a generated example schema; a `--<account prefix>` suffix disambiguates when one feature is allowed on multiple accounts), and `tools/call` (results as content blocks + `structuredContent`; execution failures are `isError` tool results). Bodies without a `jsonrpc` field keep the original action format (`tools.list` / `tools.call`). The shared execution pipeline lives in `lib/gateway/run-gateway-call.js` and serves `/api/mcp`, `/api/gateway/execute`, and approval re-execution.
- Approval loop: approval-gated calls are queued in `tool_approvals`, the workspace owner is emailed via Resend (deferred, post-response), and deciding via `POST /api/approvals/{id}/decide` (dashboard Approvals page uses this) atomically claims the row, executes the call on approve, and stores `result`/`error`/`executed_at` (migration `010_approval_execution.sql`) for the agent to fetch from the gateway approvals endpoint.
- Custom rotating proxies: a `custom_rotate` tool type lets users define their own rotation gateway for any upstream API — configure the upstream base URL, key-injection style (`Authorization: Bearer`, custom header, or query parameter), and failover status codes in **Tools → Add Tool → Rotating Proxy**. The tool is served at `/api/rotate/{slug}` as a transparent, path-agnostic proxy (all methods) over the same `provider_key_pool` rotation/cooldown machinery as the built-in rotators, gated by the `{slug}.proxy` feature key.
- Scoped, expiring child keys (migration `011_power_features.sql` covers this and the next three items): `POST /api/gateway/keys/mint` (agent-key auth) mints a child key bound to the same agent but restricted to the requested feature keys (`["serper.search", "gmail.*"]`, `*` wildcards; 1h default TTL, 30-day max). Scopes are enforced before the permission matrix on every entry point (gateway, MCP — scoped keys also only *see* in-scope tools in `tools/list` — and all rotate proxies); a scoped key can only mint narrower keys, and revoking a parent key revokes its children.
- Per-minute rate limits: the permission matrix now supports `per_minute_limit` alongside the daily cap (settable via `POST /api/permissions`, null/0 = no cap), enforced with an atomic minute-bucket counter (`bump_minute_usage` RPC, `usage_counters` table) across the gateway and every rotate proxy. Rejected attempts count toward the cap.
- Rotate response cache (`rotate_cache` table): identical requests within a TTL are served from cache without spending pool quota — Serper Search API (default 600s, `TMCP_SERPER_CACHE_TTL`), OpenAI-compatible embeddings (default 3600s, `TMCP_EMBEDDINGS_CACHE_TTL`), and custom rotators (opt-in per tool via the Response Cache TTL field / `rotate.cache_ttl_seconds`). Chat completions are never cached; bodies over 256KB pass through uncached; cache hits return an `x-tmcp-cache: hit` header, are logged with `cached: true`, and consume no rotation attempts.
- Scheduled workflows: `/dashboard/jobs` creates interval jobs (min 5 minutes) that run one gateway call as a chosen agent + API key — through the full scope/permission/rate-limit/audit pipeline — and deliver the outcome to a webhook or email. Jobs CRUD lives at `/api/jobs`; the scheduler tick is `GET /api/cron/run-jobs`, protected by `CRON_SECRET`. `vercel.json` registers a daily Vercel Cron (03:00 UTC) because the Hobby plan rejects deployments with more frequent schedules; for real 5-minute ticks, call the endpoint from any external scheduler (e.g. cron-job.org) with the same `Authorization: Bearer $CRON_SECRET` header — on a Pro plan you can tighten the vercel.json schedule to `*/5 * * * *` instead. Duplicate runs are prevented with a compare-and-set claim on `next_run_at`.
- Machine-readable API: `GET /api/openapi` serves an OpenAPI 3.1 description of the agent-facing surface. A zero-dependency JavaScript SDK lives in `sdk/js` (`TMCPClient`: `execute`, `executeAndWait` approval polling, `listTools`, `mintScopedKey`, `chat`, `embeddings`) ready to publish as `tmcp-sdk`.
- Outgoing email (invites, approval notifications, job deliveries) is configured entirely by environment: `RESEND_API_KEY` + `RESEND_DOMAIN` (sender is `tmcp@{RESEND_DOMAIN}`); with either unset, email sending is skipped gracefully.
- Usage analytics: `/dashboard/analytics` (backed by `GET /api/analytics/summary`) charts the last 30 days of calls per day (success vs failed), calls by tool and agent, LLM token usage by model (token `usage` from rotate-endpoint responses is now captured in `tool_call_logs.output`), rescued-call counts (calls that succeeded only via key failover), and per-key rotation-pool health.
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
