import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const inviteToken = searchParams.get('invite');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && sessionData?.user) {
      const userId = sessionData.user.id;
      const userEmail = sessionData.user.email;

      // ── Invite acceptance flow ──────────────────────────────────────
      if (inviteToken) {
        try {
          // Look up the pending invitation by token_hash
          const { data: invitation, error: invErr } = await supabaseAdmin
            .from('workspace_invitations')
            .select('*')
            .eq('token_hash', inviteToken)
            .eq('status', 'pending')
            .maybeSingle();

          if (!invErr && invitation) {
            // Add the user to the workspace as a member with the invited role
            const { error: memberInsertErr } = await supabaseAdmin
              .from('workspace_members')
              .upsert(
                {
                  workspace_id: invitation.workspace_id,
                  user_id: userId,
                  role: invitation.role,
                  status: 'active',
                },
                { onConflict: 'workspace_id,user_id' }
              );

            if (!memberInsertErr) {
              // Mark invitation as accepted
              await supabaseAdmin
                .from('workspace_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id);

              // Set cookie so the app loads the invited workspace first
              const response = buildRedirect(request, next);
              response.cookies.set('tmcp_workspace_id', invitation.workspace_id, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
                httpOnly: false,
                sameSite: 'lax',
              });
              return response;
            } else {
              console.error('[auth/callback] Failed to insert workspace member:', memberInsertErr);
            }
          } else {
            console.warn('[auth/callback] No pending invitation found for token:', inviteToken);
          }
        } catch (e) {
          console.error('[auth/callback] Invite acceptance error:', e);
        }
      }

      return buildRedirect(request, next);
    } else {
      console.error('Auth callback error:', error);
    }
  }

  // Return the user to an error page
  const host = request.headers.get('host');
  const isLocalhost = process.env.NODE_ENV === 'development';
  const protocol = isLocalhost ? 'http' : 'https';
  return NextResponse.redirect(`${protocol}://${host}/login?error=auth_failed`);
}

function buildRedirect(request, next) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const isLocalhost = process.env.NODE_ENV === 'development';

  if (isLocalhost) {
    return NextResponse.redirect(`http://${host}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`https://${host}${next}`);
  }
}
