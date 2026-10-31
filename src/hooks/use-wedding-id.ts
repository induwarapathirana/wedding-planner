"use client";

import { useEffect, useState } from "react";
import { getUserWeddingId } from "@/app/actions/data";

/**
 * The wedding the user is working on: ?weddingId in the URL (planners),
 * then the last one used on this device, then the first one they belong to.
 * `null` means they have none yet; `undefined` means still resolving.
 */
export function useWeddingId() {
    const [weddingId, setWeddingId] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        const fromUrl = new URLSearchParams(window.location.search).get("weddingId");
        let stored: string | null = null;
        try {
            stored = localStorage.getItem("current_wedding_id");
        } catch {}

        const chosen = fromUrl || stored;
        if (chosen) {
            if (fromUrl) {
                try {
                    localStorage.setItem("current_wedding_id", fromUrl);
                } catch {}
            }
            setWeddingId(chosen);
            return;
        }
        getUserWeddingId().then((id) => {
            if (id) {
                try {
                    localStorage.setItem("current_wedding_id", id);
                } catch {}
            }
            setWeddingId(id);
        });
    }, []);

    return weddingId;
}
