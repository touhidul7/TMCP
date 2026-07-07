import { getEmailSender } from "../email/resend";
import { supabaseAdmin } from "../supabase/admin";

// Email the workspace owner when an agent queues an approval-gated call. Fired via
// deferAfterResponse from the gateway pipeline, so lookups here never delay the agent's response.
// Best-effort: a missing RESEND_API_KEY or lookup failure only logs a warning.
export async function notifyApprovalRequested({ workspaceId, agentId, approvalId, featureKey, toolName }) {
  try {
    const sender = getEmailSender();
    if (!sender) {
      console.warn("RESEND_API_KEY / RESEND_DOMAIN not set. Skipping approval notification email.");
      return;
    }

    const [{ data: workspace }, { data: agent }] = await Promise.all([
      supabaseAdmin.from("workspaces").select("owner_user_id, name").eq("id", workspaceId).maybeSingle(),
      supabaseAdmin.from("agents").select("name").eq("id", agentId).maybeSingle()
    ]);
    if (!workspace?.owner_user_id) return;

    const { data: ownerUser, error: ownerErr } =
      await supabaseAdmin.auth.admin.getUserById(workspace.owner_user_id);
    const ownerEmail = ownerUser?.user?.email;
    if (ownerErr || !ownerEmail) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const approvalsUrl = `${appUrl}/dashboard/approvals`;

    await sender.resend.emails.send({
      from: sender.from,
      to: ownerEmail,
      subject: `Approval required: ${featureKey} (${workspace.name})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Tool call awaiting approval</h2>
          <p>Agent <strong>${agent?.name || "Unknown agent"}</strong> requested an approval-gated action:</p>
          <ul>
            <li>Tool: <strong>${toolName || "Unknown tool"}</strong></li>
            <li>Feature: <strong>${featureKey}</strong></li>
            <li>Approval ID: <code>${approvalId}</code></li>
          </ul>
          <p>The call will not run until it is approved.</p>
          <a href="${approvalsUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Review in TMCP</a>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send approval notification:", err);
  }
}
