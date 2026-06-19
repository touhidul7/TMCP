const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || fallbackMessage);
  }
  return json;
}

async function runHubspotTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://api.hubapi.com";
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "hubspot.list_contacts") {
    if (!hasRealKey) {
      return { success: true, contacts: [{ id: "sandbox-1", properties: { email: "lead@example.com" } }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Number(input.limit || 20), 100)));
    if (input.after) params.set("after", input.after);
    if (input.properties) params.set("properties", Array.isArray(input.properties) ? input.properties.join(",") : input.properties);
    const json = await readJson(await fetch(`${baseUrl}/crm/v3/objects/contacts?${params.toString()}`, { headers }), "HubSpot list contacts failed");
    return { success: true, contacts: json.results || [], paging: json.paging || null, mode: "authenticated" };
  }

  if (featureKey === "hubspot.create_contact") {
    const properties = input.properties || (input.email ? { email: input.email, ...(input.firstname ? { firstname: input.firstname } : {}), ...(input.lastname ? { lastname: input.lastname } : {}) } : null);
    if (!properties) throw new Error("Missing properties (or email) for hubspot.create_contact");
    if (!hasRealKey) {
      return { success: true, contact: { id: "sandbox-new", properties }, mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ properties })
    }), "HubSpot create contact failed");
    return { success: true, contact: json, mode: "authenticated" };
  }

  if (featureKey === "hubspot.list_deals") {
    if (!hasRealKey) {
      return { success: true, deals: [{ id: "sandbox-deal", properties: { dealname: "Sandbox Deal" } }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Number(input.limit || 20), 100)));
    if (input.after) params.set("after", input.after);
    if (input.properties) params.set("properties", Array.isArray(input.properties) ? input.properties.join(",") : input.properties);
    const json = await readJson(await fetch(`${baseUrl}/crm/v3/objects/deals?${params.toString()}`, { headers }), "HubSpot list deals failed");
    return { success: true, deals: json.results || [], paging: json.paging || null, mode: "authenticated" };
  }

  if (featureKey === "hubspot.create_note") {
    const body = input.body || input.note || input.content;
    if (!body) throw new Error("Missing body for hubspot.create_note");
    if (!hasRealKey) {
      return { success: true, note: { id: "sandbox-note" }, mode: "sandbox-simulation" };
    }
    const payload = {
      properties: {
        hs_note_body: body,
        hs_timestamp: input.timestamp || new Date().toISOString()
      },
      ...(input.contact_id ? { associations: [{ to: { id: String(input.contact_id) }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }] } : {})
    };
    const json = await readJson(await fetch(`${baseUrl}/crm/v3/objects/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    }), "HubSpot create note failed");
    return { success: true, note: json, mode: "authenticated" };
  }

  throw new Error(`Unsupported HubSpot feature key: ${featureKey}`);
}

module.exports = { runHubspotTool };
