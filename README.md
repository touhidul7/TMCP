# TMCP Tool Gateway

TMCP is a Next.js 16 dashboard and API gateway for connecting third-party tools to scoped agents. Users connect provider accounts, create agents, issue hashed API keys, grant feature-level permissions, and route external agent calls through `/api/gateway/*`.

## Current Application State

- Public UI: professional homepage at `/`, public documentation at `/docs`, shared public header/footer, and sign-in entry at `/login`.
- Dashboard UI: responsive tools registry, connected accounts, agents, API keys, approvals, logs, settings, mobile navigation, and the Tassistant help widget.
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
- Some catalog tools are visible for future integration, but account creation is guarded so unsupported built-ins cannot create misleading connected accounts.

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
