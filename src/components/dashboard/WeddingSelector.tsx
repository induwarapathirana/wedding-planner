// Wedding selection dropdown component
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

type Wedding = {
    id: string;
    couple_name_1: string;
    couple_name_2: string;
    wedding_date: string;
};

export default function WeddingSelector() {
    const [weddings, setWeddings] = useState<Wedding[]>([]);
    const [currentWedding, setCurrentWedding] = useState<Wedding | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchWeddings();
    }, []);

    async function fetchWeddings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all weddings user collaborates on
        const { data: collaborations } = await supabase
            .from('collaborators')
            .select('wedding_id, weddings(*)')
            .eq('user_id', user.id);

        if (collaborations) {
            const weddingList = collaborations.map((c: any) => c.weddings);
            setWeddings(weddingList);

            // Check localStorage for selected wedding
            const savedWeddingId = localStorage.getItem("current_wedding_id");
            const selected = weddingList.find((w: Wedding) => w.id === savedWeddingId) || weddingList[0];

            if (selected) {
                setCurrentWedding(selected);
                localStorage.setItem("current_wedding_id", selected.id);
            }
        }
    }

    function selectWedding(wedding: Wedding) {
        setCurrentWedding(wedding);
        localStorage.setItem("current_wedding_id", wedding.id);
        setIsOpen(false);
        // Reload page to refresh all data
        window.location.reload();
    }

    const [showJoinInput, setShowJoinInput] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [joining, setJoining] = useState(false);

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        setJoining(true);

        const { data, error } = await supabase.rpc('accept_invitation', { lookup_token: inviteCode });

        if (error || (data && data.error)) {
            alert(error?.message || "Invalid or expired invitation code.");
            setJoining(false);
        } else {
            alert("Successfully joined wedding!");
            setIsOpen(false);
            window.location.reload();
        }
    }

    if (weddings.length === 0) {
        return (
            <Link
                href="/onboarding"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Create Wedding
            </Link>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
            >
                {currentWedding ? (
                    <span className="text-sm font-medium truncate">
                        {currentWedding.couple_name_1} & {currentWedding.couple_name_2}
                    </span>
                ) : (
                    <span className="text-sm text-gray-500">Select Wedding</span>
                )}
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {weddings.map((wedding) => (
                        <button
                            key={wedding.id}
                            onClick={() => selectWedding(wedding)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${currentWedding?.id === wedding.id ? 'bg-primary/10' : ''
                                }`}
                        >
                            <div className="text-sm font-medium">
                                {wedding.couple_name_1} & {wedding.couple_name_2}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {new Date(wedding.wedding_date).toLocaleDateString()}
                            </div>
                        </button>
                    ))}

                    <div className="p-2 space-y-2 bg-gray-50/50">
                        <Link
                            href="/onboarding"
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Wedding
                        </Link>

                        {!showJoinInput ? (
                            <button
                                onClick={() => setShowJoinInput(true)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                <span className="text-xs">🔗</span>
                                Join via Code
                            </button>
                        ) : (
                            <form onSubmit={handleJoin} className="p-2 bg-white border border-gray-200 rounded-md">
                                <input
                                    type="text"
                                    placeholder="Enter Code"
                                    className="w-full text-xs p-2 border border-gray-200 rounded mb-2 focus:outline-none focus:border-primary"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={joining || !inviteCode}
                                        className="flex-1 bg-primary text-white text-xs py-1.5 rounded hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {joining ? '...' : 'Join'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowJoinInput(false)}
                                        className="px-2 text-gray-500 hover:bg-gray-100 rounded"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
