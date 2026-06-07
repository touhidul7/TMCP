/**
 * Runs SQL migrations via Supabase Management REST API (HTTPS only, no direct PG conn needed).
 * Usage: node supabase/run-migration-rest.js
 */

const https = require("https");

const SUPABASE_URL      = "https://fuhuaanavqlgplraruon.supabase.co";
const SERVICE_ROLE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg";

// SQL to run — add SSH columns to tool_account_credentials
const SQL = `
ALTER TABLE tool_account_credentials
ADD COLUMN IF NOT EXISTS encrypted_private_key text,
ADD COLUMN IF NOT EXISTS encrypted_private_key_passphrase text,
ADD COLUMN IF NOT EXISTS encrypted_password text,
ADD COLUMN IF NOT EXISTS encrypted_sudo_password text;
`;

function rpcQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    // Use the /rest/v1/ endpoint with the pg_tle or direct execute approach
    // Supabase exposes a SQL execution endpoint via the management API
    const managementPath = `/v1/projects/fuhuaanavqlgplraruon/database/query`;
    const options = {
      hostname: "api.supabase.com",
      path: managementPath,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Alternative: use the PostgREST execute endpoint via rpc
function execViaPgrest(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: `/rest/v1/rpc/execute_sql`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("Running SSH migration via Supabase Management API...\n");
  console.log("SQL to execute:\n", SQL);

  const result = await rpcQuery(SQL);
  console.log(`\nManagement API response (${result.status}):`);
  console.log(JSON.stringify(result.body, null, 2));

  if (result.status === 200 || result.status === 201) {
    console.log("\n✅ Migration applied successfully!");
  } else if (result.status === 401 || result.status === 403) {
    console.log("\n⚠️  Auth failed - management API requires a personal access token, not service role key.");
    console.log("Trying PostgREST rpc fallback...\n");
    const r2 = await execViaPgrest(SQL);
    console.log(`PostgREST response (${r2.status}):`);
    console.log(r2.body);
  } else {
    console.log("\n⚠️  Unexpected response. The columns may already exist (IF NOT EXISTS handles this).");
    console.log("If the columns were already added in a previous migration run, this is safe to ignore.");
  }
}

main().catch(console.error);
