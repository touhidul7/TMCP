const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fuhuaanavqlgplraruon.supabase.co";
// Using the service key from the open test-e2e.js file
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const accountId = "e2bc7d31-ae9c-4bae-9607-116897993a43";
  const { data: account, error } = await supabase
    .from("tool_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching account:", error);
    return;
  }

  console.log("Account Details:", account);
}

check();
