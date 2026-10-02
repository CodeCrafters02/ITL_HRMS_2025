import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const POLL_MS = 120_000;

export interface OutlookMessage {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    received_at: string;
    is_read: boolean;
    preview: string;
    web_link: string;
    has_attachments: boolean;
    importance: string;
}

export interface OutlookInbox {
    connected: boolean;
    reason?: string;
    unread_count: number;
    total_count?: number;
    messages: OutlookMessage[];
    inbox_url?: string;
}

type State = { data: OutlookInbox | null; loading: boolean; error: string };

let state: State = { data: null, loading: false, error: '' };
let lastFetch = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(s: State) => void>();
const emit = (patch: Partial<State>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l(state));
};

export const refreshOutlookInbox = (force = false): Promise<void> => {
    if (inFlight) return inFlight;
    if (!force && state.data && Date.now() - lastFetch < POLL_MS / 2) return Promise.resolve();
    emit({ loading: true });
    inFlight = (async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/app/outlook/mail/?top=15`);
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.detail || 'Could not load Outlook mail');
            lastFetch = Date.now();
            emit({ data: body, error: '', loading: false });
        } catch (e: any) {
            emit({ error: e?.message || 'Could not load Outlook mail', loading: false });
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
};

export const useOutlookInbox = () => {
    const [s, setS] = useState<State>(state);
    useEffect(() => {
        listeners.add(setS);
        refreshOutlookInbox();
        const t = window.setInterval(() => document.visibilityState === 'visible' && refreshOutlookInbox(true), POLL_MS);
        return () => {
            listeners.delete(setS);
            window.clearInterval(t);
        };
    }, []);
    const refresh = useCallback(() => refreshOutlookInbox(true), []);
    return { ...s, refresh };
};

export const formatMailTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.toDateString() === now.toDateString()
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};
