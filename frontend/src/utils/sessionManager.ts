/**
 * sessionManager.ts
 * Coordinates multi-tab session persistence and 30-day "Remember Me" authentication.
 */

const REMEMBER_ME_DAYS = 30;
const REMEMBER_ME_MS = REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
const TAB_HEARTBEAT_INTERVAL = 1500;
const TAB_TIMEOUT_MS = 30000; // 30 seconds threshold for cross-tab activity

let heartbeatInterval: any = null;
let sessionChannel: BroadcastChannel | null = null;

// Unique ID for current browser tab (kept in sessionStorage, preserved across reloads of this tab)
export const getTabId = (): string => {
    let tabId = sessionStorage.getItem('hrms_tab_id');
    if (!tabId) {
        tabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        sessionStorage.setItem('hrms_tab_id', tabId);
    }
    return tabId;
};

// Check if 30-day Remember Me is currently valid
export const isRememberMeValid = (): boolean => {
    const remember = localStorage.getItem('remember_me') === 'true';
    if (!remember) return false;
    const expiry = Number(localStorage.getItem('remember_me_expiry') || '0');
    if (expiry && Date.now() < expiry) {
        return true;
    }
    // Expired
    localStorage.removeItem('remember_me');
    localStorage.removeItem('remember_me_expiry');
    return false;
};

// Touch heartbeat to signal that at least one tab is active
export const touchHeartbeat = () => {
    try {
        localStorage.setItem('hrms_tab_heartbeat', String(Date.now()));
    } catch {}
};

// Check if any tab has updated heartbeat in the last TAB_TIMEOUT_MS
export const isAnyTabHeartbeatFresh = (): boolean => {
    try {
        const last = Number(localStorage.getItem('hrms_tab_heartbeat') || '0');
        return Date.now() - last < TAB_TIMEOUT_MS;
    } catch {
        return false;
    }
};

// Check if current session is valid
export const isSessionValid = (): boolean => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    // 1. If 30-day Remember Me is active, session is unconditionally valid
    if (isRememberMeValid()) {
        return true;
    }

    // 2. If this tab has already verified its session (preserved across reloads and in-tab navigation)
    if (sessionStorage.getItem('tab_session_active') === 'true') {
        touchHeartbeat();
        return true;
    }

    // 3. If session cookie is present (shared across all tabs in browser session)
    if (document.cookie.includes('session_active=true')) {
        sessionStorage.setItem('tab_session_active', 'true');
        touchHeartbeat();
        return true;
    }

    // 4. If any other tab is active recently (fresh heartbeat)
    if (isAnyTabHeartbeatFresh()) {
        sessionStorage.setItem('tab_session_active', 'true');
        touchHeartbeat();
        return true;
    }

    // Otherwise, all tabs were closed and remember me was not chosen
    return false;
};

// Register this tab and start heartbeat tracking
export const initTabSession = () => {
    getTabId();
    sessionStorage.setItem('tab_session_active', 'true');
    touchHeartbeat();

    // Ensure session cookie exists for multi-tab persistence
    if (!document.cookie.includes('session_active=true')) {
        const remember = isRememberMeValid();
        if (remember) {
            document.cookie = `session_active=true; max-age=${REMEMBER_ME_DAYS * 24 * 60 * 60}; path=/; SameSite=Lax`;
        } else {
            document.cookie = 'session_active=true; path=/; SameSite=Lax';
        }
    }

    if (!heartbeatInterval) {
        heartbeatInterval = setInterval(touchHeartbeat, TAB_HEARTBEAT_INTERVAL);
    }

    // User activity also touches heartbeat
    const onUserActivity = () => touchHeartbeat();
    window.addEventListener('focus', onUserActivity);
    window.addEventListener('click', onUserActivity);
    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);

    // BroadcastChannel sync across tabs for instant logout
    try {
        if (!sessionChannel) {
            sessionChannel = new BroadcastChannel('hrms_session_sync');
            sessionChannel.onmessage = (e) => {
                if (e.data?.type === 'LOGOUT') {
                    clearAllSessionData();
                    window.location.replace('/auth/boxed-signin');
                }
            };
        }
    } catch {}
};

// Record successful login (sets 30-day expiry if rememberMe is true, else session cookie)
export const recordLoginSuccess = (rememberMe: boolean) => {
    sessionStorage.setItem('tab_session_active', 'true');

    if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        const expiry = Date.now() + REMEMBER_ME_MS;
        localStorage.setItem('remember_me_expiry', String(expiry));
        document.cookie = `session_active=true; max-age=${REMEMBER_ME_DAYS * 24 * 60 * 60}; path=/; SameSite=Lax`;
    } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('remember_me_expiry');
        document.cookie = 'session_active=true; path=/; SameSite=Lax';
    }

    initTabSession();
};

// Explicit user logout
export const clearAllSessionData = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    [
        'access_token',
        'refresh_token',
        'user_role',
        'user_id',
        'username',
        'is_reporting_manager',
        'user_email',
        'first_name',
        'last_name',
        'remember_me',
        'remember_me_expiry',
        'hrms_tab_heartbeat',
    ].forEach((k) => localStorage.removeItem(k));

    sessionStorage.removeItem('tab_session_active');
    document.cookie = 'session_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    try {
        sessionChannel?.postMessage({ type: 'LOGOUT' });
    } catch {}
};
