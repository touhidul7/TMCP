import { createSupabaseServerClient } from "../supabase/server";
import { supabaseAdmin } from "../supabase/admin";

export async function requireUser(request) {
  const supabase = await createSupabaseServerClient(request);
  
  // Resolve requested workspace from header or cookie (used in both auth paths)
  const requestedWorkspaceId = request.headers.get("x-workspace-id") || request.cookies?.get("tmcp_workspace_id")?.value;

  // Get token from Authorization header if present
  let authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return await getWorkspaceUserContext(user, requestedWorkspaceId);
    }
  }

  // Fallback to checking cookie-based session
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized: Invalid session or missing authorization header.");
  }

  return await getWorkspaceUserContext(user, requestedWorkspaceId);
}

async function getWorkspaceUserContext(user, requestedWorkspaceId) {
  const userId = user.id;

  // If a specific workspace was requested, check membership for that one first
  if (requestedWorkspaceId) {
    const { data: requestedMember, error: reqMemberError } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id, role, status")
      .eq("user_id", userId)
      .eq("workspace_id", requestedWorkspaceId)
      .single();

    if (!reqMemberError && requestedMember && requestedMember.status === "active") {
      return {
        id: userId,
        workspace_id: requestedMember.workspace_id,
        role: requestedMember.role,
      };
    }

    // Fallback: Check if they own the requested workspace directly (even if no active member row exists)
    const { data: requestedOwned } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", requestedWorkspaceId)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (requestedOwned) {
      return {
        id: userId,
        workspace_id: requestedOwned.id,
        role: "Owner",
      };
    }
  }

  // Fallback to finding ANY active membership
  const { data: member, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!memberError && member && member.status === "active") {
    return {
      id: userId,
      workspace_id: member.workspace_id,
      role: member.role,
    };
  }

  // Check if they own any workspaces
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();
    
  if (workspace) {
    return {
      id: userId,
      workspace_id: workspace.id,
      role: "Owner",
    };
  }
  
  // Auto-provision a default workspace
  // Determine name based on user metadata or email
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "User";
  const workspaceName = `${userName}'s Workspace`;

  const { data: newWorkspace, error: createError } = await supabaseAdmin
    .from("workspaces")
    .insert({
      owner_user_id: userId,
      name: workspaceName
    })
    .select("id")
    .single();

  if (createError || !newWorkspace) {
    const detail = createError?.message || createError?.code || JSON.stringify(createError);
    console.error("[require-user] Auto-provisioning failed:", detail, "userId:", userId);
    throw new Error(`Unauthorized: Auto-provisioning failed — ${detail}`);
  }

  await supabaseAdmin.from("workspace_members").insert({
    workspace_id: newWorkspace.id,
    user_id: userId,
    role: "Owner",
    status: "active"
  });

  return {
    id: userId,
    workspace_id: newWorkspace.id,
    role: "Owner",
  };
}
