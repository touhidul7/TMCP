import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
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
    } else {
      console.error("Auth callback error:", error);
    }
  }

  // Return the user to an error page with some instructions
  const host = request.headers.get('host');
  const isLocalhost = process.env.NODE_ENV === 'development';
  const protocol = isLocalhost ? 'http' : 'https';
  return NextResponse.redirect(`${protocol}://${host}/login?error=auth_failed`);
}
