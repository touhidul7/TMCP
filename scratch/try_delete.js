const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fuhuaanavqlgplraruon.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function tryDelete() {
  const toolAccountId = "e2bc7d31-ae9c-4bae-9607-116897993a43";
  console.log("Starting deletion simulation for account:", toolAccountId);

  try {
    // Verify the account exists
    const { data: account, error: accErr } = await supabase
      .from("tool_accounts")
      .select("id, user_id, workspace_id")
      .eq("id", toolAccountId)
      .single();

    if (accErr) {
      console.error("Fetch account error:", accErr);
      return;
    }
    console.log("Account found:", account);

    // 1. Delete credentials
    console.log("Deleting from tool_account_credentials...");
    const { error: credErr } = await supabase
      .from("tool_account_credentials")
      .delete()
      .eq("tool_account_id", toolAccountId);
    if (credErr) {
      console.error("Credentials delete error:", credErr);
      return;
    }

    // 2. Delete permissions
    console.log("Deleting from agent_tool_permissions...");
    const { error: permErr } = await supabase
      .from("agent_tool_permissions")
      .delete()
      .eq("tool_account_id", toolAccountId);
    if (permErr) {
      console.error("Permissions delete error:", permErr);
      return;
    }

    // 3. Delete account
    console.log("Deleting from tool_accounts...");
    const { error: delErr } = await supabase
      .from("tool_accounts")
      .delete()
      .eq("id", toolAccountId);

    if (delErr) {
      console.error("Account delete error:", delErr);
      return;
    }

    console.log("Simulation complete! Deletion was successful!");
  } catch (err) {
    console.error("Caught unexpected error:", err);
  }
}

tryDelete();
