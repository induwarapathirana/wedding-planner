"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { submitInquiry } from "./actions";
import { Loader2, CheckCircle2, Calendar, DollarSign, Mail, Phone, User, MessageSquare } from "lucide-react";

// Client Component for the Form
function InquiryForm({ plannerId }: { plannerId: string }) {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            date: formData.get("date"),
            budget: formData.get("budget"),
            message: formData.get("message"),
        };

        const result = await submitInquiry(plannerId, data);

        if (result.success) {
            setSubmitted(true);
        } else {
            setError(result.error as string);
        }
        setLoading(false);
    }

    if (submitted) {
        return (
            <div className="text-center py-12 px-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Message Sent!</h2>
                <p className="text-gray-600 max-w-md mx-auto text-lg">
                    Thank you for your inquiry. We'll be in touch with you shortly to discuss your special day.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-150">
            {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" /> Name
                    </label>
                    <input
                        name="name"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        placeholder="Your full name"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" /> Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="hello@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" /> Phone
                        </label>
                        <input
                            name="phone"
                            type="tel"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="(555) 123-4567"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" /> Wedding Date
                        </label>
                        <input
                            name="date"
                            type="date"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" /> Estimated Budget
                        </label>
                        <input
                            name="budget"
                            type="number"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="e.g. 25000"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" /> Message (Optional)
                    </label>
                    <textarea
                        name="message"
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                        placeholder="Tell us a bit about your vision..."
                    />
                </div>
            </div>

            <button
                disabled={loading}
                type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Inquiry"}
            </button>
        </form>
    );
}

// Main Page Component
// @ts-ignore
import { getPlannerDetails } from "./actions";

export default async function InquiryPage({ params }: { params: Promise<{ plannerId: string }> }) {
    const { plannerId } = await params;
    const planner = await getPlannerDetails(plannerId);

    // If planner not found, might want to show error or just generic form
    const businessName = planner?.business_name || planner?.full_name || "Wedding Planner";

    return (
        <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
            <div className="max-w-xl w-full">
                {/* Header */}
                <div className="text-center mb-10 space-y-4">
                    {planner?.avatar_url && (
                        <img src={planner.avatar_url} alt="Logo" className="w-20 h-20 rounded-full mx-auto object-cover shadow-md" />
                    )}
                    <h1 className="text-4xl font-serif font-bold text-gray-900">{businessName}</h1>
                    <p className="text-gray-500 text-lg">Inquiry Form</p>
                </div>

                {/* Form Card */}
                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
                    <InquiryForm plannerId={plannerId} />
                </div>

                <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                    Powered by Vow & Venue
                </div>
            </div>
        </div>
    );
}
