import { supabaseAdmin } from "../supabase/admin";

// Accept a pending workspace invitation for a signed-in user: adds (or reactivates) the
// membership with the invited role and marks the invitation accepted. Returns the workspace id
// on success, null when the token doesn't match a pending invitation.
export async function acceptInvitation({ inviteToken, userId }) {
  const { data: invitation, error: invErr } = await supabaseAdmin
    .from("workspace_invitations")
    .select("*")
    .eq("token_hash", inviteToken)
    .eq("status", "pending")
    .maybeSingle();

  if (invErr || !invitation) {
    console.warn("[accept-invitation] No pending invitation found for token:", inviteToken);
    return null;
  }

  const { error: memberInsertErr } = await supabaseAdmin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        status: "active",
      },
      { onConflict: "workspace_id,user_id" }
    );

  if (memberInsertErr) {
    console.error("[accept-invitation] Failed to insert workspace member:", memberInsertErr);
    return null;
  }

  await supabaseAdmin
    .from("workspace_invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  return invitation.workspace_id;
}
