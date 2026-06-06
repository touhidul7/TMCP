import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
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

    // Initialize Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const inviteUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/login?invite=${tokenHash}`;
      
      await resend.emails.send({
        from: `TMCP Gateway <tmcp@brittosoft.site>`,
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
    } else {
      console.warn("RESEND_API_KEY is not set. Skipping email dispatch.");
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
