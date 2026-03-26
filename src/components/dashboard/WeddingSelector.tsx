// Wedding selection dropdown component
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { acceptInvitation } from "@/app/actions/data";

type Wedding = {
    id: string;
    coupleName1: string;
    coupleName2: string;
    weddingDate: string;
};

// Server action to get user's weddings
async function getUserWeddings(): Promise<Wedding[]> {
    "use server";
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user?.id) return [];

    const { prisma } = await import("@/lib/prisma");
    const collabs = await prisma.collaborator.findMany({
        where: { userId: session.user.id },
        include: { wedding: true },
    });

    return collabs.map((c) => ({
        id: c.wedding.id,
        coupleName1: c.wedding.coupleName1,
        coupleName2: c.wedding.coupleName2,
        weddingDate: c.wedding.weddingDate?.toISOString() || '',
    }));
}

export default function WeddingSelector() {
    const [weddings, setWeddings] = useState<Wedding[]>([]);
    const [currentWedding, setCurrentWedding] = useState<Wedding | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user) {
            fetchWeddings();
        }
    }, [session]);

    async function fetchWeddings() {
        const weddingList = await getUserWeddings();
        setWeddings(weddingList);

        const savedWeddingId = localStorage.getItem("current_wedding_id");
        const selected = weddingList.find((w: Wedding) => w.id === savedWeddingId) || weddingList[0];

        if (selected) {
            setCurrentWedding(selected);
            localStorage.setItem("current_wedding_id", selected.id);
        }
    }

    function selectWedding(wedding: Wedding) {
        setCurrentWedding(wedding);
        localStorage.setItem("current_wedding_id", wedding.id);
        setIsOpen(false);
        window.location.reload();
    }

    const [showJoinInput, setShowJoinInput] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [joining, setJoining] = useState(false);

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        setJoining(true);

        try {
            await acceptInvitation(inviteCode);
            alert("Successfully joined wedding!");
            setIsOpen(false);
            window.location.reload();
        } catch (error: any) {
            alert(error?.message || "Invalid or expired invitation code.");
            setJoining(false);
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
                        {currentWedding.coupleName1} & {currentWedding.coupleName2}
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
                                {wedding.coupleName1} & {wedding.coupleName2}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {wedding.weddingDate ? new Date(wedding.weddingDate).toLocaleDateString() : 'No date set'}
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
