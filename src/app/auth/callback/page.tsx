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
                setStatus(`Login Failed: ${error_description || error}`);
                // STOP redirecting so user can see the error
                // setTimeout(() => router.push('/login'), 4000); 
                return;
            }

            // Handle PKCE (Code Flow)
            if (code) {
                console.log('📍 PKCE Code detected');
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    console.error('❌ Session Exchange Error:', exchangeError.message);
                    setStatus(`Error: ${exchangeError.message}`);
                    setTimeout(() => router.push('/login'), 4000);
                } else {
                    console.log('✅ Session exchanged - checking weddings');
                    await checkWeddingsAndRedirect();
                }
                return;
            }

            // Handle Implicit (Hash Flow)
            if (hash && hash.includes('access_token')) {
                console.log('📍 Implicit Hash detected');
                const hashParams = new URLSearchParams(hash.substring(1));
                const access_token = hashParams.get('access_token');
                const refresh_token = hashParams.get('refresh_token');

                if (access_token) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token,
                        refresh_token: refresh_token || '',
                    });

                    if (sessionError) {
                        console.error('❌ Session Set Error:', sessionError.message);
                        setStatus(`Session Error: ${sessionError.message}`);
                        // setTimeout(() => router.push('/login'), 4000);
                    } else {
                        console.log('✅ Session set - checking weddings');
                        await checkWeddingsAndRedirect();
                    }
                    return;
                }
            }

            // No auth data found
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
                        // We continue to dashboard anyway
                        localStorage.removeItem('pending_invite_token');
                    } else {
                        console.log("✅ Main invitation accepted");
                        localStorage.removeItem('pending_invite_token');
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
