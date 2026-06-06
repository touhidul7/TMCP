import { supabaseAdmin } from "../supabase/admin";

export const DEFAULT_ROLE_PERMISSIONS = {
  Owner: [
    "tools.view", "tools.add", "tools.edit", "tools.delete", "tools.connect_account", "tools.disconnect_account",
    "agents.view", "agents.create", "agents.edit", "agents.delete",
    "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate",
    "users.view", "users.invite", "users.remove", "users.change_role",
    "logs.view", "logs.export",
    "approvals.view", "approvals.approve", "approvals.reject",
    "settings.view", "settings.edit"
  ],
  Admin: [
    "tools.view", "tools.add", "tools.edit", "tools.connect_account", "tools.disconnect_account",
    "agents.view", "agents.create", "agents.edit", "agents.delete",
    "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate",
    "users.view", "users.invite",
    "logs.view",
    "approvals.view", "approvals.approve", "approvals.reject",
    "settings.view", "settings.edit"
  ],
  Developer: [
    "tools.view", "tools.add", "tools.edit",
    "agents.view", "agents.create", "agents.edit",
    "api_keys.view", "api_keys.create",
    "logs.view"
  ],
  Operator: [
    "tools.view",
    "agents.view",
    "api_keys.view",
    "logs.view",
    "approvals.view", "approvals.approve", "approvals.reject"
  ],
  Viewer: [
    "tools.view",
    "agents.view",
    "api_keys.view",
    "logs.view"
  ]
};

export async function requirePermission(userContext, permissionKey) {
  const { workspace_id, role } = userContext;

  if (role === "Owner") {
    return true; // Owner has all permissions
  }

  // Check database role_permissions first (custom mappings)
  const { data: perm, error } = await supabaseAdmin
    .from("role_permissions")
    .select("allowed")
    .eq("workspace_id", workspace_id)
    .eq("role", role)
    .eq("permission_key", permissionKey)
    .maybeSingle();

  if (!error && perm !== null) {
    if (!perm.allowed) {
      throw new Error(`Forbidden: Insufficient permissions for ${permissionKey}`);
    }
    return true;
  }

  // Fallback to defaults
  const allowedKeys = DEFAULT_ROLE_PERMISSIONS[role] || [];
  if (!allowedKeys.includes(permissionKey)) {
    throw new Error(`Forbidden: Insufficient permissions for ${permissionKey}`);
  }

  return true;
}
export { DEFAULT_ROLE_PERMISSIONS as rolePermissions };
