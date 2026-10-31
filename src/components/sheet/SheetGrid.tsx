"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A spreadsheet-style editable table: click a cell and type, Tab/Enter/arrows
 * to move, Esc to cancel, Ctrl/⌘ Z to undo, paste rows from Excel or Sheets.
 * Rows are owned by the parent; the grid reports edits through onCommit so the
 * parent can update optimistically and save in the background.
 */

export type SheetOption = { value: string; label: string };

export type SheetColumn<T> = {
    key: string;
    label: string;
    type?: "text" | "number" | "money" | "select" | "date" | "checkbox";
    options?: SheetOption[];
    width?: number;
    /** Computed value for display, sorting and copying (also makes the cell read-only unless `readOnly` is false). */
    get?: (row: T) => unknown;
    readOnly?: boolean | ((row: T) => boolean);
    /** Custom cell content (display only; editing still uses the column type). */
    render?: (row: T) => ReactNode;
    placeholder?: string;
    align?: "left" | "right" | "center";
    /** Keep the column visible while scrolling sideways. */
    sticky?: boolean;
    /** Show on the collapsed card in the phone layout. */
    summary?: boolean;
};

export type SheetGroup<T> = { key: string; label: string; rows: T[] };

type Props<T> = {
    rows: T[];
    columns: SheetColumn<T>[];
    getRowId: (row: T) => string;
    onCommit: (row: T, key: string, value: unknown) => void;
    /** Format money cells (currency symbol etc.). */
    formatMoney?: (n: number) => string;
    readOnly?: boolean;
    /** Group rows (e.g. budget by category); order follows the returned array. */
    groupBy?: (rows: T[]) => SheetGroup<T>[];
    renderGroupHeader?: (group: SheetGroup<T>) => ReactNode;
    /** Adds a row and returns its id so the grid can start editing it. */
    onAddRow?: (groupKey?: string) => Promise<string | undefined> | string | undefined;
    addRowLabel?: string | ((groupKey?: string) => string);
    /** Multiple pasted lines become new rows; values are keyed by column, starting at the active column. */
    onPasteRows?: (records: Record<string, string>[]) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    rowActions?: (row: T) => ReactNode;
    emptyState?: ReactNode;
    maxHeight?: string;
};

type Active = { id: string; col: number };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}/;

/** True below 640px, where the sheet switches to cards. */
function useNarrow() {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 639px)");
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);
    return narrow;
}

export function toDateInput(v: unknown): string {
    if (!v) return "";
    if (typeof v === "string" && DATE_ONLY.test(v)) return v.slice(0, 10);
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Turn typed or pasted text into a value for the column, or `undefined` if it can't be parsed. */
export function parseCellValue<T>(col: SheetColumn<T>, raw: string): unknown {
    const text = raw.trim();
    switch (col.type) {
        case "number":
        case "money": {
            if (!text) return null;
            const n = Number(text.replace(/[^\d.-]/g, ""));
            return Number.isFinite(n) ? n : undefined;
        }
        case "select": {
            if (!text) return undefined;
            const lower = text.toLowerCase();
            const match =
                col.options?.find((o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower) ??
                col.options?.find((o) => o.label.toLowerCase().startsWith(lower) || o.value.toLowerCase().startsWith(lower));
            return match?.value;
        }
        case "date": {
            if (!text) return null;
            const d = new Date(text);
            return isNaN(d.getTime()) ? undefined : toDateInput(d);
        }
        case "checkbox":
            return /^(y|yes|true|1|x|✓|paid|done)$/i.test(text);
        default:
            return text;
    }
}

function cellValue<T>(row: T, col: SheetColumn<T>) {
    return col.get ? col.get(row) : (row as Record<string, unknown>)[col.key];
}

function isReadOnly<T>(row: T, col: SheetColumn<T>, gridReadOnly?: boolean) {
    if (gridReadOnly) return true;
    if (typeof col.readOnly === "function") return col.readOnly(row);
    if (col.readOnly !== undefined) return col.readOnly;
    return !!col.get;
}

function displayText<T>(row: T, col: SheetColumn<T>, formatMoney: (n: number) => string): string {
    const v = cellValue(row, col);
    if (v === null || v === undefined || v === "") return "";
    switch (col.type) {
        case "money":
            return formatMoney(Number(v));
        case "number":
            return Number(v).toLocaleString();
        case "select":
            return col.options?.find((o) => o.value === v)?.label ?? String(v);
        case "date": {
            const d = toDateInput(v);
            return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
        }
        case "checkbox":
            return v ? "Yes" : "No";
        default:
            return String(v);
    }
}

export function SheetGrid<T>({
    rows,
    columns,
    getRowId,
    onCommit,
    formatMoney = (n) => n.toLocaleString(),
    readOnly,
    groupBy,
    renderGroupHeader,
    onAddRow,
    addRowLabel = "Add a row",
    onPasteRows,
    selectedIds,
    onSelectionChange,
    rowActions,
    emptyState,
    maxHeight = "70vh",
}: Props<T>) {
    const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
    const [active, setActive] = useState<Active | null>(null);
    const [editing, setEditing] = useState<{ seed?: string } | null>(null);
    const history = useRef<{ id: string; key: string; old: unknown }[]>([]);
    const gridRef = useRef<HTMLDivElement>(null);
    // Row to start editing once it shows up (set after onAddRow resolves)
    const [pendingEdit, setPendingEdit] = useState<string | null>(null);

    const selectable = !!onSelectionChange;
    const narrow = useNarrow();

    const sorted = useMemo(() => {
        if (!sort) return rows;
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return rows;
        return [...rows].sort((a, b) => {
            const va = cellValue(a, col);
            const vb = cellValue(b, col);
            if (va === vb) return 0;
            if (va === null || va === undefined || va === "") return 1;
            if (vb === null || vb === undefined || vb === "") return -1;
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
            return String(va).localeCompare(String(vb), undefined, { numeric: true }) * sort.dir;
        });
    }, [rows, columns, sort]);

    const groups = useMemo<SheetGroup<T>[]>(
        () => (groupBy ? groupBy(sorted) : [{ key: "", label: "", rows: sorted }]),
        [groupBy, sorted]
    );
    const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
    const rowIndex = active ? flat.findIndex((r) => getRowId(r) === active.id) : -1;
    const activeRow = rowIndex >= 0 ? flat[rowIndex] : undefined;

    // Start editing a freshly added row once it appears
    useEffect(() => {
        if (!narrow && pendingEdit && flat.some((r) => getRowId(r) === pendingEdit)) {
            const firstEditable = columns.findIndex((c) => !c.get && c.type !== "checkbox");
            setActive({ id: pendingEdit, col: Math.max(firstEditable, 0) });
            setEditing({});
            setPendingEdit(null);
        }
    }, [narrow, pendingEdit, flat, columns, getRowId]);

    const focusGrid = () => gridRef.current?.focus({ preventScroll: true });

    const move = useCallback(
        (dr: number, dc: number) => {
            if (!flat.length) return;
            const r = Math.max(0, Math.min(flat.length - 1, (rowIndex < 0 ? 0 : rowIndex) + dr));
            const c = Math.max(0, Math.min(columns.length - 1, (active?.col ?? 0) + dc));
            setActive({ id: getRowId(flat[r]), col: c });
        },
        [flat, rowIndex, active, columns.length, getRowId]
    );

    // Keep the active cell in view
    useEffect(() => {
        if (!active) return;
        const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${CSS.escape(active.id)}:${active.col}"]`);
        if (!el) return;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        // Don't leave the cell hidden behind the frozen column
        const frozen = el.parentElement?.querySelector<HTMLElement>("td.sticky");
        const scroller = el.closest<HTMLElement>(".overflow-auto");
        if (frozen && frozen !== el && scroller) {
            const overlap = frozen.getBoundingClientRect().right - el.getBoundingClientRect().left;
            if (overlap > 0) scroller.scrollLeft -= overlap;
        }
    }, [active]);

    const commit = useCallback(
        (row: T, col: SheetColumn<T>, value: unknown) => {
            if (value === undefined) return;
            const old = cellValue(row, col);
            const same = col.type === "date" ? toDateInput(old) === toDateInput(value) : old === value || (old == null && (value === "" || value === null));
            if (same) return;
            history.current.push({ id: getRowId(row), key: col.key, old });
            onCommit(row, col.key, value);
        },
        [getRowId, onCommit]
    );

    const undo = useCallback(() => {
        const last = history.current.pop();
        if (!last) return;
        const row = rows.find((r) => getRowId(r) === last.id);
        if (row) onCommit(row, last.key, last.old);
    }, [rows, getRowId, onCommit]);

    const startEdit = (seed?: string) => {
        if (!activeRow || active === null) return;
        const col = columns[active.col];
        if (isReadOnly(activeRow, col, readOnly)) return;
        if (col.type === "checkbox") {
            commit(activeRow, col, !cellValue(activeRow, col));
            return;
        }
        setEditing({ seed });
    };

    const finishEdit = (raw: string | null, dr = 0, dc = 0) => {
        if (raw !== null && activeRow && active) {
            commit(activeRow, columns[active.col], parseCellValue(columns[active.col], raw));
        }
        setEditing(null);
        if (dr || dc) move(dr, dc);
        requestAnimationFrame(focusGrid);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (editing) return;
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === "z") {
            e.preventDefault();
            undo();
            return;
        }
        if (mod && e.key.toLowerCase() === "c" && activeRow && active) {
            const text = displayText(activeRow, columns[active.col], formatMoney);
            navigator.clipboard?.writeText(text).catch(() => {});
            return;
        }
        if (mod) return;
        switch (e.key) {
            case "ArrowUp": e.preventDefault(); move(-1, 0); return;
            case "ArrowDown": e.preventDefault(); move(1, 0); return;
            case "ArrowLeft": e.preventDefault(); move(0, -1); return;
            case "ArrowRight": e.preventDefault(); move(0, 1); return;
            case "Tab": e.preventDefault(); move(0, e.shiftKey ? -1 : 1); return;
            case "Enter": case "F2": e.preventDefault(); startEdit(); return;
            case " ":
                if (activeRow && active && columns[active.col].type === "checkbox") { e.preventDefault(); startEdit(); }
                return;
            case "Backspace": case "Delete": {
                if (!activeRow || !active) return;
                const col = columns[active.col];
                if (isReadOnly(activeRow, col, readOnly) || col.type === "select" || col.type === "checkbox") return;
                e.preventDefault();
                commit(activeRow, col, col.type === "text" ? "" : null);
                return;
            }
            case "Escape":
                setActive(null);
                return;
        }
        if (e.key.length === 1 && activeRow && active) {
            const col = columns[active.col];
            if (isReadOnly(activeRow, col, readOnly)) return;
            e.preventDefault();
            if (col.type === "select") {
                const v = parseCellValue(col, e.key);
                if (v !== undefined) commit(activeRow, col, v);
            } else if (col.type !== "checkbox") {
                startEdit(e.key);
            }
        }
    };

    const onPaste = (e: React.ClipboardEvent) => {
        if (editing || readOnly) return;
        const text = e.clipboardData.getData("text/plain");
        if (!text) return;
        const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
        const startCol = active?.col ?? 0;
        if (lines.length > 1 || !activeRow) {
            if (!onPasteRows) return;
            e.preventDefault();
            const records = lines.map((line) => {
                const cells = line.split("\t");
                const rec: Record<string, string> = {};
                cells.forEach((cell, i) => {
                    const col = columns[startCol + i];
                    if (col && !col.get) rec[col.key] = cell;
                });
                return rec;
            });
            onPasteRows(records);
            return;
        }
        // One line: fill cells across the active row
        e.preventDefault();
        lines[0].split("\t").forEach((cell, i) => {
            const col = columns[startCol + i];
            if (col && !isReadOnly(activeRow, col, readOnly)) commit(activeRow, col, parseCellValue(col, cell));
        });
    };

    const addRow = async (groupKey?: string) => {
        if (!onAddRow) return;
        const id = await onAddRow(groupKey);
        if (id) setPendingEdit(id);
    };

    if (narrow) {
        return (
            <SheetCards
                groups={groups}
                grouped={!!groupBy}
                columns={columns}
                getRowId={getRowId}
                commit={commit}
                formatMoney={formatMoney}
                readOnly={readOnly}
                renderGroupHeader={renderGroupHeader}
                onAddRow={onAddRow ? addRow : undefined}
                addRowLabel={addRowLabel}
                rowActions={rowActions}
                emptyState={emptyState}
                pendingEdit={pendingEdit}
                clearPendingEdit={() => setPendingEdit(null)}
            />
        );
    }

    const allVisibleSelected = selectable && flat.length > 0 && flat.every((r) => selectedIds?.has(getRowId(r)));
    const toggleAll = () => {
        if (!onSelectionChange) return;
        onSelectionChange(allVisibleSelected ? new Set() : new Set(flat.map(getRowId)));
    };
    const toggleRow = (id: string) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    };

    const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
    const labelFor = (groupKey?: string) => (typeof addRowLabel === "function" ? addRowLabel(groupKey) : addRowLabel);

    const renderAddRow = (groupKey?: string) =>
        onAddRow && !readOnly ? (
            <tr>
                <td colSpan={colCount} className="border-b border-border/60 p-0">
                    <button
                        type="button"
                        onClick={() => addRow(groupKey)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        {labelFor(groupKey)}
                    </button>
                </td>
            </tr>
        ) : null;

    return (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-auto" style={{ maxHeight }}>
                <div
                    ref={gridRef}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    // The selected cell is the focus indicator; select one when tabbing in
                    onFocus={() => {
                        // Functional update: a click's own selection (queued first) wins
                        if (flat.length) setActive((a) => a ?? { id: getRowId(flat[0]), col: 0 });
                    }}
                    className="outline-none"
                    role="grid"
                    aria-rowcount={flat.length}
                >
                    <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
                        <thead>
                            <tr>
                                {selectable && (
                                    <th className="sticky top-0 z-20 w-10 border-b border-border bg-gray-50 px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleAll}
                                            aria-label="Select all rows"
                                            className="h-4 w-4 rounded border-gray-300 accent-[var(--primary)]"
                                        />
                                    </th>
                                )}
                                {columns.map((col, ci) => {
                                    const sorted = sort?.key === col.key;
                                    return (
                                        <th
                                            key={col.key}
                                            style={{ minWidth: col.width, width: col.width }}
                                            className={cn(
                                                "sticky top-0 z-10 border-b border-border bg-gray-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                                                col.align === "right" && "text-right",
                                                col.sticky && "left-0 z-30",
                                                ci === 0 && selectable && col.sticky && "left-10"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSort((s) =>
                                                        s?.key !== col.key ? { key: col.key, dir: 1 } : s.dir === 1 ? { key: col.key, dir: -1 } : null
                                                    )
                                                }
                                                className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", col.align === "right" && "flex-row-reverse")}
                                                aria-label={`Sort by ${col.label}`}
                                            >
                                                {col.label}
                                                {sorted && (sort!.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                            </button>
                                        </th>
                                    );
                                })}
                                {rowActions && <th className="sticky top-0 z-10 w-20 border-b border-border bg-gray-50" aria-label="Actions" />}
                            </tr>
                        </thead>
                        <tbody>
                            {flat.length === 0 && !groupBy && (
                                <tr>
                                    <td colSpan={colCount} className="px-6 py-12 text-center text-muted-foreground">
                                        {emptyState ?? "Nothing here yet."}
                                    </td>
                                </tr>
                            )}
                            {groups.map((group) => (
                                <Fragment key={group.key || "all"}>
                                    {groupBy && (
                                        <tr>
                                            <td colSpan={colCount} className="border-b border-border bg-gray-50/80 px-3 py-2">
                                                {renderGroupHeader ? renderGroupHeader(group) : <span className="font-semibold">{group.label}</span>}
                                            </td>
                                        </tr>
                                    )}
                                    {group.rows.map((row) => {
                                        const id = getRowId(row);
                                        const isSelected = selectedIds?.has(id);
                                        return (
                                            <tr key={id} className={cn("group/row", isSelected && "bg-primary/5")}>
                                                {selectable && (
                                                    <td className="w-10 border-b border-border/60 px-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isSelected}
                                                            onChange={() => toggleRow(id)}
                                                            aria-label="Select row"
                                                            className="h-4 w-4 rounded border-gray-300 accent-[var(--primary)]"
                                                        />
                                                    </td>
                                                )}
                                                {columns.map((col, ci) => {
                                                    const isActive = active?.id === id && active.col === ci;
                                                    const isEditing = isActive && !!editing;
                                                    const ro = isReadOnly(row, col, readOnly);
                                                    const value = cellValue(row, col);
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            data-cell={`${id}:${ci}`}
                                                            role="gridcell"
                                                            aria-selected={isActive}
                                                            onMouseDown={(e) => {
                                                                if (isEditing) return;
                                                                e.preventDefault();
                                                                if (isActive) startEdit();
                                                                else setActive({ id, col: ci });
                                                                focusGrid();
                                                            }}
                                                            onDoubleClick={() => !isEditing && startEdit()}
                                                            style={{ minWidth: col.width, maxWidth: col.width ? col.width * 1.6 : undefined }}
                                                            className={cn(
                                                                "relative h-10 border-b border-r border-border/60 px-3 whitespace-nowrap overflow-hidden text-ellipsis",
                                                                ro ? "cursor-default text-foreground/80" : "cursor-cell",
                                                                col.align === "right" && "text-right",
                                                                col.align === "center" && "text-center",
                                                                // Frozen cells sit above scrolled cells, including a selected one
                                                                col.sticky && "sticky left-0 z-[4] bg-white group-hover/row:bg-gray-50",
                                                                col.sticky && selectable && "left-10",
                                                                isActive && (col.sticky ? "z-[5]" : "z-[2]"),
                                                                isActive && "shadow-[inset_0_0_0_2px_var(--primary)]",
                                                                ro && isActive && "shadow-[inset_0_0_0_2px_var(--border)]"
                                                            )}
                                                        >
                                                            {isEditing ? (
                                                                <CellEditor
                                                                    col={col}
                                                                    value={value}
                                                                    seed={editing?.seed}
                                                                    onDone={finishEdit}
                                                                />
                                                            ) : col.type === "checkbox" ? (
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex h-4 w-4 items-center justify-center rounded border",
                                                                        value ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 bg-white"
                                                                    )}
                                                                    aria-label={value ? "Yes" : "No"}
                                                                >
                                                                    {value ? <Check className="h-3 w-3" /> : null}
                                                                </span>
                                                            ) : col.render ? (
                                                                col.render(row)
                                                            ) : value === null || value === undefined || value === "" ? (
                                                                <span className="text-muted-foreground/60">{col.placeholder ?? ""}</span>
                                                            ) : (
                                                                displayText(row, col, formatMoney)
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {rowActions && (
                                                    <td className="border-b border-border/60 px-2 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                            {rowActions(row)}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {groupBy && renderAddRow(group.key)}
                                </Fragment>
                            ))}
                            {!groupBy && renderAddRow()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function CellEditor<T>({
    col,
    value,
    seed,
    onDone,
}: {
    col: SheetColumn<T>;
    value: unknown;
    seed?: string;
    onDone: (raw: string | null, dr?: number, dc?: number) => void;
}) {
    const done = useRef(false);
    const finish = (raw: string | null, dr = 0, dc = 0) => {
        if (done.current) return;
        done.current = true;
        onDone(raw, dr, dc);
    };
    const keys = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(e.currentTarget.value, 1, 0); }
        else if (e.key === "Tab") { e.preventDefault(); finish(e.currentTarget.value, 0, e.shiftKey ? -1 : 1); }
        else if (e.key === "Escape") { e.preventDefault(); finish(null); }
    };
    const base = "absolute inset-0 h-full w-full bg-white px-3 text-sm text-foreground outline-none shadow-[inset_0_0_0_2px_var(--primary)]";

    if (col.type === "select") {
        return (
            <select
                autoFocus
                defaultValue={(value as string) ?? ""}
                onChange={(e) => finish(e.target.value)}
                onBlur={(e) => finish(e.target.value)}
                onKeyDown={keys}
                className={base}
                aria-label={col.label}
            >
                {value === null || value === undefined || value === "" ? <option value="">—</option> : null}
                {col.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        );
    }

    const initial =
        seed !== undefined ? seed : col.type === "date" ? toDateInput(value) : value === null || value === undefined ? "" : String(value);

    return (
        <input
            autoFocus
            type={col.type === "date" ? "date" : "text"}
            inputMode={col.type === "number" || col.type === "money" ? "decimal" : undefined}
            defaultValue={initial}
            onFocus={(e) => { if (seed === undefined && col.type !== "date") e.currentTarget.select(); }}
            onBlur={(e) => finish(e.target.value)}
            onKeyDown={keys}
            placeholder={col.placeholder}
            className={cn(base, (col.type === "number" || col.type === "money") && "text-right")}
            aria-label={col.label}
        />
    );
}

/** Phone layout: one card per row; tap to edit every field. */
function SheetCards<T>({
    groups,
    grouped,
    columns,
    getRowId,
    commit,
    formatMoney,
    readOnly,
    renderGroupHeader,
    onAddRow,
    addRowLabel,
    rowActions,
    emptyState,
    pendingEdit,
    clearPendingEdit,
}: {
    groups: SheetGroup<T>[];
    grouped: boolean;
    columns: SheetColumn<T>[];
    getRowId: (row: T) => string;
    commit: (row: T, col: SheetColumn<T>, value: unknown) => void;
    formatMoney: (n: number) => string;
    readOnly?: boolean;
    renderGroupHeader?: (group: SheetGroup<T>) => ReactNode;
    onAddRow?: (groupKey?: string) => void;
    addRowLabel: string | ((groupKey?: string) => string);
    rowActions?: (row: T) => ReactNode;
    emptyState?: ReactNode;
    pendingEdit: string | null;
    clearPendingEdit: () => void;
}) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [title, ...rest] = columns;

    // A freshly added row opens expanded
    useEffect(() => {
        if (pendingEdit && groups.some((g) => g.rows.some((r) => getRowId(r) === pendingEdit))) {
            setExpanded(pendingEdit);
            clearPendingEdit();
        }
    }, [pendingEdit, groups, getRowId, clearPendingEdit]);

    const label = (key?: string) => (typeof addRowLabel === "function" ? addRowLabel(key) : addRowLabel);
    const total = groups.reduce((n, g) => n + g.rows.length, 0);

    const addButton = (key?: string) =>
        onAddRow && !readOnly ? (
            <button
                type="button"
                onClick={() => onAddRow(key)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground"
            >
                <Plus className="h-4 w-4" /> {label(key)}
            </button>
        ) : null;

    return (
        <div className="space-y-3">
            {total === 0 && !grouped && (
                <p className="rounded-xl border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">{emptyState ?? "Nothing here yet."}</p>
            )}
            {groups.map((group) => (
                <section key={group.key || "all"} className="space-y-2">
                    {grouped && (
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                            {renderGroupHeader ? renderGroupHeader(group) : <span className="font-semibold">{group.label}</span>}
                        </div>
                    )}
                    {group.rows.map((row) => {
                        const id = getRowId(row);
                        const open = expanded === id;
                        return (
                            <article key={id} className="rounded-xl border border-border bg-white shadow-sm">
                                <div className="flex items-start gap-2 p-3">
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(open ? null : id)}
                                        aria-expanded={open}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <span className="block truncate font-semibold">
                                            {displayText(row, title, formatMoney) || <span className="text-muted-foreground">{title.placeholder ?? "Untitled"}</span>}
                                        </span>
                                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            {rest.filter((c) => c.summary).map((c) => (
                                                <span key={c.key} className="inline-flex items-center gap-1">
                                                    {c.render ? c.render(row) : displayText(row, c, formatMoney) || "—"}
                                                </span>
                                            ))}
                                        </span>
                                    </button>
                                    {rowActions && <div className="flex shrink-0 items-center">{rowActions(row)}</div>}
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(open ? null : id)}
                                        className="shrink-0 rounded-md p-1.5 text-muted-foreground"
                                        aria-label={open ? "Collapse" : "Edit details"}
                                    >
                                        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
                                    </button>
                                </div>
                                {open && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-border p-3">
                                        {columns.map((col) => (
                                            <CardField key={col.key} row={row} col={col} commit={commit} formatMoney={formatMoney} readOnly={readOnly} />
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                    {grouped && addButton(group.key)}
                </section>
            ))}
            {!grouped && addButton()}
        </div>
    );
}

function CardField<T>({
    row,
    col,
    commit,
    formatMoney,
    readOnly,
}: {
    row: T;
    col: SheetColumn<T>;
    commit: (row: T, col: SheetColumn<T>, value: unknown) => void;
    formatMoney: (n: number) => string;
    readOnly?: boolean;
}) {
    const value = cellValue(row, col);
    const ro = isReadOnly(row, col, readOnly);
    const wide = col.type === "text" || col.type === undefined;
    const input = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

    let control: ReactNode;
    if (ro) {
        control = <p className="mt-1 text-sm">{col.render ? col.render(row) : displayText(row, col, formatMoney) || "—"}</p>;
    } else if (col.type === "checkbox") {
        control = (
            <button
                type="button"
                onClick={() => commit(row, col, !value)}
                aria-pressed={!!value}
                className={cn("mt-1 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm", value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-border")}
            >
                {value ? <Check className="h-4 w-4" /> : null}
                {value ? "Yes" : "No"}
            </button>
        );
    } else if (col.type === "select") {
        control = (
            <select value={(value as string) ?? ""} onChange={(e) => commit(row, col, e.target.value)} className={input}>
                {(value === null || value === undefined || value === "") && <option value="">—</option>}
                {col.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    } else {
        const initial = col.type === "date" ? toDateInput(value) : value === null || value === undefined ? "" : String(value);
        control = (
            <input
                key={initial}
                type={col.type === "date" ? "date" : "text"}
                inputMode={col.type === "number" || col.type === "money" ? "decimal" : undefined}
                defaultValue={initial}
                placeholder={col.placeholder}
                onBlur={(e) => commit(row, col, parseCellValue(col, e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className={input}
            />
        );
    }

    return (
        <label className={cn("block text-xs font-medium text-muted-foreground", wide && "col-span-2")}>
            {col.label}
            {control}
        </label>
    );
}
