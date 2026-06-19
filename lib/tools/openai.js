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

async function runOpenAITool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://api.openai.com/v1";
  const authHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "openai.chat") {
    const messages = toMessages(input);
    if (!messages) throw new Error("Missing messages or prompt for openai.chat");
    const model = input.model || "gpt-4o-mini";

    if (!hasRealKey) {
      return { success: true, model, reply: "[sandbox] OpenAI chat simulated. Connect a real API key to call live models.", mode: "sandbox-simulation" };
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
    }), "OpenAI chat completion failed");

    return {
      success: true,
      model: json.model || model,
      reply: json.choices?.[0]?.message?.content ?? null,
      usage: json.usage || null,
      mode: "authenticated"
    };
  }

  if (featureKey === "openai.embeddings") {
    const text = input.input || input.text || input.query;
    if (!text) throw new Error("Missing input/text for openai.embeddings");
    const model = input.model || "text-embedding-3-small";

    if (!hasRealKey) {
      return { success: true, model, embeddings: [[0.01, 0.02, 0.03]], dimensions: 3, mode: "sandbox-simulation" };
    }

    const json = await readJson(await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ model, input: text })
    }), "OpenAI embeddings failed");

    return {
      success: true,
      model: json.model || model,
      embeddings: (json.data || []).map((d) => d.embedding),
      usage: json.usage || null,
      mode: "authenticated"
    };
  }

  if (featureKey === "openai.image_gen") {
    const prompt = input.prompt || input.query || input.text;
    if (!prompt) throw new Error("Missing prompt for openai.image_gen");
    const model = input.model || "dall-e-3";

    if (!hasRealKey) {
      return { success: true, model, images: ["https://example.com/sandbox-image.png"], mode: "sandbox-simulation" };
    }

    const json = await readJson(await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        model,
        prompt,
        n: Number(input.n) || 1,
        size: input.size || "1024x1024"
      })
    }), "OpenAI image generation failed");

    return {
      success: true,
      model,
      images: (json.data || []).map((d) => d.url || d.b64_json),
      mode: "authenticated"
    };
  }

  throw new Error(`Unsupported OpenAI feature key: ${featureKey}`);
}

module.exports = { runOpenAITool };
