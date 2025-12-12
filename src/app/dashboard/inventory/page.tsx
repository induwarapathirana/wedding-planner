import PlaceholderPage from "@/components/dashboard/placeholder-page";

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-3xl font-bold text-foreground">Inventory</h2>
                <p className="mt-1 text-muted-foreground">Keep track of decor, favors, and stationery.</p>
            </div>
            <PlaceholderPage title="Inventory Tracker Coming Soon" />
        </div>
    );
}
