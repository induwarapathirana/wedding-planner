export const cookieStorage = {
    getItem: (key: string): string | null => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
        if (match) return decodeURIComponent(match[2]);
        return null;
    },
    setItem: (key: string, value: string): void => {
        if (typeof document === 'undefined') return;
        // Set cookie for 1 year, root path, SameSite=Lax (safe for Auth)
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    },
    removeItem: (key: string): void => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    }
};
