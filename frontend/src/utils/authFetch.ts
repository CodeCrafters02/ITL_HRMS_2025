const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REFRESH_URL = `${API_BASE_URL}/app/token/refresh/`;
const LOGIN_ROUTE = '/auth/boxed-signin';

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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('user_email');
    localStorage.removeItem('first_name');
    localStorage.removeItem('last_name');
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

const refreshAccessToken = async (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) {
            clearAuthStorage();
            return null;
        }

        try {
            const res = await fetch(REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
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
            clearAuthStorage();
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const currentToken = localStorage.getItem('access_token');
    const expiresAtMs = decodeJwtExpiryMs(currentToken);
    if (expiresAtMs && Date.now() >= expiresAtMs - 15_000) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            redirectToLogin();
        }
    }

    const firstResponse = await fetch(input, {
        ...init,
        headers: attachAuthHeader(init.headers),
    });

    if (firstResponse.status !== 401) return firstResponse;

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
        redirectToLogin();
        return firstResponse;
    }

    const retryResponse = await fetch(input, {
        ...init,
        headers: attachAuthHeader(init.headers, refreshedToken),
    });

    if (retryResponse.status === 401) {
        clearAuthStorage();
        redirectToLogin();
    }
    return retryResponse;
};
