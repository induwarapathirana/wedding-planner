"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    // Handle OAuth hash tokens (implicit flow)
    useEffect(() => {
        // Check for invite token in URL (from link click)
        const params = new URLSearchParams(window.location.search);
        const inviteToken = params.get('invite_token');
        if (inviteToken) {
            localStorage.setItem('pending_invite_token', inviteToken);
        }
        if (params.get('signup') === 'true') {
            setIsSignUp(true);
        }

        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            console.log('📍 OAuth tokens detected in hash');
            setRedirecting(true);

            const hashParams = new URLSearchParams(hash.substring(1));
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');

            if (access_token) {
                supabase.auth.setSession({
                    access_token,
                    refresh_token: refresh_token || '',
                }).then(async ({ error, data }) => {
                    if (!error && data.session) {
                        console.log('✅ Session set - checking weddings');
                        // Check if user has any weddings

                        // We use a separate query or just try to list one
                        const { data: collaboration } = await supabase
                            .from('collaborators')
                            .select('wedding_id')
                            .eq('user_id', data.session.user.id)
                            .maybeSingle();

                        if (collaboration) {
                            window.location.replace('/dashboard');
                        } else {
                            window.location.replace('/dashboard');
                        }
                    } else {
                        console.error('❌ Session error:', error);
                        setRedirecting(false);
                        if (error) alert(error.message);
                    }
                });
            }
        }
    }, []);

    //Google OAuth
    const handleGoogleSignIn = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            alert(error.message);
            setLoading(false);
        }
    };

    // Email/Password
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                alert(error.message);
                setLoading(false);
            } else {
                alert("Success! Check your email for confirmation.");
                setIsSignUp(false);
                setLoading(false);
            }
        } else {
            const { error, data } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert(error.message);
                setLoading(false);
            } else {
                console.log('✅ Sign-in successful - checking weddings');
                setRedirecting(true);

                if (data.user) {
                    const { data: collaboration } = await supabase
                        .from('collaborators')
                        .select('wedding_id')
                        .eq('user_id', data.user.id)
                        .maybeSingle();

                    if (collaboration) {
                        window.location.replace('/dashboard');
                    } else {
                        window.location.replace('/dashboard');
                    }
                }
            }
        }
    };

    // Show redirecting state
    if (redirecting) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold mb-2">Redirecting to dashboard...</h2>
                    <p className="text-muted-foreground mb-4">If you're not redirected automatically,</p>
                    <Link href="/dashboard" className="text-primary hover:underline font-medium">
                        click here to continue
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50 px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-2 ring-primary/20">
                        <span className="font-serif text-3xl font-bold">V</span>
                    </div>
                    <h1 className="mb-2 font-serif text-4xl font-bold text-foreground">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to continue planning.</p>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-xl">
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none disabled:opacity-50 transition-all"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-4 text-muted-foreground">Or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white shadow-lg hover:bg-primary/90 focus:outline-none disabled:opacity-50 transition-all"
                        >
                            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-primary hover:underline"
                        >
                            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
