import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEmailSender } from "@/lib/email/resend";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["Owner", "Admin", "Developer", "Operator", "Viewer"]).default("Viewer"),
  name: z.string().optional()
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "users.invite");

    const body = await request.json();
    const { email, role, name } = InviteSchema.parse(body);

    const workspaceId = userContext.workspace_id;

    // Check if user is already in the workspace
    const { data: existingUser } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, users:user_id(email)")
      .eq("workspace_id", workspaceId);
      
    // It's a bit complicated to find user by email since we don't have access to auth.users email directly in the query.
    // Instead, we will simply rely on the invitation table.
    
    // Create invitation record
    const tokenHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        token_hash: tokenHash,
        status: "pending"
      })
      .select()
      .single();

    if (inviteError) {
      if (inviteError.code === "23505") {
        throw new Error("User has already been invited to this workspace.");
      }
      throw inviteError;
    }

    // Sender identity comes from RESEND_API_KEY + RESEND_DOMAIN in the environment.
    const sender = getEmailSender();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`;
    if (sender) {
      const inviteUrl = `${appUrl}/api/auth/callback?invite=${tokenHash}&next=/dashboard`;

      // Resend's SDK does not throw on failure — it resolves with { data, error }.
      const { error: sendError } = await sender.resend.emails.send({
        from: sender.from,
        to: email,
        subject: "You've been invited to join a Workspace on TMCP Gateway",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Workspace Invitation</h2>
            <p>Hello ${name || email},</p>
            <p>You have been invited to join a workspace on the TMCP Gateway platform with the role of <strong>${role}</strong>.</p>
            <p>Please click the link below to accept your invitation and sign in:</p>
            <a href="${inviteUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Accept Invitation</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        `
      });

      if (sendError) {
        // Remove the pending invitation so the user can retry once the email issue is fixed;
        // otherwise the unique constraint would block re-inviting the same address.
        await supabaseAdmin.from("workspace_invitations").delete().eq("id", invite.id);
        console.error("Resend send failed:", sendError);
        throw new Error(`Invitation email could not be sent: ${sendError.message || sendError.name || "unknown Resend error"}`);
      }
    } else {
      await supabaseAdmin.from("workspace_invitations").delete().eq("id", invite.id);
      console.warn("RESEND_API_KEY / RESEND_DOMAIN is not set. Skipping email dispatch.");
      throw new Error("Email is not configured on the server (RESEND_API_KEY / RESEND_DOMAIN missing), so the invitation email was not sent.");
    }

    return NextResponse.json({ success: true, invite });

  } catch (err) {
    console.error("Error inviting user:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to invite user" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
