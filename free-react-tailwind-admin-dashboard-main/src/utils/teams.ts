import { app, authentication } from '@microsoft/teams-js';
import { isSessionValid, recordLoginSuccess } from './sessionManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const INIT_TIMEOUT_MS = 4000;

export type TeamsPage = 'home' | 'leave' | 'payslips' | 'attendance' | 'calendar';

let inTeams = false;
let initPromise: Promise<boolean> | null = null;

export const isInTeams = () => inTeams;

const looksEmbedded = () => {
    try {
        return window.self !== window.top || new URLSearchParams(window.location.search).has('inTeams');
    } catch {
        return true;
    }
};

export const initTeams = (): Promise<boolean> => {
    if (initPromise) return initPromise;
    if (!looksEmbedded()) return (initPromise = Promise.resolve(false));
    initPromise = Promise.race([
        app.initialize().then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), INIT_TIMEOUT_MS)),
    ])
        .catch(() => false)
        .then((ok) => {
            inTeams = ok;
            if (ok) {
                document.documentElement.classList.add('in-teams');
                sessionStorage.setItem('hrms_in_teams', '1');
            }
            return ok;
        });
    return initPromise;
};

const storeLoginResponse = (data: any) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_id', data.id);
    localStorage.setItem('username', data.username);
    localStorage.setItem('is_reporting_manager', data.is_reporting_manager ? 'true' : 'false');
    if (data.username && String(data.username).includes('@')) localStorage.setItem('user_email', String(data.username));
    if (data.first_name !== undefined) localStorage.setItem('first_name', data.first_name || '');
    if (data.last_name !== undefined) localStorage.setItem('last_name', data.last_name || '');
    if (data.ms_access_token) {
        localStorage.setItem('ms_calendar_token', data.ms_access_token);
        if (data.ms_refresh_token) localStorage.setItem('ms_refresh_token', data.ms_refresh_token);
    }
    recordLoginSuccess(true);
};

/** Silent sign-in with the Teams account. Throws with a readable message on failure. */
export const teamsSignIn = async (): Promise<void> => {
    let token: string;
    try {
        token = await authentication.getAuthToken();
    } catch (e: any) {
        throw new Error(`Teams could not provide a sign-in token (${e?.message || e}).`);
    }
    const res = await fetch(`${API_BASE_URL}/app/teams-sso/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'HRMS sign-in from Teams failed.');
    storeLoginResponse(data);
};

const hasSession = () => !!localStorage.getItem('access_token') && isSessionValid();

const interceptExternalLinks = () => {
    document.addEventListener(
        'click',
        (e) => {
            const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!a || a.target !== '_blank') return;
            const url = new URL(a.href, window.location.href);
            if (url.origin === window.location.origin) return;
            e.preventDefault();
            app.openLink(url.href).catch(() => window.open(url.href, '_blank', 'noopener'));
        },
        true
    );
};

/**
 * Runs before the React app renders. Outside Teams it is a no-op.
 * Inside Teams: signs in silently, syncs the Teams theme and opens external links via Teams.
 */
export const bootstrapTeams = async (onTheme: (dark: boolean) => void): Promise<void> => {
    if (!(await initTeams())) return;
    interceptExternalLinks();
    try {
        const ctx = await app.getContext();
        onTheme(!!ctx.app.theme && ctx.app.theme !== 'default');
        app.registerOnThemeChangeHandler((t) => onTheme(t !== 'default'));
    } catch {}
    if (!hasSession()) {
        try {
            await teamsSignIn();
            sessionStorage.removeItem('teams_sso_error');
        } catch (e: any) {
            sessionStorage.setItem('teams_sso_error', e?.message || 'Sign-in failed');
        }
    }
    app.notifySuccess();
};

export const landingPath = (page: TeamsPage, role: string | null): string => {
    if (role === 'employee') {
        return {
            home: '/employee/hub',
            leave: '/employee/leave-application',
            payslips: '/employee/my-payslips',
            attendance: '/employee/attendance-history',
            calendar: '/employee/calendar',
        }[page];
    }
    if (role === 'admin') {
        return {
            home: '/admin/hub',
            leave: '/admin/leave-approval',
            payslips: '/admin/hub',
            attendance: '/admin/attendance-logs',
            calendar: '/admin/calendar',
        }[page];
    }
    return role === 'master' ? '/master/dashboard' : '/auth/boxed-signin';
};
