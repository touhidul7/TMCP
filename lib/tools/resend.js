const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) {
    throw new Error("Missing Resend API key on connected account");
  }
  return decryptText(credentialRecord.encrypted_api_key);
}

async function runResendTool({ featureKey, input = {}, credentialRecord }) {
  if (featureKey !== "resend.send_email") {
    throw new Error(`Unsupported Resend feature key: ${featureKey}`);
  }

  const apiKey = getApiKey(credentialRecord);
  const from = input.from || input.from_email || input.fromEmail;
  const to = input.to || input.recipients;
  const subject = input.subject;
  const html = input.html || input.body_html || input.body || input.text;
  const text = input.text || input.body_text;

  if (!from || !to || !subject || (!html && !text)) {
    throw new Error("Missing from, to, subject, and html/text parameters for Resend email");
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {})
  };

  if (input.cc) payload.cc = Array.isArray(input.cc) ? input.cc : [input.cc];
  if (input.bcc) payload.bcc = Array.isArray(input.bcc) ? input.bcc : [input.bcc];
  if (input.reply_to || input.replyTo) payload.reply_to = input.reply_to || input.replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || "Resend email send failed");
  }

  return {
    success: true,
    id: json.id,
    to: payload.to,
    subject
  };
}

module.exports = { runResendTool };
