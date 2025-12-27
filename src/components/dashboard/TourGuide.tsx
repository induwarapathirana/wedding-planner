"use client";

import { useEffect, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

interface TourGuideProps {
    steps: DriveStep[];
    pageKey: string;
}

export function TourGuide({ steps, pageKey }: TourGuideProps) {
    const tourRef = useRef<ReturnType<typeof driver> | null>(null);

    useEffect(() => {
        // Initialize driver
        const tour = driver({
            showProgress: true,
            steps: steps,
            onDestroyStarted: () => {
                if (!tour.hasNextStep() || confirm("Are you sure you want to exit the tour?")) {
                    tour.destroy();
                    localStorage.setItem(`tour_seen_${pageKey}`, "true");
                }
            },
        });
        tourRef.current = tour;

        // Auto-start if not seen
        const hasSeen = localStorage.getItem(`tour_seen_${pageKey}`);
        if (!hasSeen) {
            // setTimeout to ensure DOM is ready
            setTimeout(() => {
                tour.drive();
            }, 1000);
        }

        return () => {
            tour.destroy();
        };
    }, [steps, pageKey]);

    const startTour = () => {
        if (tourRef.current) {
            tourRef.current.drive();
        }
    };

    return (
        <button
            onClick={startTour}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-primary transition-colors rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
            title="Start Page Tour"
        >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Page Guide</span>
        </button>
    );
}
