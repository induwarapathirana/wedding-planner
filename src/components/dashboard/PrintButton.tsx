import { Printer } from "lucide-react";

/** Opens the print-ready version of a list in a new tab (print it, or save it as a PDF). */
export function PrintButton({ kind, weddingId, label = "Print / PDF" }: { kind: "guests" | "seating" | "budget" | "dayof"; weddingId: string; label?: string }) {
    return (
        <a
            href={`/print/${kind}?weddingId=${encodeURIComponent(weddingId)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
            <Printer className="h-4 w-4" /> {label}
        </a>
    );
}
