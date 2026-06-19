const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || json?.error || fallbackMessage);
  }
  return json;
}

function toMessages(input) {
  if (Array.isArray(input.messages) && input.messages.length > 0) return input.messages;
  const prompt = input.prompt || input.query || input.text;
  if (prompt) return [{ role: "user", content: String(prompt) }];
  return null;
}

async function runOpenRouterTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://openrouter.ai/api/v1";
  const authHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "openrouter.chat") {
    const messages = toMessages(input);
    if (!messages) {
      throw new Error("Missing messages or prompt for openrouter.chat");
    }
    const model = input.model || "openai/gpt-4o-mini";

    if (!hasRealKey) {
      return { success: true, model, reply: "[sandbox] OpenRouter chat simulated. Connect a real API key to call live models.", mode: "sandbox-simulation" };
    }

    const json = await readJson(await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        model,
        messages,
        ...(input.max_tokens ? { max_tokens: Number(input.max_tokens) } : {}),
        ...(input.temperature != null ? { temperature: Number(input.temperature) } : {})
      })
    }), "OpenRouter chat completion failed");

    return {
      success: true,
      model: json.model || model,
      reply: json.choices?.[0]?.message?.content ?? null,
      usage: json.usage || null,
      raw: json,
      mode: "authenticated"
    };
  }

  if (featureKey === "openrouter.list_models") {
    if (!hasRealKey) {
      return { success: true, models: [{ id: "openai/gpt-4o-mini" }, { id: "anthropic/claude-3.5-sonnet" }], mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${baseUrl}/models`, { headers: authHeaders }), "OpenRouter list models failed");
    return { success: true, models: json.data || json.models || [], mode: "authenticated" };
  }

  throw new Error(`Unsupported OpenRouter feature key: ${featureKey}`);
}

module.exports = { runOpenRouterTool };
