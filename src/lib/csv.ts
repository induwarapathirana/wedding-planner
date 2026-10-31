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
