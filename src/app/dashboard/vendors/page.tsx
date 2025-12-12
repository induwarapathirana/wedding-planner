import PlaceholderPage from "@/components/dashboard/placeholder-page";

export default function VendorsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-3xl font-bold text-foreground">Vendors</h2>
                <p className="mt-1 text-muted-foreground">Track contracts, contacts, and payments.</p>
            </div>
            <PlaceholderPage title="Vendor Portal Coming Soon" />
        </div>
    );
}
