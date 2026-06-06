import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
const { encryptText } = require("@/lib/crypto/encrypt");

const AddAccountSchema = z.object({
  toolId: z.string().min(1, "Tool ID is required"),
  label: z.string().min(1, "Account label is required"),
  accountEmail: z.string().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    clientSecret: z.string().optional(),
    email: z.string().optional()
  })
});

const TOOL_META = {
  gmail:    { name: "Gmail",           provider: "Google",      category: "Communication", desc: "Read, search, draft, and send emails securely.",        url: "https://mail.google.com" },
  drive:    { name: "Google Drive",    provider: "Google",      category: "Storage",       desc: "Search files, read documents, upload, and manage files.", url: "https://drive.google.com" },
  sheets:   { name: "Google Sheets",   provider: "Google",      category: "Productivity",  desc: "Read, write, and update spreadsheets.",                 url: "https://sheets.google.com" },
  calendar: { name: "Google Calendar", provider: "Google",      category: "Productivity",  desc: "Schedule, list, and manage calendar events.",           url: "https://calendar.google.com" },
  hunter:   { name: "Hunter",          provider: "Hunter.io",   category: "Enrichment",    desc: "Find and verify professional email addresses.",        url: "https://hunter.io" },
  consulti: { name: "Consulti",        provider: "Consulti Inc", category: "Enrichment",    desc: "Search and enrich company data.",                       url: "https://consulti.com" }
};

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
  hunter: [
    { feature_key: "hunter.find_email",    name: "Find Email",     description: "Get email address by name and domain", is_dangerous: false, requires_approval: false },
    { feature_key: "hunter.verify_email",  name: "Verify Email",   description: "Verify deliverability of an email",   is_dangerous: false, requires_approval: false },
    { feature_key: "hunter.domain_search", name: "Domain Search",   description: "List email addresses in a domain",     is_dangerous: false, requires_approval: false },
  ],
  consulti: [
    { feature_key: "consulti.search_company", name: "Search Company", description: "Search directories for company records",          is_dangerous: false, requires_approval: false },
    { feature_key: "consulti.enrich_company", name: "Enrich Company", description: "Fetch details, size, and tech stack of a company", is_dangerous: false, requires_approval: false }
  ]
};

async function getOrCreateBuiltinTool(workspaceId, slug) {
  const meta = TOOL_META[slug];
  if (!meta) return null;

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
        name: meta.name,
        slug,
        provider: meta.provider,
        category: meta.category,
        description: meta.desc,
        tool_type: "built_in",
        official_website_url: meta.url,
        icon_source: "favicon",
        is_enabled: true
      })
      .select("id")
      .single();

    if (error) throw error;
    tool = newTool;

    // Seed default features per tool
    const features = (featureMap[slug] || []).map(f => ({ ...f, tool_id: tool.id }));
    if (features.length > 0) {
      await supabaseAdmin.from("tool_features").insert(features);
    }
  }

  return tool.id;
}

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "tools.connect_account");

    const body = await request.json();
    const parsed = AddAccountSchema.parse(body);

    let targetToolId = parsed.toolId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetToolId);

    if (!isUuid) {
      const toolSlug = targetToolId.replace(/^tool-/, "");
      const createdId = await getOrCreateBuiltinTool(userContext.workspace_id, toolSlug);
      if (!createdId) {
        throw new Error(`Built-in tool with slug '${toolSlug}' is not recognized`);
      }
      targetToolId = createdId;
    }

    // Get tool to determine auth type
    const { data: tool, error: toolError } = await supabaseAdmin
      .from("tools")
      .select("tool_type, slug")
      .eq("id", targetToolId)
      .single();

    if (toolError || !tool) {
      throw new Error("Associated tool not found");
    }

    const authType = parsed.credentials.apiKey ? "api_key" : "oauth";

    // Insert into tool_accounts
    const { data: account, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        tool_id: targetToolId,
        label: parsed.label,
        account_email: parsed.accountEmail || parsed.credentials.email || "api-connected@gateway.local",
        status: "connected",
        auth_type: authType
      })
      .select()
      .single();

    if (accError) throw accError;

    // Encrypt credentials
    const encryptedApiKey = parsed.credentials.apiKey ? encryptText(parsed.credentials.apiKey) : null;
    const encryptedAccessToken = parsed.credentials.accessToken ? encryptText(parsed.credentials.accessToken) : null;
    const encryptedRefreshToken = parsed.credentials.refreshToken ? encryptText(parsed.credentials.refreshToken) : null;
    const encryptedClientSecret = parsed.credentials.clientSecret ? encryptText(parsed.credentials.clientSecret) : null;

    // Insert into tool_account_credentials
    const { error: credsError } = await supabaseAdmin
      .from("tool_account_credentials")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        tool_account_id: account.id,
        encrypted_api_key: encryptedApiKey,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        encrypted_client_secret: encryptedClientSecret
      });

    if (credsError) throw credsError;

    // Generate permission records for all active agents in this workspace
    const { data: agents } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("workspace_id", userContext.workspace_id)
      .eq("status", "active");

    const { data: features } = await supabaseAdmin
      .from("tool_features")
      .select("feature_key, is_dangerous")
      .eq("tool_id", targetToolId);

    if (agents && features && agents.length > 0 && features.length > 0) {
      const permsToInsert = [];
      agents.forEach((agent) => {
        features.forEach((feat) => {
          permsToInsert.push({
            workspace_id: userContext.workspace_id,
            user_id: userContext.id,
            agent_id: agent.id,
            tool_id: targetToolId,
            tool_account_id: account.id,
            feature_key: feat.feature_key,
            allowed: feat.is_dangerous ? false : true, // disable dangerous by default
            daily_limit: feat.is_dangerous ? 5 : 100,
            require_approval: feat.is_dangerous ? true : false
          });
        });
      });

      if (permsToInsert.length > 0) {
        await supabaseAdmin.from("agent_tool_permissions").insert(permsToInsert);
      }
    }

    return NextResponse.json({ success: true, account });

  } catch (err) {
    console.error("Error adding tool account:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add tool account" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
