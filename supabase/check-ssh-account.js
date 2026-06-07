/**
 * Check SSH tool account connection_metadata in Supabase.
 * Run with: node supabase/check-ssh-account.js
 */
const fs = require("fs");
const path = require("path");

// Manually load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  });
}

const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking SSH tool accounts...\n");

  const { data: accounts, error } = await supabaseAdmin
    .from("tool_accounts")
    .select(`
      id, label, account_email, status, auth_type, connection_metadata,
      tools ( name, slug )
    `)
    .eq("status", "connected");

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  const sshAccounts = accounts.filter(a => a.tools?.slug === "ssh");

  if (sshAccounts.length === 0) {
    console.log("No SSH accounts found.");
    return;
  }

  for (const acc of sshAccounts) {
    console.log("=".repeat(60));
    console.log(`ID:               ${acc.id}`);
    console.log(`Label:            ${acc.label}`);
    console.log(`Account Email:    ${acc.account_email}`);
    console.log(`Status:           ${acc.status}`);
    console.log(`Auth Type:        ${acc.auth_type}`);
    console.log(`Connection Meta:  ${JSON.stringify(acc.connection_metadata, null, 2)}`);

    // Also check the credentials row
    const { data: creds } = await supabaseAdmin
      .from("tool_account_credentials")
      .select("encrypted_api_key, encrypted_password, encrypted_private_key, encrypted_private_key_passphrase, encrypted_sudo_password")
      .eq("tool_account_id", acc.id)
      .maybeSingle();

    if (creds) {
      console.log("\nCredential columns present:");
      console.log(`  encrypted_api_key:                 ${creds.encrypted_api_key ? "✅ SET" : "❌ null"}`);
      console.log(`  encrypted_password:                ${creds.encrypted_password ? "✅ SET" : "❌ null"}`);
      console.log(`  encrypted_private_key:             ${creds.encrypted_private_key ? "✅ SET" : "❌ null"}`);
      console.log(`  encrypted_private_key_passphrase:  ${creds.encrypted_private_key_passphrase ? "✅ SET" : "❌ null"}`);
      console.log(`  encrypted_sudo_password:           ${creds.encrypted_sudo_password ? "✅ SET" : "❌ null"}`);
    } else {
      console.log("\n⚠️  No credentials row found for this account.");
    }
    console.log();
  }
}

main().catch(console.error);
