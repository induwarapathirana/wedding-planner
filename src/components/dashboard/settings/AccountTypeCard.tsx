"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookUser, Heart } from "lucide-react";
import { updateUserRole } from "@/app/actions/data";

/** Lets someone switch between a couple account and a planner account; their weddings and clients stay as they are. */
export function AccountTypeCard({ role }: { role: "couple" | "planner" }) {
    const [saving, setSaving] = useState(false);
    const other = role === "planner" ? "couple" : "planner";

    const switchRole = async () => {
        const message =
            other === "planner"
                ? "Switch to a planner account? You'll get the client pipeline, templates and an all-weddings calendar. Your current weddings stay."
                : "Switch to a couple account? Your clients and templates are kept, but hidden until you switch back.";
        if (!confirm(message)) return;
        setSaving(true);
        try {
            await updateUserRole(other);
            window.location.href = "/dashboard";
        } catch (e) {
            toast.error((e as Error).message);
            setSaving(false);
        }
    };

    const Icon = role === "planner" ? BookUser : Heart;
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">Account type</p>
                <p className="font-semibold text-gray-900">{role === "planner" ? "Wedding planner" : "Couple"}</p>
            </div>
            <button onClick={switchRole} disabled={saving} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                {saving ? "Switching…" : other === "planner" ? "I'm a wedding planner" : "Switch to couple"}
            </button>
        </div>
    );
}
