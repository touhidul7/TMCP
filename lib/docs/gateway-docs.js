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
