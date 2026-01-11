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
            // Check for 'role' passed from login page
            const role = requestUrl.searchParams.get("role");
            if (role && (role === 'planner' || role === 'vendor' || role === 'couple')) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // 1. Update Profile (The trigger likely created it as 'couple' by default)
                    await supabase
                        .from('profiles')
                        .update({ role: role })
                        .eq('id', user.id);

                    // 2. Update Metadata (for consistency)
                    await supabase.auth.updateUser({
                        data: { role: role }
                    });
                }
            }

            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
    }

    // Auth failed
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
}
