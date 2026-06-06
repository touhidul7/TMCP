const crypto = require("crypto");

function generateApiKey() {
  const raw = `mcp_live_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 16);

  return {
    raw,
    prefix,
  };
}

module.exports = { generateApiKey };
