const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) {
    throw new Error("Missing Serper API key on connected account");
  }
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJsonResponse(res, fallbackMessage) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.error || fallbackMessage);
  }

  return json;
}

async function runSerperTool({ featureKey, input = {}, credentialRecord }) {
  if (featureKey !== "serper.search") {
    throw new Error(`Unsupported Serper feature key: ${featureKey}`);
  }

  const apiKey = getApiKey(credentialRecord);
  const query = input.query || input.q;
  if (!query) {
    throw new Error("Missing query parameter for serper.search");
  }

  const payload = {
    q: query,
    ...(input.num || input.limit ? { num: Number(input.num || input.limit) } : {}),
    ...(input.page ? { page: Number(input.page) } : {}),
    ...(input.gl ? { gl: input.gl } : {}),
    ...(input.hl ? { hl: input.hl } : {}),
    ...(input.location ? { location: input.location } : {}),
    ...(input.type ? { type: input.type } : {})
  };

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return await readJsonResponse(res, "Serper search failed");
}

module.exports = { runSerperTool };
