const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.error?.type || json?.error || fallbackMessage);
  }
  return json;
}

// base_id may be provided per-request or stored on the connected account metadata.
function resolveBaseId(input, connectionMetadata) {
  return input.base_id || input.baseId || connectionMetadata?.base_id || connectionMetadata?.baseId || null;
}

function resolveTable(input) {
  return input.table || input.table_name || input.tableName || input.table_id;
}

async function runAirtableTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseId = resolveBaseId(input, connectionMetadata);
  const table = resolveTable(input);

  if (!baseId) throw new Error("Missing base_id for Airtable request");
  if (!table) throw new Error("Missing table for Airtable request");

  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "airtable.list_records") {
    if (!hasRealKey) {
      return { success: true, records: [{ id: "rec-sandbox", fields: { Name: "Sandbox" } }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("pageSize", String(Math.min(Number(input.page_size || input.limit || 20), 100)));
    if (input.view) params.set("view", input.view);
    if (input.filter_by_formula || input.filterByFormula) params.set("filterByFormula", input.filter_by_formula || input.filterByFormula);
    const json = await readJson(await fetch(`${baseUrl}?${params.toString()}`, { headers }), "Airtable list records failed");
    return { success: true, records: json.records || [], offset: json.offset || null, mode: "authenticated" };
  }

  if (featureKey === "airtable.create_record") {
    const fields = input.fields;
    if (!fields || typeof fields !== "object") throw new Error("Missing fields object for airtable.create_record");
    if (!hasRealKey) {
      return { success: true, record: { id: "rec-sandbox-new", fields }, mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields, ...(input.typecast ? { typecast: true } : {}) })
    }), "Airtable create record failed");
    return { success: true, record: json, mode: "authenticated" };
  }

  if (featureKey === "airtable.update_record") {
    const recordId = input.record_id || input.recordId || input.id;
    const fields = input.fields;
    if (!recordId) throw new Error("Missing record_id for airtable.update_record");
    if (!fields || typeof fields !== "object") throw new Error("Missing fields object for airtable.update_record");
    if (!hasRealKey) {
      return { success: true, record: { id: recordId, fields }, mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${baseUrl}/${encodeURIComponent(recordId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields, ...(input.typecast ? { typecast: true } : {}) })
    }), "Airtable update record failed");
    return { success: true, record: json, mode: "authenticated" };
  }

  throw new Error(`Unsupported Airtable feature key: ${featureKey}`);
}

module.exports = { runAirtableTool };
