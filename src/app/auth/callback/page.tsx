"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Authenticating...");

    // Global safety timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (status.includes("Error")) return; // Don't redirect if showing an error
            console.warn("Callback timeout - forcing dashboard");
            router.replace('/dashboard');
        }, 8000); // 8s timeout to allow for slow RPC
        return () => clearTimeout(timer);
    }, [router, status]);

    useEffect(() => {
        const handleCallback = async () => {
            const { hash, searchParams } = new URL(window.location.href);
            const code = searchParams.get('code');
            const error = searchParams.get('error');
            const error_description = searchParams.get('error_description');

            if (error) {
                console.error('❌ OAuth Error:', error_description);
                setStatus(`Error: ${error_description}`);
                setTimeout(() => router.push('/login'), 4000);
                return;
            }

            // ... (PKCE) ...

            // ... (Implicit) ...
            if (sessionError) {
                console.error('❌ Session Set Error:', sessionError.message);
                setStatus(`Error: ${sessionError.message}`);
                setTimeout(() => router.push('/login'), 4000);
            } else {
                // ...
                await checkWeddingsAndRedirect();
            }
            return;
        }
    }

            // No auth data
            console.log('⚠️ No auth data found in URL');
    setStatus("No authentication data found. Redirecting...");
    setTimeout(() => router.push('/login'), 4000);
};

handleCallback();
    }, [router]);

const checkWeddingsAndRedirect = async () => {
    try {
        setStatus("Checking profile...");
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check for pending invite (localStorage OR URL param)
            const urlParams = new URL(window.location.href).searchParams;
            const pendingInvite = localStorage.getItem('pending_invite_token') || urlParams.get('invite_token');

            if (pendingInvite) {
                setStatus("Accepting invitation...");

                // Use secure RPC to accept (verifies email match)
                const { data, error } = await supabase.rpc('accept_invitation', { lookup_token: pendingInvite });

                if (error || (data && data.error)) {
                    const errMsg = error?.message || data?.error;
                    console.error("❌ Invite Acceptance Failed:", errMsg);
                    // Use a standardized alert or just log? 
                    // Showing alert ensures user knows why they aren't in the wedding.
                    // But we are redirecting... let's just log and maybe set a query param?
                    // Safe to clear token to prevent loop.
                    localStorage.removeItem('pending_invite_token');
                    // Optional: store error in a way dashboard can see?
                } else {
                    console.log("✅ Main invitation accepted");
                    // Update local storage immediately? No, dashboard will fetch.
                    localStorage.removeItem('pending_invite_token');

                    // Force refresh user/collaborations?
                    // The subsequent checkWeddingsAndRedirect logic checks collaborators table.
                    // We must wait a tiny bit or let it proceed. 
                    // RPC is synchronous on DB, so it should be visible immediately.
                }
            }

            const { data: collaboration } = await supabase
                .from('collaborators')
                .select('wedding_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (collaboration) {
                router.replace('/dashboard');
            } else {
                router.replace('/dashboard');
            }
        } else {
            router.replace('/login');
        }
    } catch (err) {
        console.error("Auth callback logic error:", err);
        router.replace('/dashboard');
    }
};

return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-lg font-medium text-gray-900">{status}</h2>
        </div>
    </div>
);
}
