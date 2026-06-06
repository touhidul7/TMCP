const { decryptText } = require("../crypto/decrypt");

async function runCustomRestTool({ tool, featureKey, input, credentialRecord }) {
  const restConfig = tool.rest_config || {};
  let url = tool.rest_base_url || restConfig.url;
  const method = (restConfig.method || "POST").toUpperCase();

  if (!url) {
    throw new Error("Missing REST API URL configuration");
  }

  // Start with static headers baked into the tool config (e.g. X-API-KEY for Serper)
  const headers = {
    "Content-Type": "application/json",
    ...(restConfig.headers || {}),
  };

  // Overlay with decrypted credentials from the connected account
  if (credentialRecord) {
    const authType = restConfig.auth?.type || "none";
    const headerName = restConfig.auth?.header_name || null;

    if (credentialRecord.encrypted_api_key) {
      const apiKey = decryptText(credentialRecord.encrypted_api_key);

      if (authType === "bearer") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (authType === "api_key" && headerName) {
        // Inject into the exact header name specified (e.g. "X-API-KEY" for Serper)
        headers[headerName] = apiKey;
      } else if (authType === "url_param" && headerName) {
        // Will be appended to URL as ?<headerName>=<apiKey> in the GET/POST block below
        url += (url.includes("?") ? "&" : "?") + encodeURIComponent(headerName) + "=" + encodeURIComponent(apiKey);
      } else if (authType !== "none") {
        // Fallback: inject as Authorization Bearer
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
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
    // Flatten object input into query string params
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(input || {})) {
      if (v !== undefined && v !== null) {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
    // Remove Content-Type for GET requests (no body)
    delete headers["Content-Type"];
  } else {
    options.body = JSON.stringify(input);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (fetchErr) {
    throw new Error(`Network error calling ${tool.name}: ${fetchErr.message}`);
  }

  const rawText = await response.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errDetail = json?.message || json?.error || rawText?.slice(0, 200) || `HTTP ${response.status}`;
    throw new Error(`${tool.name} API error (${response.status}): ${errDetail}`);
  }

  return json !== null ? json : { raw: rawText };
}

module.exports = { runCustomRestTool };
