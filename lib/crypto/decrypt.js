const crypto = require("crypto");

function decryptText(payload) {
  if (!payload) return null;
  if (!process.env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY is not defined in environment variables");
  }
  const key = Buffer.from(process.env.APP_ENCRYPTION_KEY, "hex");
  const parsed = JSON.parse(payload);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(parsed.authTag, "hex"));

  let decrypted = decipher.update(parsed.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { decryptText };
