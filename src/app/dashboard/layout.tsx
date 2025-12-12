import { Sidebar } from "@/components/dashboard/sidebar";
import { ModeProvider } from "@/context/mode-context";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ModeProvider>
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
                <Sidebar />
                <main className="pl-72 transition-all duration-300">
                    <div className="mx-auto max-w-7xl px-8 py-10">
                        {children}
                    </div>
                </main>
            </div>
        </ModeProvider>
    );
}
