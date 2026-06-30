-- "Serper API Rotate" tool: rotates a pool of Serper API keys behind a single TMCP key, exposed via
-- a transparent, path-agnostic Serper-compatible proxy at /api/serper (drop-in for
-- https://google.serper.dev — any endpoint/method works unchanged, authenticated with X-API-KEY).
--
-- No schema change is required: provider_key_pool.provider is free text and now also accepts
-- 'serper' alongside 'gemini', 'openrouter', 'scrapedo', and 'apify'. This file documents that
-- addition so the migration history stays in step with the in-app catalog and rotation gateway.
--
-- Keys are stored encrypted (AES-256-GCM) in provider_key_pool, identical to the other rotate
-- tools; the only difference is the gateway protocol (Serper REST proxy via X-API-KEY).

comment on column provider_key_pool.provider is 'Rotation provider: gemini | openrouter | scrapedo | apify | serper';
