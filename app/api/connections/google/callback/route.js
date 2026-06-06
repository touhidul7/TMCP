import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const { encryptText } = require("@/lib/crypto/encrypt");

// Tool metadata lookup
const TOOL_META = {
  gmail:    { name: "Gmail",           provider: "Google", category: "Communication", desc: "Read, search, draft, and send emails securely.",        url: "https://mail.google.com" },
  drive:    { name: "Google Drive",    provider: "Google", category: "Storage",       desc: "Search files, read documents, upload, and manage files.", url: "https://drive.google.com" },
  sheets:   { name: "Google Sheets",   provider: "Google", category: "Productivity",  desc: "Read, write, and update spreadsheets.",                 url: "https://sheets.google.com" },
  calendar: { name: "Google Calendar", provider: "Google", category: "Productivity",  desc: "Schedule, list, and manage calendar events.",           url: "https://calendar.google.com" },
};

async function getOrCreateBuiltinTool(workspaceId, slug, name, provider, category, desc, officialUrl) {
  let { data: tool } = await supabaseAdmin
    .from("tools")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (!tool) {
    const { data: newTool, error } = await supabaseAdmin
      .from("tools")
      .insert({
        workspace_id: workspaceId,
        name, slug, provider, category,
        description: desc,
        tool_type: "built_in",
        official_website_url: officialUrl,
        icon_source: "favicon",
        is_enabled: true
      })
      .select("id")
      .single();

    if (error) throw error;
    tool = newTool;

    // Seed default features per tool
    const featureMap = {
      gmail: [
        { feature_key: "gmail.search",       name: "Search Emails",  description: "Search user's mailbox",    is_dangerous: false, requires_approval: false },
        { feature_key: "gmail.read",          name: "Read Emails",    description: "Read message contents",    is_dangerous: false, requires_approval: false },
        { feature_key: "gmail.create_draft",  name: "Create Draft",   description: "Create email draft",       is_dangerous: true,  requires_approval: false },
        { feature_key: "gmail.send",          name: "Send Email",     description: "Send email directly",      is_dangerous: true,  requires_approval: true  },
      ],
      drive: [
        { feature_key: "drive.search",  name: "Search Files",       description: "Search files in Drive",   is_dangerous: false, requires_approval: false },
        { feature_key: "drive.read",    name: "Read File Content",  description: "Read file contents",       is_dangerous: false, requires_approval: false },
        { feature_key: "drive.upload",  name: "Upload File",        description: "Upload files to drive",    is_dangerous: true,  requires_approval: false },
        { feature_key: "drive.delete",  name: "Delete File",        description: "Delete file permanently",  is_dangerous: true,  requires_approval: true  },
      ],
      sheets: [
        { feature_key: "sheets.read",   name: "Read Sheet",   description: "Read spreadsheet data",       is_dangerous: false, requires_approval: false },
        { feature_key: "sheets.write",  name: "Write Sheet",  description: "Write data to spreadsheet",   is_dangerous: true,  requires_approval: false },
      ],
      calendar: [
        { feature_key: "calendar.list",    name: "List Events",   description: "List calendar events",    is_dangerous: false, requires_approval: false },
        { feature_key: "calendar.create",  name: "Create Event",  description: "Create a calendar event", is_dangerous: true,  requires_approval: false },
      ],
    };

    const features = (featureMap[slug] || []).map(f => ({ ...f, tool_id: tool.id }));
    if (features.length > 0) {
      await supabaseAdmin.from("tool_features").insert(features);
    }
  }

  return tool.id;
}

export async function GET(request) {
  // Use host header for redirects to avoid 0.0.0.0 issues
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=missing_code`);
  }

  // Parse JSON state: { workspace_id, tool }
  let workspaceId = null;
  let toolSlug = null;
  try {
    if (rawState) {
      const parsed = JSON.parse(rawState);
      workspaceId = parsed.workspace_id;
      toolSlug = parsed.tool;
    }
  } catch {
    // Legacy fallback: state was a plain workspace UUID
    workspaceId = rawState;
  }

  // Fallback: grab first workspace if none in state
  if (!workspaceId) {
    const { data: ws } = await supabaseAdmin.from("workspaces").select("id").limit(1).maybeSingle();
    workspaceId = ws?.id;
  }

  // Default to gmail if no tool specified
  if (!toolSlug || !TOOL_META[toolSlug]) {
    toolSlug = "gmail";
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  let email = "google-user@tmcp.io";
  let refreshToken = "mock-refresh-token";

  // Real OAuth token exchange
  if (clientId && clientId !== "your-google-client-id" && code !== "mock_google_code_12345") {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokens.error_description || tokens.error || "Failed to exchange authorization code");
      }

      refreshToken = tokens.refresh_token || "oauth-flow-no-refresh-token";

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const profile = await userRes.json();
      if (userRes.ok && profile.email) {
        email = profile.email;
      }
    } catch (err) {
      console.error("Google OAuth Exchange Error:", err);
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(err.message)}`);
    }
  }

  try {
    const meta = TOOL_META[toolSlug];

    // Ensure the tool record exists in DB
    const toolId = await getOrCreateBuiltinTool(
      workspaceId, toolSlug, meta.name, meta.provider, meta.category, meta.desc, meta.url
    );

    // Create the tool account for THIS specific tool only
    const { data: account, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .insert({
        workspace_id: workspaceId,
        tool_id: toolId,
        label: `${meta.name} (${email})`,
        account_email: email,
        status: "connected",
        auth_type: "oauth"
      })
      .select("id")
      .single();

    if (accError) throw accError;

    // Encrypt and save credentials
    await supabaseAdmin.from("tool_account_credentials").insert({
      workspace_id: workspaceId,
      tool_account_id: account.id,
      encrypted_refresh_token: encryptText(refreshToken)
    });

    // Seed agent permissions for all existing agents in the workspace
    const { data: agents } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (agents && agents.length > 0) {
      const { data: toolFeatures } = await supabaseAdmin
        .from("tool_features")
        .select("feature_key, is_dangerous")
        .eq("tool_id", toolId);

      const perms = [];
      agents.forEach((agent) => {
        toolFeatures?.forEach((f) => {
          perms.push({
            workspace_id: workspaceId,
            agent_id: agent.id,
            tool_id: toolId,
            tool_account_id: account.id,
            feature_key: f.feature_key,
            allowed: !f.is_dangerous,
            daily_limit: f.is_dangerous ? 5 : 50,
            require_approval: !!f.is_dangerous
          });
        });
      });

      if (perms.length > 0) {
        await supabaseAdmin.from("agent_tool_permissions").insert(perms);
      }
    }

    return NextResponse.redirect(`${baseUrl}/dashboard/connections?success=${toolSlug}_connected`);

  } catch (err) {
    console.error("Error saving Google connection:", err);
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(err.message)}`);
  }
}
