"use client";

import { useState } from "react";
import { X, Star, MessageSquare, LifeBuoy } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    weddingId?: string;
}

export function FeedbackModal({ isOpen, onClose, weddingId }: FeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState("");
    const [type, setType] = useState<'feedback' | 'support'>('feedback');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.from('feedback').insert({
                user_id: user.id,
                wedding_id: weddingId,
                rating,
                message,
                type
            });

            if (error) throw error;

            alert("Thank you for your feedback! We truly appreciate it. ❤️");
            onClose();
            // Reset form
            setRating(0);
            setMessage("");
            setType('feedback');
        } catch (error: any) {
            console.error("Feedback error:", error);
            alert("Failed to submit feedback: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-900">How can we improve?</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Your input shapes our future features.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('feedback')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${type === 'feedback'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            General Feedback
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('support')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${type === 'support'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LifeBuoy className="w-4 h-4" />
                            Get Support
                        </button>
                    </div>

                    {/* Star Rating (Only for Feedback) */}
                    {type === 'feedback' && (
                        <div className="flex flex-col items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Rate your experience</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${star <= rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'fill-gray-100 text-gray-200'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="h-4 text-xs font-medium text-amber-600">
                                {rating === 5 && "Amazing! 🎉"}
                                {rating === 4 && "Pretty good! 👍"}
                                {rating === 3 && "It's okay. 🤔"}
                                {rating === 2 && "Needs work. 😕"}
                                {rating === 1 && "Not happy. 😞"}
                            </div>
                        </div>
                    )}

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {type === 'feedback' ? "What do you like or dislike?" : "Describe your issue"}
                        </label>
                        <textarea
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm transition-all"
                            placeholder={type === 'feedback' ? "I really wish there was a feature to..." : "I'm having trouble with..."}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || (type === 'feedback' && rating === 0)}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
                    >
                        {submitting ? "Sending..." : "Send Feedback"}
                    </button>
                </form>
            </div>
        </div>
    );
}
