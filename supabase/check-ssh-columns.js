/**
 * Check if SSH columns exist and verify migration status.
 * Uses @supabase/supabase-js (installed) with hardcoded env values.
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL     = "https://fuhuaanavqlgplraruon.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log("Checking SSH columns via Supabase JS client...\n");

  // Try a SELECT on tool_account_credentials with the new column names
  const { data, error } = await supabase
    .from("tool_account_credentials")
    .select("encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password")
    .limit(1);

  if (error) {
    const msg = error.message || "";
    if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("encrypted_private_key"))) {
      console.log("❌ SSH columns do NOT exist yet.\n");
      console.log("Please run this SQL in your Supabase SQL Editor:");
      console.log("→ https://supabase.com/dashboard/project/fuhuaanavqlgplraruon/sql/new\n");
      console.log("=== SQL TO RUN ===");
      console.log(`ALTER TABLE tool_account_credentials
ADD COLUMN IF NOT EXISTS encrypted_private_key text,
ADD COLUMN IF NOT EXISTS encrypted_private_key_passphrase text,
ADD COLUMN IF NOT EXISTS encrypted_password text,
ADD COLUMN IF NOT EXISTS encrypted_sudo_password text;`);
      console.log("=== END SQL ===");
    } else {
      console.log("Query error:", msg);
      console.log("Full error:", error);
    }
    return;
  }

  console.log("✅ SSH columns EXIST in tool_account_credentials!");
  console.log("   encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password");
  console.log("\n   Migration is complete. The SSH form is ready to use.");
  console.log(`   Sample row count: ${data?.length ?? 0}`);
}

main().catch(console.error);
