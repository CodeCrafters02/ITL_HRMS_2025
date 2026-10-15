/** Current theme colours as hex, for chart libraries and canvas code that cannot use Tailwind classes. Call at render time. */
type Token = 'brand' | 'mid' | 'accent' | 'dark';

const FALLBACK: Record<Token, string> = { brand: '#0062e0', mid: '#2563eb', accent: '#38bdf8', dark: '#0053be' };
const VAR: Record<Token, string> = { brand: '--brand', mid: '--brand-mid', accent: '--brand-accent', dark: '--brand-700' };

const toHex = (rgb: string): string | null => {
    const parts = rgb.trim().split(/[\s,]+/).map(Number);
    return parts.length >= 3 && parts.every((n) => Number.isFinite(n)) ? '#' + parts.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('') : null;
};

export const brandHex = (token: Token = 'brand'): string => {
    try {
        return toHex(getComputedStyle(document.documentElement).getPropertyValue(VAR[token])) || FALLBACK[token];
    } catch {
        return FALLBACK[token];
    }
};
