const { decryptText } = require("../crypto/decrypt");

// Twilio stores the Account SID in encrypted_api_key and the Auth Token in encrypted_access_token.
function getCredentials(credentialRecord) {
  const sid = credentialRecord?.encrypted_api_key ? decryptText(credentialRecord.encrypted_api_key) : null;
  const authToken = credentialRecord?.encrypted_access_token ? decryptText(credentialRecord.encrypted_access_token) : null;
  return { sid, authToken };
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error?.message || json?.error || fallbackMessage);
  }
  return json;
}

function basicAuth(sid, authToken) {
  return "Basic " + Buffer.from(`${sid}:${authToken}`).toString("base64");
}

function formBody(obj) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, String(v));
  });
  return params;
}

async function runTwilioTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const { sid, authToken } = getCredentials(credentialRecord);
  const hasRealKey = Boolean(sid && authToken);
  const base = `https://api.twilio.com/2010-04-01/Accounts/${sid}`;
  const headers = hasRealKey ? { "Authorization": basicAuth(sid, authToken), "Content-Type": "application/x-www-form-urlencoded" } : {};

  if (featureKey === "twilio.send_sms") {
    const to = input.to || input.To;
    const body = input.body || input.message || input.Body;
    const from = input.from || input.From || connectionMetadata.from_number || connectionMetadata.phone_number;
    if (!to) throw new Error("Missing 'to' phone number for twilio.send_sms");
    if (!body) throw new Error("Missing 'body' message for twilio.send_sms");
    if (!from && !input.messaging_service_sid) throw new Error("Missing 'from' number or messaging_service_sid for twilio.send_sms");

    if (!hasRealKey) {
      return { success: true, sid: "SM-sandbox", to, from: from || null, status: "queued", mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${base}/Messages.json`, {
      method: "POST",
      headers,
      body: formBody({ To: to, Body: body, ...(from ? { From: from } : { MessagingServiceSid: input.messaging_service_sid }) })
    }), "Twilio send SMS failed");
    return { success: true, sid: json.sid, to: json.to, from: json.from, status: json.status, mode: "authenticated" };
  }

  if (featureKey === "twilio.make_call") {
    const to = input.to || input.To;
    const from = input.from || input.From || connectionMetadata.from_number;
    const url = input.url || input.Url;
    const twiml = input.twiml || input.Twiml;
    if (!to || !from) throw new Error("Missing 'to' or 'from' for twilio.make_call");
    if (!url && !twiml) throw new Error("Missing 'url' (TwiML URL) or 'twiml' for twilio.make_call");

    if (!hasRealKey) {
      return { success: true, sid: "CA-sandbox", to, from, status: "queued", mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${base}/Calls.json`, {
      method: "POST",
      headers,
      body: formBody({ To: to, From: from, ...(url ? { Url: url } : { Twiml: twiml }) })
    }), "Twilio make call failed");
    return { success: true, sid: json.sid, to: json.to, from: json.from, status: json.status, mode: "authenticated" };
  }

  if (featureKey === "twilio.list_numbers") {
    if (!hasRealKey) {
      return { success: true, numbers: [{ phone_number: "+15555550100", friendly_name: "Sandbox Number" }], mode: "sandbox-simulation" };
    }
    const json = await readJson(await fetch(`${base}/IncomingPhoneNumbers.json?PageSize=${Math.min(Number(input.limit || 20), 100)}`, {
      headers: { "Authorization": basicAuth(sid, authToken) }
    }), "Twilio list numbers failed");
    return {
      success: true,
      numbers: (json.incoming_phone_numbers || []).map((n) => ({ phone_number: n.phone_number, friendly_name: n.friendly_name, sid: n.sid })),
      mode: "authenticated"
    };
  }

  throw new Error(`Unsupported Twilio feature key: ${featureKey}`);
}

module.exports = { runTwilioTool };
