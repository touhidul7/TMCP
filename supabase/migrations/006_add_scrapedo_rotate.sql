-- "Scrape.do API Rotate" tool: rotates a pool of Scrape.do API tokens behind a single TMCP key,
-- exposed via the Scrape.do-compatible proxy at /api/scrapedo (drop-in for https://api.scrape.do/).
--
-- No schema change is required: provider_key_pool.provider is free text and now also accepts
-- 'scrapedo' alongside 'gemini' and 'openrouter'. This file documents that addition so the
-- migration history stays in step with the in-app catalog and rotation gateway.
--
-- Tokens are stored encrypted (AES-256-GCM) in provider_key_pool, identical to the OpenAI-compatible
-- rotate tools; the only difference is the gateway protocol (query-param proxy vs OpenAI endpoints).

comment on column provider_key_pool.provider is 'Rotation provider: gemini | openrouter | scrapedo';
