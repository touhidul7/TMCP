// Shared Tassistant endpoint configuration.
// OpenRouter is OpenAI-compatible, so Tassistant can target any OpenAI-compatible
// endpoint (OpenRouter, a TMCP Rotate tool, DeepSeek, Gemini, etc.). Defaults keep
// existing users on OpenRouter without any extra setup.

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Normalize a user-supplied base URL: trim, drop trailing slashes, and a trailing
// /chat/completions if the user pasted the full endpoint by mistake.
function normalizeBaseUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_BASE_URL;
  return value.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "");
}

function resolveModel(raw) {
  const value = (raw || "").trim();
  return value || DEFAULT_MODEL;
}

// Build the chat completions endpoint from a (possibly empty) stored base URL.
function chatCompletionsUrl(rawBaseUrl) {
  return `${normalizeBaseUrl(rawBaseUrl)}/chat/completions`;
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  normalizeBaseUrl,
  resolveModel,
  chatCompletionsUrl
};
