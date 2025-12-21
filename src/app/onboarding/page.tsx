"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Calendar, Users, PartyPopper } from "lucide-react";

export default function OnboardingPage() {
    const [partnerOne, setPartnerOne] = useState("");
    const [partnerTwo, setPartnerTwo] = useState("");
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreateWedding = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("You must be logged in!");
            router.push("/login");
            return;
        }

        // 1. Check/Create Profile
        // We only likely need to create this if it's the very first time (and trigger didn't catch it)
        // OR if we want to ensure their name is set.
        // BUT we must NOT overwrite an existing name if they are a planner creating multiple weddings.

        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

        if (!existingProfile) {
            // New user (or missing profile) - Set name to input
            await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                full_name: partnerOne,
                created_at: new Date().toISOString(),
            });
        }
        // If profile exists, we leave it alone. The user's "global identity" is stable.

        // 2. Create Wedding
        const { data: wedding, error } = await supabase.from('weddings').insert({
            created_by: user.id,
            couple_name_1: partnerOne,
            couple_name_2: partnerTwo,
            wedding_date: date,
            style_theme: 'Elegant', // default
        }).select().single();

        if (error) {
            // User-friendly error messages for testing limits
            let errorMessage = "Error creating wedding: " + error.message;

            if (error.message.includes('LIMIT_PER_USER')) {
                errorMessage = "🚫 Current Package Limitation\n\nYou can only create 1 wedding with current package. If you need additional weddings, please contact support via 077 302 7782.";
            } else if (error.message.includes('LIMIT_GLOBAL')) {
                errorMessage = "🚫 Capacity Reached for Promotional Offerings\n\nWe've reached our Promotional offerings capacity. Please try again later or contact support via 077 302 7782.";
            }

            alert(errorMessage);
            setLoading(false);
        } else {
            // 3. Add user as collaborator owner
            await supabase.from('collaborators').insert({
                wedding_id: wedding.id,
                user_id: user.id,
                role: 'owner'
            });

            // 4. Save to local storage for our minimal context
            localStorage.setItem("current_wedding_id", wedding.id);

            window.location.href = "/dashboard/settings?welcome=true";
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-6">
                        <PartyPopper className="h-8 w-8 fill-current" />
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-foreground">Let's Plan Your Wedding</h2>
                    <p className="mt-2 text-muted-foreground">Tell us a little about the big day.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleCreateWedding}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground">You</label>
                            <input
                                type="text"
                                required
                                value={partnerOne}
                                onChange={(e) => setPartnerOne(e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-4 py-3 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Your Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground">Partner</label>
                            <input
                                type="text"
                                required
                                value={partnerTwo}
                                onChange={(e) => setPartnerTwo(e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-border bg-white px-4 py-3 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="Partner Name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground">Wedding Date</label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-xl border border-border bg-white pl-10 px-4 py-3 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none disabled:opacity-50 transition-all"
                    >
                        {loading ? "Creating..." : "Start Planning"}
                    </button>
                </form>
            </div>
        </div>
    );
}
