const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail || json?.title || json?.error || fallbackMessage);
  }
  return json;
}

// Mailchimp keys end with "-usXX" where usXX is the data center; allow an explicit override from account metadata.
function resolveDataCenter(apiKey, connectionMetadata) {
  if (connectionMetadata?.data_center) return connectionMetadata.data_center;
  const suffix = apiKey && apiKey.includes("-") ? apiKey.split("-").pop() : null;
  return suffix || "us1";
}

function crypto() {
  return require("crypto");
}

async function runMailchimpTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const dc = resolveDataCenter(apiKey, connectionMetadata);
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "mailchimp.list_members") {
    const listId = input.list_id || input.audience_id || connectionMetadata.list_id;
    if (!listId) throw new Error("Missing list_id (audience id) for mailchimp.list_members");
    if (!hasRealKey) {
      return { success: true, members: [{ email_address: "subscriber@example.com", status: "subscribed" }], mode: "sandbox-simulation" };
    }
    const count = Math.min(Number(input.count || input.limit || 20), 1000);
    const json = await readJson(await fetch(`${base}/lists/${encodeURIComponent(listId)}/members?count=${count}`, { headers }), "Mailchimp list members failed");
    return { success: true, members: json.members || [], total: json.total_items || 0, mode: "authenticated" };
  }

  if (featureKey === "mailchimp.add_subscriber") {
    const listId = input.list_id || input.audience_id || connectionMetadata.list_id;
    const email = input.email || input.email_address;
    if (!listId) throw new Error("Missing list_id (audience id) for mailchimp.add_subscriber");
    if (!email) throw new Error("Missing email for mailchimp.add_subscriber");

    if (!hasRealKey) {
      return { success: true, member: { email_address: email, status: input.status || "subscribed" }, mode: "sandbox-simulation" };
    }
    // Mailchimp upsert uses the MD5 hash of the lowercased email as the subscriber id.
    const subscriberHash = crypto().createHash("md5").update(email.toLowerCase()).digest("hex");
    const payload = {
      email_address: email,
      status_if_new: input.status || "subscribed",
      status: input.status || "subscribed",
      ...(input.merge_fields ? { merge_fields: input.merge_fields } : {}),
      ...(input.tags ? { tags: input.tags } : {})
    };
    const json = await readJson(await fetch(`${base}/lists/${encodeURIComponent(listId)}/members/${subscriberHash}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    }), "Mailchimp add subscriber failed");
    return { success: true, member: { id: json.id, email_address: json.email_address, status: json.status }, mode: "authenticated" };
  }

  throw new Error(`Unsupported Mailchimp feature key: ${featureKey}`);
}

module.exports = { runMailchimpTool };
