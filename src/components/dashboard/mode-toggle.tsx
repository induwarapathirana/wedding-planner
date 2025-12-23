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
                "relative flex items-center p-1 rounded-full bg-muted/50 border border-border/50 hover:bg-muted transition-all duration-300 w-32 h-9",
            )}
        >
            <div
                className={cn(
                    "absolute h-7 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-all duration-300 pointer-events-none",
                    mode === "advanced" ? "translate-x-full" : "translate-x-0"
                )}
            />
            <div className="relative z-10 flex w-full">
                <span
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                        mode === "simple" ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    <Sparkles className="w-3 h-3" />
                    Simple
                </span>
                <span
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                        mode === "advanced" ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    <FileText className="w-3 h-3" />
                    Adv.
                </span>
            </div>
        </button>
    );
}
