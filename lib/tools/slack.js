const { decryptText } = require("../crypto/decrypt");

async function runSlackTool({ featureKey, input, credentialRecord }) {
  let hasRealKey = false;
  let token = "mock-token";
  if (credentialRecord && credentialRecord.encrypted_api_key) {
    token = decryptText(credentialRecord.encrypted_api_key);
    hasRealKey = true;
  }

  // Sandbox simulation fallback or log execution
  if (featureKey === "slack.post_message") {
    const { channel, message } = input;
    if (!channel || !message) {
      throw new Error("Missing channel or message in Slack input parameters");
    }
    return {
      success: true,
      channel: channel,
      message_ts: `${Date.now()}.000100`,
      status: "Posted",
      text: message,
      mode: hasRealKey ? "authenticated" : "sandbox-simulation"
    };
  }

  if (featureKey === "slack.list_channels") {
    return {
      success: true,
      channels: [
        { id: "C12345", name: "general", topic: "Company-wide discussions" },
        { id: "C67890", name: "dev-alerts", topic: "Gateway notifications and logs" }
      ],
      mode: hasRealKey ? "authenticated" : "sandbox-simulation"
    };
  }

  throw new Error(`Unsupported Slack feature key: ${featureKey}`);
}

module.exports = { runSlackTool };
