"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthConfirm() {
    const [status, setStatus] = useState("Checking authentication...");

    useEffect(() => {
        const handleAuth = async () => {
            try {
                setStatus("Reading URL parameters...");

                // Method 1: Check for hash parameters (implicit flow)
                const hash = window.location.hash;
                console.log('Hash:', hash);

                if (hash) {
                    const hashParams = new URLSearchParams(hash.substring(1));
                    const access_token = hashParams.get('access_token');
                    const refresh_token = hashParams.get('refresh_token');
                    const error = hashParams.get('error');
                    const error_description = hashParams.get('error_description');

                    if (error) {
                        console.error('❌ OAuth Error:', error_description);
                        setStatus(`Error: ${error_description}`);
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 3000);
                        return;
                    }

                    if (access_token) {
                        setStatus("Setting session from access token...");
                        console.log('✅ Found access token, setting session');

                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token,
                            refresh_token: refresh_token || '',
                        });

                        if (sessionError) {
                            console.error('❌ Error setting session:', sessionError);
                            setStatus(`Error: ${sessionError.message}`);
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 3000);
                        } else {
                            setStatus("Success! Redirecting to dashboard...");
                            console.log('✅ Session set successfully');
                            setTimeout(() => {
                                window.location.href = '/dashboard';
                            }, 1000);
                        }
                        return;
                    }
                }

                // Method 2: Check if session already exists
                setStatus("Checking existing session...");
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('❌ Session error:', sessionError);
                    setStatus(`Error: ${sessionError.message}`);
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                    return;
                }

                if (session) {
                    setStatus("Session found! Redirecting to dashboard...");
                    console.log('✅ Session exists:', session.user.email);
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    setStatus("No session found. Redirecting to login...");
                    console.log('⚠️ No session or hash params found');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                }
            } catch (error) {
                console.error('❌ Unexpected error:', error);
                setStatus(`Unexpected error: ${error}`);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            }
        };

        handleAuth();
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Completing Sign In</h2>
                <p className="text-sm text-muted-foreground">{status}</p>
            </div>
        </div>
    );
}
