"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type PlannerMode = "simple" | "advanced";

interface ModeContextType {
    mode: PlannerMode;
    toggleMode: () => void;
    setMode: (mode: PlannerMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<PlannerMode>("advanced");

    // Persist preference (conceptual - implementation simplified for MVP)
    // In a real app, this might sync with User Profile in Supabase
    useEffect(() => {
        const savedMode = localStorage.getItem("planner-mode") as PlannerMode;
        if (savedMode) setModeState(savedMode);
    }, []);

    const setMode = (newMode: PlannerMode) => {
        setModeState(newMode);
        localStorage.setItem("planner-mode", newMode);
    };

    const toggleMode = () => {
        setMode(mode === "simple" ? "advanced" : "simple");
    };

    return (
        <ModeContext.Provider value={{ mode, toggleMode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider");
    }
    return context;
}
