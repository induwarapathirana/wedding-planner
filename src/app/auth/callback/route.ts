import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
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
                // Check for pending invite in URL or metadata? 
                // Note: For simplicity, we just check if they have a wedding.
                // If they accepted an invite via separate flow, they'll have a collaborator record.

                const { data: collaborator } = await supabase
                    .from('collaborators')
                    .select('wedding_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (collaborator) {
                    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
                } else {
                    // New user -> Onboarding
                    return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
                }
            }

            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
    }

    // Auth failed
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
}
