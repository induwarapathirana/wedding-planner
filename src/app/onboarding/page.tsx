"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ArrowRight, UserPlus } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Quick check to see if they might be a collaborator trying to accept an invite
        // If so, they shouldn't be here anyway, but good to be safe.
        // This page is specifically for CREATING a NEW wedding.
        setChecking(false);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (checking) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-6">
                    <Lock className="h-10 w-10" />
                </div>

                <h1 className="font-serif text-3xl font-bold text-gray-900 mb-4">
                    Registrations Paused
                </h1>

                <p className="text-gray-500 mb-8 leading-relaxed">
                    We are currently not accepting new wedding registrations as we upgrade our systems.
                    <br /><br />
                    <strong>Already have an account or an invite?</strong>
                    <br />
                    You can still access your dashboard perfectly fine.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-medium py-3 px-6 rounded-xl hover:bg-gray-800 transition-all"
                    >
                        Go to Dashboard <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full text-gray-500 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
