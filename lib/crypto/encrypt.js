const crypto = require("crypto");

function encryptText(text) {
  if (!text) return null;
  if (!process.env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY is not defined in environment variables");
  }
  const key = Buffer.from(process.env.APP_ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return JSON.stringify({
    iv: iv.toString("hex"),
    encrypted,
    authTag,
  });
}

module.exports = { encryptText };
