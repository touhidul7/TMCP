const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fuhuaanavqlgplraruon.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const accountId = "e2bc7d31-ae9c-4bae-9607-116897993a43";
  
  // 1. Fetch the tool account
  const { data: account } = await supabase
    .from("tool_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  console.log("Tool Account:", account);

  if (account) {
    // 2. Fetch the workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", account.workspace_id)
      .maybeSingle();

    console.log("Workspace:", workspace);

    // 3. Fetch workspace members
    const { data: members } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", account.workspace_id);

    console.log("Workspace Members:", members);
  }
}

check();
