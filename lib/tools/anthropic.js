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

function anthropicHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json"
  };
}

function textFromContent(content) {
  if (!Array.isArray(content)) return null;
  return content.filter((block) => block.type === "text").map((block) => block.text).join("\n") || null;
}

async function runAnthropicTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://api.anthropic.com/v1";

  if (featureKey === "anthropic.chat") {
    let messages = Array.isArray(input.messages) && input.messages.length > 0 ? input.messages : null;
    if (!messages) {
      const prompt = input.prompt || input.query || input.text;
      if (!prompt) throw new Error("Missing messages or prompt for anthropic.chat");
      messages = [{ role: "user", content: String(prompt) }];
    }
    const model = input.model || "claude-3-5-sonnet-20241022";
    const maxTokens = Number(input.max_tokens) || 1024;

    if (!hasRealKey) {
      return { success: true, model, reply: "[sandbox] Claude chat simulated. Connect a real API key to call live models.", mode: "sandbox-simulation" };
    }

    const json = await readJson(await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        ...(input.system ? { system: input.system } : {}),
        ...(input.temperature != null ? { temperature: Number(input.temperature) } : {})
      })
    }), "Anthropic messages request failed");

    return {
      success: true,
      model: json.model || model,
      reply: textFromContent(json.content),
      usage: json.usage || null,
      mode: "authenticated"
    };
  }

  if (featureKey === "anthropic.vision") {
    const prompt = input.prompt || input.query || input.text || "Describe this image.";
    const imageUrl = input.image_url || input.imageUrl;
    const imageBase64 = input.image_base64 || input.imageBase64;
    if (!imageUrl && !imageBase64) {
      throw new Error("Missing image_url or image_base64 for anthropic.vision");
    }
    const model = input.model || "claude-3-5-sonnet-20241022";
    const maxTokens = Number(input.max_tokens) || 1024;

    if (!hasRealKey) {
      return { success: true, model, reply: "[sandbox] Claude vision simulated. Connect a real API key to analyze images.", mode: "sandbox-simulation" };
    }

    const imageBlock = imageUrl
      ? { type: "image", source: { type: "url", url: imageUrl } }
      : { type: "image", source: { type: "base64", media_type: input.media_type || "image/jpeg", data: imageBase64 } };

    const json = await readJson(await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: [imageBlock, { type: "text", text: prompt }] }]
      })
    }), "Anthropic vision request failed");

    return {
      success: true,
      model: json.model || model,
      reply: textFromContent(json.content),
      usage: json.usage || null,
      mode: "authenticated"
    };
  }

  throw new Error(`Unsupported Anthropic feature key: ${featureKey}`);
}

module.exports = { runAnthropicTool };
