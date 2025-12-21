"use client";

import { useState } from "react";
import { X, Armchair, Loader2 } from "lucide-react";

interface BulkSeatingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tableNo: string) => Promise<void>;
    selectedCount: number;
}

export function BulkSeatingDialog({ isOpen, onClose, onConfirm, selectedCount }: BulkSeatingDialogProps) {
    const [tableNo, setTableNo] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onConfirm(tableNo);
        setLoading(false);
        setTableNo("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                            <Armchair className="w-6 h-6" />
                        </div>
                        <h3 className="font-serif text-2xl font-bold text-foreground">Assign Table</h3>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                            You are assigning <span className="font-bold text-foreground">{selectedCount}</span> {selectedCount === 1 ? 'guest' : 'guests'} to a table.
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground">Table Name / Number</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            value={tableNo}
                            onChange={(e) => setTableNo(e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="e.g. Table 5 or VIP Section"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !tableNo.trim()}
                            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Assign Table
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
