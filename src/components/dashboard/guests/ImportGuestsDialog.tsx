"use client";

import { useState } from "react";
import { FileUp, X } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { GUEST_FIELDS, guessField, normalizeGuest, type GuestField } from "@/lib/guest-import";

type Props = {
    open: boolean;
    onClose: () => void;
    onImport: (guests: NonNullable<ReturnType<typeof normalizeGuest>>[]) => Promise<void>;
};

/** Import a guest list from a CSV file or text pasted from Excel / Google Sheets. */
export function ImportGuestsDialog({ open, onClose, onImport }: Props) {
    const [rows, setRows] = useState<string[][] | null>(null);
    const [mapping, setMapping] = useState<(GuestField | null)[]>([]);
    const [pasted, setPasted] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const load = (text: string) => {
        const parsed = parseCsv(text);
        if (parsed.length < 2) {
            setError("We need a header row and at least one guest.");
            return;
        }
        setError(null);
        setRows(parsed);
        setMapping(parsed[0].map(guessField));
    };

    const reset = () => {
        setRows(null);
        setMapping([]);
        setPasted("");
        setError(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const body = rows?.slice(1) ?? [];
    const guests = body
        .map((cells) => {
            const raw: Partial<Record<GuestField, string>> = {};
            mapping.forEach((field, i) => {
                if (field && cells[i] !== undefined) raw[field] = raw[field] ? `${raw[field]} ${cells[i]}` : cells[i];
            });
            return normalizeGuest(raw);
        })
        .filter((g): g is NonNullable<typeof g> => g !== null);
    const hasName = mapping.includes("name");

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await onImport(guests);
            close();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 id="import-title" className="font-serif text-2xl font-bold">Import guests</h2>
                    <button onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-gray-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    {!rows ? (
                        <>
                            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center hover:border-primary/50 hover:bg-primary/5">
                                <FileUp className="h-8 w-8 text-muted-foreground" />
                                <span className="font-medium">Choose a CSV file</span>
                                <span className="text-sm text-muted-foreground">Export it from Excel or Google Sheets with File → Download → CSV</span>
                                <input
                                    type="file"
                                    accept=".csv,.tsv,.txt,text/csv"
                                    className="sr-only"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) load(await file.text());
                                    }}
                                />
                            </label>
                            <div className="space-y-2">
                                <label htmlFor="import-paste" className="text-sm font-medium">Or paste your sheet here, including the header row</label>
                                <textarea
                                    id="import-paste"
                                    value={pasted}
                                    onChange={(e) => setPasted(e.target.value)}
                                    rows={5}
                                    placeholder={"Name\tSide\tParty\tPhone\nNimal & Kumari Perera\tBride\t4\t+94 77 312 4410"}
                                    className="w-full rounded-xl border border-border p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <button
                                    type="button"
                                    disabled={!pasted.trim()}
                                    onClick={() => load(pasted)}
                                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                                >
                                    Continue
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Check how each column should be read. We guessed from the headers.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {rows[0].map((header, i) => (
                                    <label key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                                        <span className="truncate font-medium" title={header}>{header || `Column ${i + 1}`}</span>
                                        <select
                                            value={mapping[i] ?? ""}
                                            onChange={(e) => {
                                                const next = [...mapping];
                                                next[i] = (e.target.value || null) as GuestField | null;
                                                setMapping(next);
                                            }}
                                            className="rounded-md border border-border bg-white px-2 py-1 text-sm"
                                        >
                                            <option value="">Skip</option>
                                            {GUEST_FIELDS.map((f) => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                ))}
                            </div>

                            {guests.length > 0 && (
                                <div className="overflow-x-auto rounded-xl border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Side</th><th className="px-3 py-2">Party</th><th className="px-3 py-2">RSVP</th></tr>
                                        </thead>
                                        <tbody>
                                            {guests.slice(0, 4).map((g, i) => (
                                                <tr key={i} className="border-t border-border">
                                                    <td className="px-3 py-2">{g.name}</td>
                                                    <td className="px-3 py-2 capitalize">{g.side ?? "—"}</td>
                                                    <td className="px-3 py-2">{1 + g.companionGuestCount}</td>
                                                    <td className="px-3 py-2 capitalize">{g.rsvpStatus}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                </div>

                {rows && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                        <button onClick={reset} className="text-sm font-medium text-muted-foreground hover:text-foreground">Start over</button>
                        <button
                            onClick={submit}
                            disabled={busy || !hasName || guests.length === 0}
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-40"
                        >
                            {busy ? "Importing…" : !hasName ? "Pick the name column" : `Import ${guests.length} ${guests.length === 1 ? "household" : "households"}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
