const { decryptText } = require("../crypto/decrypt");

async function runConsultiTool({ featureKey, input, credentialRecord }) {
  let apiKey = "mock-key";
  if (credentialRecord && credentialRecord.encrypted_api_key) {
    try {
      apiKey = decryptText(credentialRecord.encrypted_api_key);
    } catch (e) {
      console.error("Error decrypting Consulti API key:", e);
    }
  }

  const apiBase = process.env.CONSULTI_API_BASE || "https://api.consulti.com/v1";

  // Mock response fallback for sandbox/testing
  if (apiKey === "mock-key" || apiKey === "your-consulti-key") {
    if (featureKey === "consulti.search_company") {
      return {
        results: [
          { id: "comp-1", name: input.query, domain: `${input.query.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`, industry: "Technology", size: "100-500 employees" }
        ]
      };
    }
    if (featureKey === "consulti.enrich_company") {
      return {
        company_id: input.company_id || "comp-123",
        name: "Acme Corp",
        domain: input.domain || "acme.com",
        industry: "Software & Technology",
        employees_range: "500-1000",
        founded: 2018,
        headquarters: { city: "San Francisco", state: "CA", country: "USA" },
        tech_stack: ["Next.js", "Tailwind CSS", "Supabase", "Node.js", "PostgreSQL"],
        estimated_annual_revenue: "$15M"
      };
    }
    throw new Error(`Unsupported Consulti feature key: ${featureKey}`);
  }

  // Real Consulti API call
  let url = "";
  let method = "GET";
  let body = null;

  if (featureKey === "consulti.search_company") {
    url = `${apiBase}/companies/search?q=${encodeURIComponent(input.query)}`;
  } else if (featureKey === "consulti.enrich_company") {
    url = `${apiBase}/companies/enrich`;
    method = "POST";
    body = JSON.stringify(input);
  } else {
    throw new Error(`Unsupported Consulti feature key: ${featureKey}`);
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || `Consulti API request failed: ${response.statusText}`);
  }

  return json;
}

module.exports = { runConsultiTool };
