const { decryptText } = require("../crypto/decrypt");

async function runCustomRestTool({ tool, featureKey, input, credentialRecord }) {
  const restConfig = tool.rest_config || {};
  let url = tool.rest_base_url || restConfig.url;
  const method = (restConfig.method || "POST").toUpperCase();

  if (!url) {
    throw new Error("Missing REST API URL configuration");
  }

  // Setup headers
  const headers = {
    "Content-Type": "application/json",
    ...(restConfig.headers || {})
  };

  // Add Auth credentials if connected
  if (credentialRecord) {
    if (credentialRecord.encrypted_api_key) {
      const apiKey = decryptText(credentialRecord.encrypted_api_key);
      const headerName = restConfig.auth?.header_name || "Authorization";
      const prefix = restConfig.auth?.type === "bearer_token" ? "Bearer " : "";
      headers[headerName] = `${prefix}${apiKey}`;
    } else if (credentialRecord.encrypted_access_token) {
      const accessToken = decryptText(credentialRecord.encrypted_access_token);
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  // Fallback / simulation check if dummy URL
  if (url.includes("example.com") || url.includes("gateway.local")) {
    return {
      status: "simulated_success",
      rest_tool: tool.name,
      endpoint: url,
      method,
      input,
      result: "Simulated response from custom REST API proxy"
    };
  }

  let options = {
    method,
    headers
  };

  if (method === "GET") {
    const params = new URLSearchParams(input);
    const qs = params.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  } else {
    options.body = JSON.stringify(input);
  }

  const response = await fetch(url, options);
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.message || `REST API call returned error status: ${response.status}`);
  }

  return json;
}

module.exports = { runCustomRestTool };
