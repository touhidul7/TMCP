const { decryptText } = require("../crypto/decrypt");

async function runCustomMcpTool({ tool, featureKey, input, credentialRecord }) {
  const mcpConfig = tool.mcp_config || {};
  const serverUrl = tool.mcp_server_url || mcpConfig.server_url;
  
  if (!serverUrl) {
    throw new Error("Missing MCP server URL configuration");
  }

  // Setup headers
  const headers = {
    "Content-Type": "application/json",
    ...(mcpConfig.headers || {})
  };

  // Add Auth credentials if connected
  if (credentialRecord) {
    if (credentialRecord.encrypted_api_key) {
      const apiKey = decryptText(credentialRecord.encrypted_api_key);
      const headerName = mcpConfig.auth?.header_name || "Authorization";
      const prefix = mcpConfig.auth?.type === "bearer_token" ? "Bearer " : "";
      headers[headerName] = `${prefix}${apiKey}`;
    } else if (credentialRecord.encrypted_access_token) {
      const accessToken = decryptText(credentialRecord.encrypted_access_token);
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  // MCP HTTP specification: POST /tools/call
  // Body: { name: "featureKey", arguments: input }
  const callUrl = serverUrl.endsWith("/tools/call") ? serverUrl : `${serverUrl.replace(/\/$/, "")}/tools/call`;

  // Fallback / simulation check if dummy URL
  if (serverUrl.includes("example.com") || serverUrl.includes("gateway.local")) {
    return {
      status: "simulated_success",
      mcp_server: tool.name,
      called_action: featureKey,
      arguments: input,
      result: "Simulated response from custom HTTP MCP proxy"
    };
  }

  const response = await fetch(callUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: featureKey,
      arguments: input
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error?.message || json.message || `MCP server returned error status: ${response.status}`);
  }

  return json;
}

module.exports = { runCustomMcpTool };
