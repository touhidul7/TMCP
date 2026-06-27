export const GATEWAY_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/gateway/execute",
    name: "Execute Tool Action",
    description: "Runs one allowed tool feature through the selected connected account."
  },
  {
    method: "GET",
    path: "/api/gateway/tools",
    name: "List Available Tools",
    description: "Returns connected accounts and feature keys allowed for the calling agent."
  },
  {
    method: "GET",
    path: "/api/gateway/status",
    name: "Gateway Status",
    description: "Validates the API key and returns the active agent identity."
  },
  {
    method: "GET",
    path: "/api/gateway/docs",
    name: "Agent Documentation",
    description: "Returns endpoint reference, schemas, and live examples for the calling agent."
  }
];

const DEFAULT_INPUT = { query: "example search" };

export function getExampleInput(featureKey = "") {
  if (featureKey === "gmail.search") return { query: "from:client@example.com newer_than:7d" };
  if (featureKey === "gmail.read") return { id: "message-id" };
  if (featureKey === "gmail.create_draft" || featureKey === "gmail.send") {
    return { to: "client@example.com", subject: "Follow up", body: "Plain text message body" };
  }
  if (featureKey === "drive.search") return { query: "name contains 'report'" };
  if (featureKey === "drive.read" || featureKey === "drive.delete") return { file_id: "drive-file-id" };
  if (featureKey === "drive.upload") return { name: "notes.txt", content: "File content" };
  if (featureKey === "sheets.read") return { spreadsheet_id: "spreadsheet-id", range: "Sheet1!A1:Z" };
  if (featureKey === "sheets.write" || featureKey === "sheets.append") {
    return { spreadsheet_id: "spreadsheet-id", range: "Sheet1!A1", rows: [["Name", "Email"]] };
  }
  if (featureKey === "hunter.find_email") return { domain: "example.com", first_name: "Jane", last_name: "Doe" };
  if (featureKey === "hunter.verify_email") return { email: "jane@example.com" };
  if (featureKey === "hunter.domain_search") return { domain: "example.com", limit: 10 };
  if (featureKey === "consulti.search_company") return { query: "Acme" };
  if (featureKey === "consulti.enrich_company") return { domain: "example.com" };
  if (featureKey === "imap.read_emails") return { limit: 10 };
  if (featureKey === "imap.search_emails") return { query: "invoice" };
  if (featureKey === "imap.send_email") return { to: "client@example.com", subject: "Status", body: "Plain text body" };
  if (featureKey === "slack.post_message") return { channel: "#alerts", message: "Deployment complete" };
  if (featureKey === "slack.list_channels") return {};
  if (featureKey === "github.list_issues") return { owner: "owner", repo: "repo", state: "open" };
  if (featureKey === "github.create_issue") return { owner: "owner", repo: "repo", title: "Issue title", body: "Issue details" };
  if (featureKey === "github.create_repository") return { name: "new-repo", private: true, auto_init: true };
  if (featureKey === "ssh.exec_command") return { command: "uptime", working_dir: "/var/www" };
  if (featureKey === "ssh.list_directory") return { path: "/var/www" };
  if (featureKey === "ssh.upload_file") return { remote_path: "/tmp/tmcp.txt", content: "Hello from TMCP" };
  if (featureKey === "apify.run_actor") return { actor_id: "apify/website-content-crawler", input: { startUrls: [{ url: "https://example.com" }] } };
  if (featureKey === "resend.send_email") return { from: "ops@example.com", to: "client@example.com", subject: "Update", text: "Plain text body" };
  if (featureKey === "serper.search") return { query: "TMCP gateway", num: 5 };
  if (featureKey === "scrapedo.scrape") return { url: "https://example.com", render: true };
  // AI / LLM
  if (featureKey === "openrouter.chat" || featureKey === "openai.chat" || featureKey === "anthropic.chat") {
    return { model: "", messages: [{ role: "user", content: "Summarize TMCP in one sentence." }] };
  }
  if (featureKey === "openrouter.list_models") return {};
  if (featureKey === "openai.embeddings") return { input: "Text to embed", model: "text-embedding-3-small" };
  if (featureKey === "openai.image_gen") return { prompt: "A control plane dashboard, isometric", size: "1024x1024" };
  if (featureKey === "anthropic.vision") return { image_url: "https://example.com/image.jpg", prompt: "Describe this image." };
  // Notion
  if (featureKey === "notion.search") return { query: "Roadmap", page_size: 10 };
  if (featureKey === "notion.read_page") return { page_id: "notion-page-id" };
  if (featureKey === "notion.create_page") return { database_id: "notion-database-id", title: "New entry" };
  if (featureKey === "notion.query_database") return { database_id: "notion-database-id", page_size: 25 };
  // Airtable
  if (featureKey === "airtable.list_records") return { base_id: "appXXXXXXXX", table: "Leads", page_size: 20 };
  if (featureKey === "airtable.create_record") return { base_id: "appXXXXXXXX", table: "Leads", fields: { Name: "Jane Doe", Email: "jane@example.com" } };
  if (featureKey === "airtable.update_record") return { base_id: "appXXXXXXXX", table: "Leads", record_id: "recXXXXXXXX", fields: { Status: "Contacted" } };
  // HubSpot
  if (featureKey === "hubspot.list_contacts") return { limit: 20, properties: ["email", "firstname", "lastname"] };
  if (featureKey === "hubspot.create_contact") return { email: "lead@example.com", firstname: "Jane", lastname: "Doe" };
  if (featureKey === "hubspot.list_deals") return { limit: 20 };
  if (featureKey === "hubspot.create_note") return { body: "Followed up via email", contact_id: "123456" };
  // Stripe
  if (featureKey === "stripe.list_customers") return { limit: 10 };
  if (featureKey === "stripe.list_invoices") return { limit: 10, status: "open" };
  if (featureKey === "stripe.create_charge") return { amount: 1999, currency: "usd", customer: "cus_xxx", description: "Order #1001" };
  if (featureKey === "stripe.create_refund") return { charge: "ch_xxx" };
  // Linear
  if (featureKey === "linear.list_issues") return { limit: 25, state: "Todo" };
  if (featureKey === "linear.create_issue") return { team_id: "team-uuid", title: "Investigate gateway latency", description: "Spikes on execute endpoint" };
  if (featureKey === "linear.update_issue") return { issue_id: "issue-uuid", state_id: "state-uuid" };
  // Twilio
  if (featureKey === "twilio.send_sms") return { to: "+15555550123", from: "+15555550100", body: "Your order has shipped." };
  if (featureKey === "twilio.make_call") return { to: "+15555550123", from: "+15555550100", url: "https://example.com/twiml.xml" };
  if (featureKey === "twilio.list_numbers") return { limit: 20 };
  // Mailchimp
  if (featureKey === "mailchimp.list_members") return { list_id: "audience-id", count: 20 };
  if (featureKey === "mailchimp.add_subscriber") return { list_id: "audience-id", email: "subscriber@example.com", status: "subscribed" };
  // Asana
  if (featureKey === "asana.list_tasks") return { project: "project-gid", limit: 25 };
  if (featureKey === "asana.create_task") return { name: "Follow up with client", project: "project-gid", notes: "Send proposal" };
  if (featureKey === "asana.update_task") return { task_id: "task-gid", completed: true };
  // PostgreSQL
  if (featureKey === "postgresql.query") return { sql: "SELECT id, email FROM users LIMIT 10" };
  if (featureKey === "postgresql.execute") return { sql: "UPDATE users SET active = true WHERE id = $1", params: [42] };
  if (featureKey === "postgresql.list_tables") return { schema: "public" };
  // WhatsApp
  if (featureKey === "whatsapp.send_message") return { to: "15555550123", body: "Hi! Your appointment is confirmed." };
  if (featureKey === "whatsapp.send_template") return { to: "15555550123", template: "appointment_reminder", language: "en_US" };
  if (featureKey === "whatsapp.list_templates") return { limit: 25 };
  // Facebook
  if (featureKey === "facebook.publish_post") return { message: "We just shipped a new feature!", link: "https://example.com/blog" };
  if (featureKey === "facebook.list_posts") return { limit: 10 };
  if (featureKey === "facebook.page_insights") return { metric: "page_impressions,page_post_engagements", period: "day" };
  // Instagram
  if (featureKey === "instagram.publish_media") return { image_url: "https://example.com/photo.jpg", caption: "New drop ✨" };
  if (featureKey === "instagram.list_media") return { limit: 12 };
  return DEFAULT_INPUT;
}

export function buildExecutePayload({ toolSlug = "gmail", featureKey = "gmail.search", accountId = "" } = {}) {
  return {
    tool: toolSlug,
    action: featureKey,
    input: getExampleInput(featureKey),
    ...(accountId ? { account_id: accountId } : {})
  };
}

export function buildGatewaySnippets({ baseUrl = "https://your-domain.com", apiKey = "mcp_live_xxxxxxxxxxxx", toolSlug = "gmail", featureKey = "gmail.search", accountId = "" } = {}) {
  const payload = buildExecutePayload({ toolSlug, featureKey, accountId });
  const executeUrl = `${baseUrl}/api/gateway/execute`;
  const toolsUrl = `${baseUrl}/api/gateway/tools`;
  const docsUrl = `${baseUrl}/api/gateway/docs`;
  const json = JSON.stringify(payload, null, 2);

  return {
    curl: `curl -X POST "${executeUrl}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${json}'`,
    javascript: `const response = await fetch("${executeUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${json})
});

const data = await response.json();
if (!response.ok || !data.success) {
  throw new Error(data.error || "TMCP gateway request failed");
}
console.log(data.result);`,
    python: `import requests

response = requests.post(
    "${executeUrl}",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json",
    },
    json=${json.replace(/\n/g, "\n    ")}
)

data = response.json()
if not response.ok or not data.get("success"):
    raise RuntimeError(data.get("error", "TMCP gateway request failed"))
print(data["result"])`,
    listToolsCurl: `curl -X GET "${toolsUrl}" \\
  -H "Authorization: Bearer ${apiKey}"`,
    docsCurl: `curl -X GET "${docsUrl}" \\
  -H "Authorization: Bearer ${apiKey}"`
  };
}

export function buildGetSnippets({ baseUrl = "https://your-domain.com", apiKey = "mcp_live_xxxxxxxxxxxx", path = "/api/gateway/tools" } = {}) {
  const url = `${baseUrl}${path}`;
  return {
    curl: `curl -X GET "${url}" \\
  -H "Authorization: Bearer ${apiKey}"`,
    javascript: `const response = await fetch("${url}", {
  headers: { "Authorization": "Bearer ${apiKey}" }
});

const data = await response.json();
if (!response.ok || !data.success) {
  throw new Error(data.error || "TMCP gateway request failed");
}
console.log(data);`,
    python: `import requests

response = requests.get(
    "${url}",
    headers={"Authorization": "Bearer ${apiKey}"},
)

data = response.json()
if not response.ok or not data.get("success"):
    raise RuntimeError(data.get("error", "TMCP gateway request failed"))
print(data)`
  };
}

// Each rotate tool has its own dedicated OpenAI-compatible base path, so an external
// app can be pointed at one specific provider pool. /api/v1 also works and auto-routes
// by model name (gemini* -> Gemini, otherwise OpenRouter).
export const ROTATE_BASE_PATHS = {
  gemini: "/api/gemini/v1",
  openrouter: "/api/openrouter/v1",
  auto: "/api/v1"
};

// Scrape.do is a query-param proxy API, not OpenAI-compatible, so it has its own dedicated path.
export const SCRAPEDO_ROTATE_BASE_PATH = "/api/scrapedo";

export const ROTATE_ENDPOINTS = [
  { method: "POST", path: "/chat/completions", description: "OpenAI-compatible chat completions (supports stream: true), rotated across your key pool." },
  { method: "POST", path: "/responses", description: "OpenAI-compatible Responses API passthrough with key rotation." },
  { method: "POST", path: "/embeddings", description: "OpenAI-compatible embeddings, rotated across your provider key pool." },
  { method: "GET", path: "/models", description: "List the model ids the provider accepts (OpenAI /v1/models)." }
];

// Examples for the OpenAI-compatible rotation endpoints. `basePath` selects which pool
// (e.g. /api/gemini/v1 or /api/openrouter/v1).
export function buildRotateSnippets({ baseUrl = "https://your-domain.com", apiKey = "mcp_live_xxxxxxxxxxxx", model = "gemini-2.5-flash", basePath = "/api/v1" } = {}) {
  const url = `${baseUrl}${basePath}/chat/completions`;
  const payload = { model, messages: [{ role: "user", content: "Hello" }] };
  const json = JSON.stringify(payload, null, 2);
  return {
    curl: `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${json}'`,
    javascript: `// Works with the OpenAI SDK — just point baseURL at TMCP and use your TMCP key.
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${apiKey}",
  baseURL: "${baseUrl}${basePath}"
});

const completion = await client.chat.completions.create(${json});
console.log(completion.choices[0].message);`,
    python: `from openai import OpenAI

client = OpenAI(api_key="${apiKey}", base_url="${baseUrl}${basePath}")

completion = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(completion.choices[0].message)`
  };
}

// Examples for the Scrape.do-compatible rotation endpoint. The request is identical to a direct
// Scrape.do call, except the base URL is TMCP's and the token is a TMCP agent API key.
export function buildScrapeDoRotateSnippets({ baseUrl = "https://your-domain.com", apiKey = "mcp_live_xxxxxxxxxxxx", basePath = "/api/scrapedo", targetUrl = "https://httpbin.co/anything" } = {}) {
  const encoded = encodeURIComponent(targetUrl);
  const url = `${baseUrl}${basePath}?token=${apiKey}&url=${encoded}`;
  return {
    curl: `curl "${url}"`,
    javascript: `// Drop-in for https://api.scrape.do/ — same params, TMCP base URL + TMCP token.
const res = await fetch(
  "${baseUrl}${basePath}?" + new URLSearchParams({
    token: "${apiKey}",
    url: "${targetUrl}",
    // render: "true", super: "true", geoCode: "us", ... any Scrape.do param
  })
);
const html = await res.text();
console.log(html);`,
    python: `import requests

res = requests.get(
    "${baseUrl}${basePath}",
    params={
        "token": "${apiKey}",
        "url": "${targetUrl}",
        # "render": "true", "super": "true", "geoCode": "us", ... any Scrape.do param
    },
)
print(res.text)`
  };
}

export function getGatewaySchemas() {
  return {
    execute_request: {
      tool: "Tool slug, such as gmail, github, ssh, serper, or scrapedo.",
      action: "Feature key shown on the tool detail page or returned by /api/gateway/tools.",
      input: "Object containing parameters for that feature key.",
      account_id: "Optional connected account id. Required when multiple accounts exist for the same tool."
    },
    execute_success: {
      success: true,
      result: "Provider response or sandbox response from the tool runner.",
      latency_ms: "Total gateway execution time in milliseconds."
    },
    approval_response: {
      success: false,
      status: "pending",
      approval_id: "Approval request id.",
      message: "Returned when a feature requires manual approval."
    }
  };
}
