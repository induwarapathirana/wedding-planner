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
            // Check if user has a wedding (onboarding check)
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Check if the user is a collaborator on any wedding
                const { data: collaborator } = await supabase
                    .from('collaborators')
                    .select('wedding_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (collaborator) {
                    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
                } else {
                    // New user (no wedding) -> Onboarding
                    return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
                }
            }

            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
    }

    // Auth failed
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
}
