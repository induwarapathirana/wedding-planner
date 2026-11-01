import type { Metadata } from "next";
import { getDayOf } from "@/lib/day-of";
import DayOfClient from "./DayOfClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wedding day schedule", robots: { index: false, follow: false } };

export default async function DayOfPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const data = await getDayOf(token);
    if (!data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] p-6 text-center">
                <div>
                    <h1 className="font-serif text-2xl font-bold">This link doesn&apos;t work any more</h1>
                    <p className="mt-2 text-stone-500">Ask the couple or their planner for the new day-of link.</p>
                </div>
            </div>
        );
    }
    return <DayOfClient data={data} />;
}
