/**
 * Build a CSV string and trigger a browser download. Cells are quoted when
 * needed, and formula-like values are prefixed so spreadsheets don't execute them.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
    const escape = (value: unknown) => {
        let s = value === null || value === undefined ? "" : String(value);
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
    // BOM so Excel opens UTF-8 names (accents, Sinhala, Tamil) correctly
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Parse CSV (or tab-separated text pasted from a spreadsheet) into rows of cells.
 * Handles quoted cells with commas, quotes and line breaks.
 */
export function parseCsv(text: string): string[][] {
    const clean = text.replace(/^﻿/, "");
    const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
    const delimiter = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";

    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];
        if (quoted) {
            if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"' && cell === "") quoted = true;
        else if (ch === delimiter) { row.push(cell); cell = ""; }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && clean[i + 1] === "\n") i++;
            row.push(cell); rows.push(row); row = []; cell = "";
        } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
