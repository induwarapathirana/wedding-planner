import PlaceholderPage from "@/components/dashboard/placeholder-page";

export default function ItineraryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-3xl font-bold text-foreground">Itinerary</h2>
                <p className="mt-1 text-muted-foreground">Day-of timeline and logistics.</p>
            </div>
            <PlaceholderPage title="Timeline Builder Coming Soon" />
        </div>
    );
}
