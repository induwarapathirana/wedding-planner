/**
 * Format large numbers with K, M abbreviations
 * Examples: 1000 -> 1K, 1500 -> 1.5K, 1000000 -> 1M
 */
export function formatLargeNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
    }
    return num.toString();
}

/**
 * Get responsive font size class based on number size
 */
export function getNumberFontSize(num: number): string {
    const numString = num.toString();
    if (numString.length >= 8) return 'text-xl md:text-2xl';
    if (numString.length >= 6) return 'text-2xl md:text-3xl';
    return 'text-3xl md:text-4xl';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
