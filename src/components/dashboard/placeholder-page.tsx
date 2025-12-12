import { Construction } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Construction className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-muted-foreground">
                This feature is currently under development. <br />
                Switch to <strong>Advanced Mode</strong> to see if more details appear.
            </p>
        </div>
    );
}
