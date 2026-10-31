"use client";

import { useEffect } from "react";

/**
 * Legacy auth confirm page — no longer needed with NextAuth.js.
 * NextAuth handles callbacks via /api/auth/[...nextauth].
 * This page simply redirects to dashboard.
 */
export default function AuthConfirm() {
    useEffect(() => {
        window.location.href = "/dashboard";
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Redirecting...</h2>
                <p className="text-sm text-muted-foreground">Taking you to the dashboard.</p>
            </div>
        </div>
    );
}
