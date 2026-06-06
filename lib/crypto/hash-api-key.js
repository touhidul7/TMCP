const crypto = require("crypto");

function hashApiKey(apiKey) {
  if (!apiKey) return "";
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

module.exports = { hashApiKey };
