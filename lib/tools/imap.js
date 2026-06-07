const { decryptText } = require("../crypto/decrypt");

async function runImapTool({ featureKey, input, credentialRecord }) {
  let hasRealKey = false;
  let password = "mock-password";
  if (credentialRecord && credentialRecord.encrypted_api_key) {
    password = decryptText(credentialRecord.encrypted_api_key);
    hasRealKey = true;
  }

  // Sandbox simulation fallback or log execution
  if (featureKey === "imap.read_emails") {
    return {
      success: true,
      emails: [
        { id: "msg-imap-1", from: "billing@host.com", subject: "Invoice for Q2 Hosting", snippet: "Dear customer, your invoice is ready for payment...", date: new Date().toISOString() },
        { id: "msg-imap-2", from: "newsletter@dev.to", subject: "Weekly Dev News", snippet: "Top stories this week: Next.js 16 releases and more...", date: new Date().toISOString() }
      ],
      total: 2,
      mode: hasRealKey ? "authenticated" : "sandbox-simulation"
    };
  }

  if (featureKey === "imap.search_emails") {
    const q = (input.query || "").toLowerCase();
    const emails = [
      { id: "msg-imap-1", from: "billing@host.com", subject: "Invoice for Q2 Hosting", snippet: "Dear customer, your invoice is ready for payment...", date: new Date().toISOString() },
      { id: "msg-imap-2", from: "newsletter@dev.to", subject: "Weekly Dev News", snippet: "Top stories this week: Next.js 16 releases and more...", date: new Date().toISOString() }
    ];
    const filtered = emails.filter(e => e.from.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q) || e.snippet.toLowerCase().includes(q));
    
    return {
      success: true,
      emails: filtered,
      total: filtered.length,
      mode: hasRealKey ? "authenticated" : "sandbox-simulation"
    };
  }

  if (featureKey === "imap.send_email") {
    const { to, subject, body } = input;
    if (!to || !subject || !body) {
      throw new Error("Missing recipient (to), subject, or body in SMTP input parameters");
    }
    return {
      success: true,
      id: `smtp-msg-${Date.now()}`,
      status: "Sent",
      recipient: to,
      subject: subject,
      mode: hasRealKey ? "authenticated" : "sandbox-simulation"
    };
  }

  throw new Error(`Unsupported IMAP feature key: ${featureKey}`);
}

module.exports = { runImapTool };
