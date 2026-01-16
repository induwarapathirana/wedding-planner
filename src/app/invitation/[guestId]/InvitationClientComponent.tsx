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
        whatsapp_number?: string;
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

    const [whatsapp, setWhatsapp] = useState(guest.whatsapp_number || "");
    const [rsvpStatus, setRsvpStatus] = useState<"accepted" | "declined" | "pending">(guest.rsvp_status as any);
    const [saving, setSaving] = useState(false);
    const [mealPref, setMealPref] = useState(guest.meal_preference || "");

    const handleRsvp = async (status: "accepted" | "declined") => {
        if (status === 'accepted' && !whatsapp) {
            alert("Please provide a WhatsApp number for updates.");
            return;
        }

        setSaving(true);
        const result = await updateGuestRsvp(guest.id, status, mealPref, whatsapp);
        if (result.success) {
            setRsvpStatus(status);
        } else {
            alert("Failed to save RSVP. Please try again.");
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 md:p-8 font-sans">
            {/* ... (Header image code remains same) ... */}
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100">
                {/* ... */}

                {/* RSVP Section */}
                {rsvpStatus === 'pending' ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <h4 className="text-lg font-medium text-stone-800">Will you be attending?</h4>

                        {/* WhatsApp Input */}
                        <div className="space-y-2 text-left">
                            <label className="text-sm font-medium text-stone-600">WhatsApp Number</label>
                            <input
                                type="tel"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="+1 234 567 8900"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all outline-none"
                            />
                            <p className="text-xs text-stone-400">We'll send you updates via WhatsApp.</p>
                        </div>

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
                                Decline
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

    );
}
