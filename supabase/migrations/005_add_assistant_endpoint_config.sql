-- Make the Tassistant assistant endpoint configurable per user.
-- OpenRouter is OpenAI-compatible, so users can point Tassistant at any
-- OpenAI-compatible endpoint: OpenRouter (default), their own TMCP OpenRouter/Gemini
-- Rotate tools (/api/openrouter/v1, /api/gemini/v1), DeepSeek, Gemini, etc.
-- base_url and model are non-secret; only the API key remains encrypted.
alter table user_assistant_settings
  add column if not exists base_url text,
  add column if not exists model text;
