/**
 * Company brand theme.
 * A theme is three colours: primary (buttons, links, active states), mid (gradient middle) and accent (gradient end).
 * Everything else (the 50–950 shade scale, tints, ring colours) is derived from them and exposed as CSS variables
 * that Tailwind reads (see tailwind.config.cjs → `brand-*` and `primary`).
 */

export interface BrandTheme {
    key: string;
    name: string;
    primary: string; // #rrggbb
    mid: string;
    accent: string;
}

export const DEFAULT_THEME: BrandTheme = { key: 'default', name: 'Innovyx Blue (Default)', primary: '#0062E0', mid: '#2563eb', accent: '#38bdf8' };

// Every preset's primary has ≥ 4.5:1 contrast against white so button text stays readable.
export const PRESET_THEMES: BrandTheme[] = [
    DEFAULT_THEME,
    { key: 'emerald', name: 'Emerald Forest', primary: '#047857', mid: '#059669', accent: '#34d399' },
    { key: 'indigo', name: 'Royal Indigo', primary: '#4338ca', mid: '#4f46e5', accent: '#818cf8' },
    { key: 'sunset', name: 'Sunset Orange', primary: '#c2410c', mid: '#ea580c', accent: '#fbbf24' },
    { key: 'rose', name: 'Rose Quartz', primary: '#be123c', mid: '#e11d48', accent: '#fb7185' },
    { key: 'teal', name: 'Ocean Teal', primary: '#0f766e', mid: '#0d9488', accent: '#5eead4' },
    { key: 'violet', name: 'Violet Dream', primary: '#6d28d9', mid: '#7c3aed', accent: '#c084fc' },
    { key: 'crimson', name: 'Crimson & Gold', primary: '#b91c1c', mid: '#dc2626', accent: '#f59e0b' },
    { key: 'navy', name: 'Midnight Navy', primary: '#1e3a8a', mid: '#1d4ed8', accent: '#60a5fa' },
    { key: 'slate', name: 'Slate Pro', primary: '#334155', mid: '#475569', accent: '#94a3b8' },
];

/* ───────────── colour maths ───────────── */

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const lum = ([r, g, b]: [number, number, number]) => {
    const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** WCAG contrast ratio of a colour against white. */
export const contrastOnWhite = (hex: string) => 1.05 / (lum(hexToRgb(hex)) + 0.05);

/** Darkens a colour until white text on it reaches the target contrast (default AA 4.5). */
export const ensureContrast = (hex: string, target = 4.5): string => {
    let rgb = hexToRgb(hex);
    for (let i = 0; i < 40 && 1.05 / (lum(rgb) + 0.05) < target; i++) rgb = mix(rgb, [0, 0, 0], 0.06);
    return rgbToHex(...rgb);
};

const hslToHex = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
};

/** A pleasant random combination: a readable primary plus a harmonious mid/accent from nearby hues. */
export const randomTheme = (): BrandTheme => {
    const h = Math.floor(Math.random() * 360);
    const shift = 18 + Math.floor(Math.random() * 30);
    return {
        key: 'custom',
        name: 'Random combination',
        primary: ensureContrast(hslToHex(h, 62 + Math.random() * 18, 36 + Math.random() * 8)),
        mid: hslToHex((h + shift / 2) % 360, 72, 48),
        accent: hslToHex((h + shift + 20) % 360, 80, 66),
    };
};

/** Builds a custom theme from one chosen colour. */
export const themeFromPrimary = (hex: string): BrandTheme => {
    const p = ensureContrast(hex);
    const [r, g, b] = hexToRgb(p);
    const lighten = (t: number) => rgbToHex(...mix([r, g, b], [255, 255, 255], t));
    return { key: 'custom', name: 'Custom colour', primary: p, mid: lighten(0.18), accent: lighten(0.5) };
};

/* ───────────── CSS variables ───────────── */

const triplet = (rgb: [number, number, number]) => rgb.map((x) => Math.round(x)).join(' ');
const W: [number, number, number] = [255, 255, 255];
const K: [number, number, number] = [0, 0, 0];

/** All CSS custom properties for a theme (values are space-separated RGB triplets for `rgb(var(--x) / <alpha>)`). */
export const themeVars = (t: BrandTheme): Record<string, string> => {
    const p = hexToRgb(t.primary);
    const v: Record<string, string> = {
        '--brand': triplet(p),
        '--brand-mid': triplet(hexToRgb(t.mid)),
        '--brand-accent': triplet(hexToRgb(t.accent)),
        '--brand-50': triplet(mix(p, W, 0.92)),
        '--brand-100': triplet(mix(p, W, 0.84)),
        '--brand-200': triplet(mix(p, W, 0.68)),
        '--brand-300': triplet(mix(p, W, 0.5)),
        '--brand-400': triplet(mix(p, W, 0.28)),
        '--brand-500': triplet(mix(p, W, 0.12)),
        '--brand-600': triplet(p),
        '--brand-700': triplet(mix(p, K, 0.15)),
        '--brand-800': triplet(mix(p, K, 0.3)),
        '--brand-900': triplet(mix(p, K, 0.45)),
        '--brand-950': triplet(mix(p, K, 0.6)),
    };
    // legacy Tailwind `primary` (btn-primary, text-primary, …) follows the brand
    v['--primary'] = v['--brand'];
    v['--primary-light'] = v['--brand-50'];
    return v;
};

const CACHE_KEY = 'company_theme_vars';

export const applyTheme = (t: BrandTheme | null | undefined) => {
    const root = document.documentElement;
    const vars = t && t.key !== 'default' ? themeVars(t) : null;
    ['--brand', '--brand-mid', '--brand-accent', '--brand-50', '--brand-100', '--brand-200', '--brand-300', '--brand-400', '--brand-500', '--brand-600', '--brand-700', '--brand-800', '--brand-900', '--brand-950', '--primary', '--primary-light'].forEach((k) => root.style.removeProperty(k));
    if (vars) {
        Object.entries(vars).forEach(([k, val]) => root.style.setProperty(k, val));
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(vars));
        } catch {
            /* storage unavailable */
        }
    } else {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch {
            /* storage unavailable */
        }
    }
};

/** Theme as the API stores it → BrandTheme (null/invalid → default). */
export const themeFromApi = (d: { theme_preset?: string | null; theme_primary?: string | null; theme_mid?: string | null; theme_accent?: string | null } | null | undefined): BrandTheme => {
    if (!d || !isHex(d.theme_primary)) return DEFAULT_THEME;
    const preset = PRESET_THEMES.find((p) => p.key === d.theme_preset);
    return {
        key: preset ? preset.key : 'custom',
        name: preset ? preset.name : 'Custom colour',
        primary: d.theme_primary!,
        mid: isHex(d.theme_mid) ? d.theme_mid! : d.theme_primary!,
        accent: isHex(d.theme_accent) ? d.theme_accent! : d.theme_primary!,
    };
};

/** Theme → payload fields for the API (default theme clears the stored values). */
export const themeToApi = (t: BrandTheme) =>
    t.key === 'default' ? { theme_preset: '', theme_primary: '', theme_mid: '', theme_accent: '' } : { theme_preset: t.key === 'custom' ? '' : t.key, theme_primary: t.primary, theme_mid: t.mid, theme_accent: t.accent };
