"use client";

import { useMode } from "@/context/mode-context";
import { Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModeToggle() {
    const { mode, toggleMode } = useMode();

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "group relative flex items-center justify-between w-full p-1 rounded-full",
                "bg-muted border border-border transition-all duration-300 pointer-events-auto"
            )}
        >
            <div
                className={cn(
                    "absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-all duration-300",
                    mode === "advanced" ? "translate-x-full left-0 ml-1" : "left-0 ml-1"
                )}
            />
            <div className="relative z-10 flex w-full">
                <span
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors duration-300",
                        mode === "simple" ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                >
                    <Sparkles className="w-4 h-4" />
                    Simple
                </span>
                <span
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors duration-300",
                        mode === "advanced" ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                >
                    <FileText className="w-4 h-4" />
                    Advanced
                </span>
            </div>
        </button>
    );
}
