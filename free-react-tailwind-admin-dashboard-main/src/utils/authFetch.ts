import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearAllSessionData } from './sessionManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REFRESH_URL = `${API_BASE_URL}/app/token/refresh/`;
const LOGIN_ROUTE = '/auth/boxed-signin';

// Native fetch captured before the global interceptor is installed.
const rawFetch: typeof fetch = window.fetch.bind(window);

let refreshInFlight: Promise<string | null> | null = null;

const decodeJwtExpiryMs = (token: string | null): number | null => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded)) as { exp?: number };
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

const clearAuthStorage = () => {
    clearAllSessionData();
};

const redirectToLogin = () => {
    if (window.location.pathname === LOGIN_ROUTE) return;
    window.location.assign(LOGIN_ROUTE);
};

const attachAuthHeader = (headers?: HeadersInit, token?: string | null): Headers => {
    const finalHeaders = new Headers(headers);
    const bearer = token ?? localStorage.getItem('access_token');
    if (bearer && !finalHeaders.has('Authorization')) {
        finalHeaders.set('Authorization', `Bearer ${bearer}`);
    }
    return finalHeaders;
};

/**
 * Returns a new access token, or null. Storage is wiped only when the server
 * rejects the refresh token — a network blip (offline, laptop just woke up)
 * must not log the user out.
 */
const refreshAccessToken = async (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
            clearAuthStorage();
            return null;
        }
        const refreshExp = decodeJwtExpiryMs(refresh);
        if (refreshExp && Date.now() >= refreshExp) {
            clearAuthStorage();
            return null;
        }

        try {
            const res = await rawFetch(REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (res.status >= 500) return null;
            const data = await res.json().catch(() => ({}));
            const nextAccess = typeof data?.access === 'string' ? data.access : null;
            const nextRefresh = typeof data?.refresh === 'string' ? data.refresh : null;
            if (!res.ok || !nextAccess) {
                clearAuthStorage();
                return null;
            }

            localStorage.setItem('access_token', nextAccess);
            if (nextRefresh) localStorage.setItem('refresh_token', nextRefresh);
            return nextAccess;
        } catch {
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
};

const isExpiring = (token: string | null) => {
    const exp = decodeJwtExpiryMs(token);
    return !!exp && Date.now() >= exp - 15_000;
};

/** Refreshes the access token ahead of time when it is (about to be) expired. */
const ensureFreshToken = async (): Promise<string | null> => {
    const current = localStorage.getItem('access_token');
    if (!current) return null;
    if (!isExpiring(current)) return current;
    return (await refreshAccessToken()) ?? localStorage.getItem('access_token');
};

const handleAuthLost = () => {
    if (!localStorage.getItem('refresh_token')) redirectToLogin();
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    await ensureFreshToken();
    handleAuthLost();

    const firstResponse = await rawFetch(input, {
        ...init,
        headers: attachAuthHeader(init.headers),
    });

    if (firstResponse.status !== 401) return firstResponse;

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
        handleAuthLost();
        return firstResponse;
    }

    const retryResponse = await rawFetch(input, {
        ...init,
        headers: attachAuthHeader(init.headers, refreshedToken),
    });

    if (retryResponse.status === 401) {
        clearAuthStorage();
        redirectToLogin();
    }
    return retryResponse;
};

const urlOf = (input: RequestInfo | URL): string =>
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

const isApiCall = (url: string) => url.startsWith(API_BASE_URL) && !url.startsWith(REFRESH_URL);

let installed = false;

/**
 * Many pages call plain `fetch`/`axios` with `Authorization: Bearer <token>` read from
 * localStorage, so they never refresh the 1-day access token. This patches both globally:
 * refresh before sending when expired, and retry once on 401 — keeping the user signed in
 * for the full refresh-token lifetime (30 days).
 */
export const installAuthInterceptors = () => {
    if (installed) return;
    installed = true;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = urlOf(input);
        const baseHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!isApiCall(url) || !(baseHeaders.get('Authorization') || '').startsWith('Bearer')) {
            return rawFetch(input, init);
        }

        const retryable = input instanceof Request ? input.clone() : input;
        const send = (req: RequestInfo | URL, token: string | null) => {
            const headers = new Headers(baseHeaders);
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return rawFetch(req, { ...init, headers });
        };

        const res = await send(input, await ensureFreshToken());
        if (res.status !== 401) return res;

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            handleAuthLost();
            return res;
        }
        return send(retryable, refreshed);
    };

    axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
        const url = axios.getUri(config);
        const auth = String(config.headers?.get?.('Authorization') ?? config.headers?.Authorization ?? '');
        if (isApiCall(url) && auth.startsWith('Bearer')) {
            const token = await ensureFreshToken();
            if (token) config.headers.set('Authorization', `Bearer ${token}`);
        }
        return config;
    });

    axios.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as (InternalAxiosRequestConfig & { _authRetried?: boolean }) | undefined;
        if (!config || error.response?.status !== 401 || config._authRetried || !isApiCall(axios.getUri(config))) {
            throw error;
        }
        const auth = String(config.headers?.get?.('Authorization') ?? '');
        if (!auth.startsWith('Bearer')) throw error;

        config._authRetried = true;
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            handleAuthLost();
            throw error;
        }
        config.headers.set('Authorization', `Bearer ${refreshed}`);
        return axios.request(config);
    });
};
