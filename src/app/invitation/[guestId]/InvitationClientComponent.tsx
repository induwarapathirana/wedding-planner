"use client";

import { useState } from "react";
import { Check, X, MapPin, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { updateGuestRsvp } from "./actions";

type InvitationData = {
    guest: {
        id: string;
        name: string;
        rsvp_status: string;
        meal_preference?: string;
        plus_one: boolean;
        companion_guest_count?: number;
    };
    wedding: {
        id: string;
        couple_name_1: string;
        couple_name_2: string;
        wedding_date?: string;
        location?: string;
    };
};

export default function InvitationClient({ data }: { data: InvitationData }) {
    const { guest, wedding } = data;
    const coupleTitle = `${wedding.couple_name_1 || 'Partner 1'} & ${wedding.couple_name_2 || 'Partner 2'}`;

    const [rsvpStatus, setRsvpStatus] = useState<"accepted" | "declined" | "pending">(guest.rsvp_status as any);
    const [saving, setSaving] = useState(false);
    const [mealPref, setMealPref] = useState(guest.meal_preference || "");

    const handleRsvp = async (status: "accepted" | "declined") => {
        setSaving(true);
        const result = await updateGuestRsvp(guest.id, status, mealPref);
        if (result.success) {
            setRsvpStatus(status);
        } else {
            alert("Failed to save RSVP. Please try again.");
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 md:p-8 font-sans">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100">
                {/* Header Image / Pattern Area */}
                <div className="bg-[#1A1A1A] h-32 md:h-48 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="text-center z-10 p-4">
                        <h2 className="text-white/60 text-xs md:text-sm font-medium tracking-[0.2em] uppercase mb-2">You Are Invited To The Wedding Of</h2>
                        <h1 className="text-2xl md:text-4xl font-serif text-white font-medium">{coupleTitle}</h1>
                    </div>
                </div>

                <div className="p-8 md:p-12 text-center space-y-8">
                    {/* Welcome Guest */}
                    <div className="space-y-2">
                        <p className="text-stone-500 font-medium">Dear</p>
                        <h3 className="text-3xl font-serif text-stone-800">{guest.name}</h3>
                    </div>

                    {/* Wedding Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y border-stone-100">
                        {wedding.wedding_date && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-stone-400 font-bold mb-0.5">When</p>
                                    <p className="text-stone-800 font-medium">
                                        {format(parseISO(wedding.wedding_date), "MMMM do, yyyy")}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Placeholder for Time if we had it, or Location */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-600">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-stone-400 font-bold mb-0.5">Where</p>
                                <p className="text-stone-800 font-medium">{wedding.location || "Location TBD"}</p>
                            </div>
                        </div>
                    </div>

                    {/* RSVP Section */}
                    {rsvpStatus === 'pending' ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <h4 className="text-lg font-medium text-stone-800">Will you be attending?</h4>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => handleRsvp('accepted')}
                                    disabled={saving}
                                    className="flex-1 py-4 px-6 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Joyfully Accept
                                </button>
                                <button
                                    onClick={() => handleRsvp('declined')}
                                    disabled={saving}
                                    className="flex-1 py-4 px-6 rounded-xl border-2 border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Regretfully Decline
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-stone-50 rounded-2xl p-8 animate-in zoom-in-95 duration-300">
                            {rsvpStatus === 'accepted' ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-serif text-stone-800">Reservation Confirmed!</h4>
                                    <p className="text-stone-600">We are so excited to celebrate with you.</p>

                                    <button
                                        onClick={() => setRsvpStatus('pending')}
                                        className="text-sm text-stone-400 hover:text-stone-600 underline mt-4"
                                    >
                                        Change RSVP
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto text-stone-500">
                                        <X className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-serif text-stone-800">Response Recorded</h4>
                                    <p className="text-stone-600">We're sorry you can't make it. You will be missed!</p>
                                    <button
                                        onClick={() => setRsvpStatus('pending')}
                                        className="text-sm text-stone-400 hover:text-stone-600 underline mt-4"
                                    >
                                        Change RSVP
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-stone-50 p-4 text-center">
                    <p className="text-xs text-stone-400 font-medium">Powered by Wedding Planner App</p>
                </div>
            </div>
        </div>
    );
}
