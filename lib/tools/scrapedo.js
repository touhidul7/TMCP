const { decryptText } = require("../crypto/decrypt");

function getApiToken(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) {
    throw new Error("Missing Scrape.do API token on connected account");
  }
  return decryptText(credentialRecord.encrypted_api_key);
}

function addOptionalParam(params, input, names, outputName = names[0]) {
  for (const name of names) {
    if (input[name] !== undefined && input[name] !== null && input[name] !== "") {
      params.set(outputName, String(input[name]));
      return;
    }
  }
}

async function runScrapeDoTool({ featureKey, input = {}, credentialRecord }) {
  if (featureKey !== "scrapedo.scrape") {
    throw new Error(`Unsupported Scrape.do feature key: ${featureKey}`);
  }

  const token = getApiToken(credentialRecord);
  const targetUrl = input.url || input.target_url || input.targetUrl;
  if (!targetUrl) {
    throw new Error("Missing url parameter for scrapedo.scrape");
  }

  const params = new URLSearchParams();
  params.set("token", token);
  params.set("url", targetUrl);

  addOptionalParam(params, input, ["render", "js_render", "jsRender"], "render");
  addOptionalParam(params, input, ["super", "super_proxy", "superProxy"], "super");
  addOptionalParam(params, input, ["geoCode", "geo_code", "country"], "geoCode");
  addOptionalParam(params, input, ["waitUntil", "wait_until"], "waitUntil");
  addOptionalParam(params, input, ["timeout"], "timeout");
  addOptionalParam(params, input, ["customHeaders", "custom_headers"], "customHeaders");
  addOptionalParam(params, input, ["blockResources", "block_resources"], "blockResources");

  const apiUrl = `https://api.scrape.do/?${params.toString()}`;
  const res = await fetch(apiUrl, { method: "GET" });
  const contentType = res.headers?.get?.("content-type") || "";
  const content = await res.text();

  if (!res.ok) {
    throw new Error(content || `Scrape.do request failed with status ${res.status}`);
  }

  return {
    status: res.status,
    content_type: contentType,
    url: targetUrl,
    content
  };
}

module.exports = { runScrapeDoTool };
