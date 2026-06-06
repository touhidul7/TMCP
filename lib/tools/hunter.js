const { decryptText } = require("../crypto/decrypt");

async function runHunterTool({ featureKey, input, credentialRecord }) {
  // Extract API key from the credentials
  let apiKey = "mock-key";
  if (credentialRecord && credentialRecord.encrypted_api_key) {
    try {
      apiKey = decryptText(credentialRecord.encrypted_api_key);
    } catch (e) {
      console.error("Error decrypting Hunter API key:", e);
    }
  }

  const apiBase = process.env.HUNTER_API_BASE || "https://api.hunter.io/v2";

  // Mock response fallback for sandbox/testing
  if (apiKey === "mock-key" || apiKey === "your-hunter-key") {
    if (featureKey === "hunter.find_email") {
      return {
        email: `${(input.first_name || "john").toLowerCase()}.${(input.last_name || "doe").toLowerCase()}@${input.domain || "example.com"}`,
        score: 85,
        verification: { status: "deliverable" }
      };
    }
    if (featureKey === "hunter.verify_email") {
      return {
        email: input.email,
        status: "deliverable",
        score: 92,
        regexp: true,
        gibberish: false,
        disposable: false,
        webmail: false,
        mx_records: true,
        smtp_server: true,
        smtp_check: true,
        accept_all: false,
        block: false
      };
    }
    if (featureKey === "hunter.domain_search") {
      return {
        domain: input.domain,
        disposable: false,
        webmail: false,
        pattern: "{first}.{last}",
        organization: "Example Org",
        emails: [
          { email: `admin@${input.domain}`, first_name: "Admin", last_name: "Root", type: "generic" },
          { email: `info@${input.domain}`, first_name: "Info", last_name: "Support", type: "generic" }
        ]
      };
    }
    throw new Error(`Unsupported Hunter feature key: ${featureKey}`);
  }

  // Real Hunter API call
  let url = "";
  if (featureKey === "hunter.find_email") {
    const { domain, first_name, last_name } = input;
    url = `${apiBase}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}&api_key=${apiKey}`;
  } else if (featureKey === "hunter.verify_email") {
    const { email } = input;
    url = `${apiBase}/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
  } else if (featureKey === "hunter.domain_search") {
    const { domain } = input;
    url = `${apiBase}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`;
  } else {
    throw new Error(`Unsupported Hunter feature key: ${featureKey}`);
  }

  const response = await fetch(url);
  const json = await response.json();
  
  if (!response.ok) {
    throw new Error(json.errors?.[0]?.details || json.message || `Hunter API request failed: ${response.statusText}`);
  }

  return json.data || json;
}

module.exports = { runHunterTool };
