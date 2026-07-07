import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { acceptInvitation } from '@/lib/auth/accept-invitation';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const inviteToken = searchParams.get('invite');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      // ── Invite acceptance flow (OAuth round trip carried the token) ──
      if (inviteToken) {
        const workspaceId = await acceptInvitation({ inviteToken, userId: sessionData.user.id });
        if (workspaceId) {
          return redirectWithWorkspace(request, next, workspaceId);
        }
      }
      return buildRedirect(request, next);
    }
    console.error('Auth callback error:', error);
  } else if (inviteToken) {
    // Invite email links land here WITHOUT an OAuth code. If the visitor is already signed in
    // (cookie session), accept the invite immediately; otherwise send them to the login page
    // with the token preserved so the OAuth round trip can carry it back to this handler.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const workspaceId = await acceptInvitation({ inviteToken, userId: user.id });
      if (workspaceId) {
        return redirectWithWorkspace(request, next, workspaceId);
      }
      return buildRedirect(request, next);
    }

    const loginUrl = `/login?invite=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(next)}`;
    return buildRedirect(request, loginUrl);
  }

  // Return the user to an error page
  const host = request.headers.get('host');
  const isLocalhost = process.env.NODE_ENV === 'development';
  const protocol = isLocalhost ? 'http' : 'https';
  return NextResponse.redirect(`${protocol}://${host}/login?error=auth_failed`);
}

// Redirect and pin the invited workspace so the app loads it first.
function redirectWithWorkspace(request, next, workspaceId) {
  const response = buildRedirect(request, next);
  response.cookies.set('tmcp_workspace_id', workspaceId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
    sameSite: 'lax',
  });
  return response;
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
