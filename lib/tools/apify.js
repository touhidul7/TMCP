const { decryptText } = require("../crypto/decrypt");

function getApiToken(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) {
    throw new Error("Missing Apify API token on connected account");
  }
  return decryptText(credentialRecord.encrypted_api_key);
}

function normalizeActorId(input) {
  const actorId = input.actor_id || input.actorId || input.actor || input.act_id;
  if (!actorId) {
    throw new Error("Missing actor_id parameter for apify.run_actor");
  }
  return actorId.replace(/^apify\//, "apify~");
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
    throw new Error(json?.error?.message || json?.message || fallbackMessage);
  }
  return json;
}

async function runApifyTool({ featureKey, input = {}, credentialRecord }) {
  if (featureKey !== "apify.run_actor") {
    throw new Error(`Unsupported Apify feature key: ${featureKey}`);
  }

  const token = getApiToken(credentialRecord);
  const actorId = normalizeActorId(input);
  const actorInput = input.input || input.actor_input || input.run_input || {};
  const timeoutSecs = Number(input.timeout_secs || input.timeoutSecs || 120);
  const memoryMbytes = input.memory_mbytes || input.memoryMbytes;
  const build = input.build;

  const params = new URLSearchParams();
  params.set("timeout", String(Math.max(1, Math.min(timeoutSecs, 300))));
  if (memoryMbytes) params.set("memory", String(memoryMbytes));
  if (build) params.set("build", String(build));

  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?${params.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(actorInput)
  });

  const items = await readJsonResponse(res, "Apify actor run failed");
  const limit = Number(input.result_limit || input.resultLimit || 1000);
  const normalizedItems = Array.isArray(items) ? items.slice(0, limit) : items;

  return {
    actor_id: actorId,
    item_count: Array.isArray(items) ? items.length : null,
    returned_count: Array.isArray(normalizedItems) ? normalizedItems.length : null,
    items: normalizedItems
  };
}

module.exports = { runApifyTool };
