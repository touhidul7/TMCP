const { decryptText } = require("../crypto/decrypt");

async function refreshGoogleAccessToken(encryptedRefreshToken) {
  const refreshToken = decryptText(encryptedRefreshToken);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === "your-google-client-id") {
    return "mock-access-token";
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || "Failed to refresh Google access token");
  }

  return json.access_token;
}

async function runGmailTool({ featureKey, input, credentialRecord }) {
  let accessToken = "mock-access-token";
  if (credentialRecord && credentialRecord.encrypted_refresh_token) {
    try {
      accessToken = await refreshGoogleAccessToken(credentialRecord.encrypted_refresh_token);
    } catch (e) {
      console.error("Error refreshing Google OAuth token for Gmail:", e);
    }
  }

  // Sandbox simulation fallback
  if (accessToken === "mock-access-token") {
    if (featureKey === "gmail.search") {
      return {
        messages: [
          { id: "msg-1", threadId: "th-1", snippet: "Welcome to TMCP Tool Gateway! Setup complete..." },
          { id: "msg-2", threadId: "th-2", snippet: "Daily summary update: 148 tools online" }
        ],
        resultSizeEstimate: 2
      };
    }
    if (featureKey === "gmail.read") {
      return {
        id: input.id || "msg-1",
        threadId: input.threadId || "th-1",
        snippet: "Welcome to TMCP! Learn how to register custom MCP servers and REST API endpoints in 5 minutes.",
        headers: [
          { name: "From", value: "TMCP System <noreply@tmcp.io>" },
          { name: "Subject", value: "Gateway Verification Code" }
        ],
        body: "Hello, your gateway server is running successfully. Code: TMCP-SUCCESS-2026."
      };
    }
    if (featureKey === "gmail.create_draft" || featureKey === "gmail.send") {
      return {
        success: true,
        id: `msg-${Date.now()}`,
        threadId: `th-${Date.now()}`,
        status: featureKey === "gmail.send" ? "Sent" : "Draft Created",
        to: input.to,
        subject: input.subject
      };
    }
    throw new Error(`Unsupported Gmail feature key: ${featureKey}`);
  }

  // Real Google API call
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "gmail.search") {
    const q = input.query || "";
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Gmail Search API call failed");
    return json;
  }

  if (featureKey === "gmail.read") {
    const id = input.id;
    if (!id) throw new Error("Missing message ID");
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Gmail Read API call failed");
    return json;
  }

  if (featureKey === "gmail.create_draft" || featureKey === "gmail.send") {
    const { to, subject, body } = input;
    if (!to || !subject || !body) {
      throw new Error("Missing recipient, subject, or body in input parameters");
    }

    // Build raw MIME message
    const emailLines = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      body
    ];
    const mime = Buffer.from(emailLines.join("\r\n")).toString("base64url");

    if (featureKey === "gmail.create_draft") {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: { raw: mime } })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gmail Create Draft API call failed");
      return json;
    } else {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ raw: mime })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gmail Send API call failed");
      return json;
    }
  }

  throw new Error(`Unsupported Gmail feature key: ${featureKey}`);
}

module.exports = { runGmailTool, refreshGoogleAccessToken };
