-- "Apify API Rotate" tool: rotates a pool of Apify API tokens behind a single TMCP key, exposed via
-- a transparent, path-agnostic Apify-compatible proxy at /api/apify/v2 (drop-in for
-- https://api.apify.com/v2 — any endpoint/method/actor works unchanged).
--
-- No schema change is required: provider_key_pool.provider is free text and now also accepts
-- 'apify' alongside 'gemini', 'openrouter', and 'scrapedo'. This file documents that addition so the
-- migration history stays in step with the in-app catalog and rotation gateway.
--
-- Tokens are stored encrypted (AES-256-GCM) in provider_key_pool, identical to the other rotate
-- tools; the only difference is the gateway protocol (full REST proxy vs OpenAI/Scrape.do shapes).

comment on column provider_key_pool.provider is 'Rotation provider: gemini | openrouter | scrapedo | apify';
