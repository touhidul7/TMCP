import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient(request) {
  const cookieStore = await cookies();
  const headers = {};
  
  if (request && typeof request.headers?.get === "function") {
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers.Authorization = authHeader;
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      global: {
        headers,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignored in Server Components
          }
        },
      },
    }
  );
}
