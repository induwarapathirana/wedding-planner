import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";

    if (code) {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            (cookieStore as any).set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Get user immediately to check metadata
            const { data: { user } } = await supabase.auth.getUser();

            // Check for 'role' passed from login page or metadata
            // PRIORITY: URL param (from fresh login) > User Metadata (existing)
            let role = requestUrl.searchParams.get("role");
            if (!role && user?.user_metadata?.role) {
                role = user.user_metadata.role;
            }

            if (user && role && (role === 'planner' || role === 'vendor' || role === 'couple' || role === 'pro')) {
                // 1. Upsert Profile (Ensure it exists, even if trigger failed)
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        role: role,
                        email: user.email, // Ensure email is captured
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
                        // updated_at removed
                    }, { onConflict: 'id' });

                // 2. Update Metadata (for consistency)
                await supabase.auth.updateUser({
                    data: { role: role }
                });
            }

            // SUCCESS: Redirect to dashboard (or 'next')
            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }

        console.error("Auth callback error or code exchange failed:", error);
        // Auth failed (if code is invalid or exchange failed)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
    }

    // No code present (direct access)
    return NextResponse.redirect(`${requestUrl.origin}/login`);
}
