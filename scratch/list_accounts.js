const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fuhuaanavqlgplraruon.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: accounts, error } = await supabase
    .from("tool_accounts")
    .select("id, label, account_email, tool_id");

  if (error) {
    console.error("Error fetching accounts:", error);
    return;
  }

  console.log("Remaining Tool Accounts:", accounts);
}

check();
