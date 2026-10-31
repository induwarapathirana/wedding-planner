/**
 * The wedding being worked on travels in the URL as ?weddingId=, so links can be
 * shared and planners can switch clients cleanly. The last one used is also kept
 * on this device for pages opened without it.
 */
const KEY = "current_wedding_id";

export function storedWeddingId(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function rememberWedding(id: string) {
    try {
        localStorage.setItem(KEY, id);
    } catch {}
}

export function forgetWedding() {
    try {
        localStorage.removeItem(KEY);
    } catch {}
}

/** The wedding in the current URL, else the last one used on this device. */
export function currentWeddingId(): string | null {
    return new URLSearchParams(window.location.search).get("weddingId") || storedWeddingId();
}

/** Add (or replace) ?weddingId= on a link. */
export function withWedding(href: string, weddingId?: string | null): string {
    if (!weddingId) return href;
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("weddingId", weddingId);
    return `${path}?${params}`;
}
