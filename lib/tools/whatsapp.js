const { decryptText } = require("../crypto/decrypt");

const GRAPH = "https://graph.facebook.com/v21.0";

function getToken(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || fallbackMessage);
  }
  return json;
}

async function runWhatsappTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const token = getToken(credentialRecord);
  const hasRealKey = Boolean(token);
  const phoneNumberId = input.phone_number_id || connectionMetadata.phone_number_id;
  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  if (featureKey === "whatsapp.send_message") {
    const to = input.to || input.recipient;
    const body = input.body || input.message || input.text;
    if (!to) throw new Error("Missing 'to' recipient phone number for whatsapp.send_message");
    if (!body) throw new Error("Missing 'body' text for whatsapp.send_message");
    if (hasRealKey && !phoneNumberId) throw new Error("Missing phone_number_id (set on the connected account or in input)");

    if (!hasRealKey) {
      return { success: true, message_id: "wamid.sandbox", to, mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: Boolean(input.preview_url) } })
    }), "WhatsApp send message failed");
    return { success: true, message_id: json.messages?.[0]?.id || null, to, mode: "authenticated" };
  }

  if (featureKey === "whatsapp.send_template") {
    const to = input.to || input.recipient;
    const templateName = input.template || input.template_name;
    const languageCode = input.language || input.language_code || "en_US";
    if (!to) throw new Error("Missing 'to' recipient for whatsapp.send_template");
    if (!templateName) throw new Error("Missing 'template' name for whatsapp.send_template");
    if (hasRealKey && !phoneNumberId) throw new Error("Missing phone_number_id (set on the connected account or in input)");

    if (!hasRealKey) {
      return { success: true, message_id: "wamid.sandbox-template", to, template: templateName, mode: "sandbox-simulation" };
    }
    const template = {
      name: templateName,
      language: { code: languageCode },
      ...(input.components ? { components: input.components } : {})
    };
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template })
    }), "WhatsApp send template failed");
    return { success: true, message_id: json.messages?.[0]?.id || null, to, template: templateName, mode: "authenticated" };
  }

  if (featureKey === "whatsapp.list_templates") {
    const wabaId = input.waba_id || connectionMetadata.waba_id || connectionMetadata.business_account_id;
    if (hasRealKey && !wabaId) throw new Error("Missing waba_id (WhatsApp Business Account id) for whatsapp.list_templates");
    if (!hasRealKey) {
      return { success: true, templates: [{ name: "hello_world", status: "APPROVED", language: "en_US" }], mode: "sandbox-simulation" };
    }
    const limit = Math.min(Number(input.limit || 25), 100);
    const json = await readJson(await fetch(`${GRAPH}/${encodeURIComponent(wabaId)}/message_templates?limit=${limit}`, { headers }), "WhatsApp list templates failed");
    return { success: true, templates: json.data || [], mode: "authenticated" };
  }

  throw new Error(`Unsupported WhatsApp feature key: ${featureKey}`);
}

module.exports = { runWhatsappTool };
