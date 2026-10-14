import { useSyncExternalStore } from 'react';
import { applyTheme, BrandTheme, DEFAULT_THEME, themeFromApi } from './brandTheme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface Branding {
    name: string;
    logoUrl: string | null;
    theme: BrandTheme;
    loaded: boolean;
}

let state: Branding = {
    name: (() => {
        try {
            return localStorage.getItem('company_name') || '';
        } catch {
            return '';
        }
    })(),
    logoUrl: null,
    theme: DEFAULT_THEME,
    loaded: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: Partial<Branding>) => {
    state = { ...state, ...next };
    emit();
};

const abs = (u?: string | null) => (u ? (/^https?:\/\//i.test(u) ? u : `${API_BASE_URL}${u.startsWith('/') ? '' : '/'}${u}`) : null);

const absorb = (d: any) => {
    const theme = themeFromApi(d);
    applyTheme(theme);
    try {
        if (d?.name) localStorage.setItem('company_name', d.name);
    } catch {
        /* storage unavailable */
    }
    set({ name: d?.name || state.name, logoUrl: abs(d?.logo_url), theme, loaded: true });
};

const authHeader = (): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Loads the company's name, logo and theme and applies the theme app-wide. Safe to call repeatedly. */
export const loadBranding = async () => {
    if (!localStorage.getItem('access_token')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/app/company-branding/`, { headers: authHeader() });
        if (res.ok) absorb(await res.json());
    } catch {
        /* branding is optional – keep whatever is cached */
    }
};

export interface BrandingUpdate {
    name?: string;
    logo?: File | null;
    removeLogo?: boolean;
    theme?: Record<string, string>; // theme_preset / theme_primary / theme_mid / theme_accent
}

/** Admin only. Throws an Error whose message lists the validation problems. */
export const saveBranding = async (u: BrandingUpdate) => {
    const body = new FormData();
    if (u.name !== undefined) body.append('name', u.name);
    if (u.logo) body.append('logo', u.logo);
    if (u.removeLogo) body.append('remove_logo', 'true');
    Object.entries(u.theme || {}).forEach(([k, v]) => body.append(k, v));
    const res = await fetch(`${API_BASE_URL}/app/company-branding/`, { method: 'PATCH', headers: authHeader(), body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = Object.values(data as Record<string, any>).flat().join(' ') || 'Could not save branding.';
        throw new Error(msg);
    }
    absorb(data);
    return data;
};

export const useBranding = (): Branding =>
    useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => state
    );
