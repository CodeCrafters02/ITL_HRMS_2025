import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const GOOGLE_CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

type CompanyCalEvent = {
    id: number;
    name: string;
    date: string;
    description?: string;
    is_holiday?: boolean;
};

type GCalItem = {
    id: string;
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
};

export function oauthStorageKey() {
    const u = localStorage.getItem('username') || 'anon';
    return `google_calendar_oauth_${u}`;
}

function readStoredAccessToken(): string | null {
    try {
        const raw = sessionStorage.getItem(oauthStorageKey());
        if (!raw) return null;
        const p = JSON.parse(raw) as { access_token: string; expires_at: number };
        if (p.expires_at && Date.now() > p.expires_at - 60_000) {
            sessionStorage.removeItem(oauthStorageKey());
            return null;
        }
        return p.access_token || null;
    } catch {
        return null;
    }
}

function writeStoredAccessToken(access_token: string, expires_in?: number) {
    const ttlMs = (expires_in ?? 3600) * 1000;
    const expires_at = Date.now() + ttlMs;
    sessionStorage.setItem(oauthStorageKey(), JSON.stringify({ access_token, expires_at }));
}

async function fetchGoogleEvents(accessToken: string, rangeStart: Date, rangeEnd: Date): Promise<GCalItem[]> {
    const params = new URLSearchParams({
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '500',
    });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
        const e = new Error('Session expired — connect Google Calendar again.');
        (e as Error & { code?: number }).code = 401;
        throw e;
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || res.statusText || 'Google Calendar request failed';
        throw new Error(msg);
    }
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
}

function mapGoogleToFc(ev: GCalItem) {
    const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
    const start = ev.start?.dateTime || ev.start?.date;
    const endRaw = ev.end?.dateTime || ev.end?.date;
    if (!start) return null;
    return {
        id: `g-${ev.id}`,
        title: ev.summary || '(No title)',
        start,
        end: endRaw || start,
        allDay,
        className: 'info',
        extendedProps: { source: 'google' as const, description: ev.description || '' },
    };
}

export type CompanyGoogleCalendarProps = {
    /** Full admin page with hero banner, or compact block for employee dashboard */
    variant?: 'page' | 'embedded';
};

const CompanyGoogleCalendar = ({ variant = 'page' }: CompanyGoogleCalendarProps) => {
    const [companyEvents, setCompanyEvents] = useState<CompanyCalEvent[]>([]);
    const [googleFcEvents, setGoogleFcEvents] = useState<any[]>([]);
    const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
    const [googleToken, setGoogleToken] = useState<string | null>(() => readStoredAccessToken());
    const [loadingCompany, setLoadingCompany] = useState(true);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);

    const userEmail = localStorage.getItem('user_email') || localStorage.getItem('username') || '';
    const embedded = variant === 'embedded';

    const headers = useCallback((): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingCompany(true);
            try {
                const res = await fetch(`${API_BASE_URL}/app/calendar-events/`, { headers: headers() });
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(data?.detail || 'Failed to load company calendar');
                const list = Array.isArray(data) ? data : data?.results || [];
                if (!cancelled) setCompanyEvents(list);
            } catch (e: any) {
                if (!cancelled) {
                    if (embedded) {
                        setCompanyEvents([]);
                    } else {
                        Swal.fire('Error', e?.message || 'Company calendar failed', 'error');
                    }
                }
            } finally {
                if (!cancelled) setLoadingCompany(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [headers, embedded]);

    const googleLogin = useGoogleLogin({
        scope: GOOGLE_CAL_SCOPE,
        onSuccess: (tokenResponse) => {
            const exp = (tokenResponse as { expires_in?: number }).expires_in;
            writeStoredAccessToken(tokenResponse.access_token, exp);
            setGoogleToken(tokenResponse.access_token);
            setGoogleError(null);
        },
        onError: () => {
            Swal.fire('Google', 'Could not authorize Google Calendar. Check API & OAuth settings.', 'error');
        },
    });

    useEffect(() => {
        setGoogleToken(readStoredAccessToken());
    }, [userEmail]);

    useEffect(() => {
        if (!visibleRange || !googleToken) {
            setGoogleFcEvents([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingGoogle(true);
            setGoogleError(null);
            try {
                const items = await fetchGoogleEvents(googleToken, visibleRange.start, visibleRange.end);
                if (cancelled) return;
                const mapped = items.map(mapGoogleToFc).filter(Boolean);
                setGoogleFcEvents(mapped);
            } catch (e: any) {
                if (!cancelled) {
                    setGoogleFcEvents([]);
                    setGoogleError(e?.message || 'Google Calendar failed');
                    if (e?.code === 401) {
                        sessionStorage.removeItem(oauthStorageKey());
                        setGoogleToken(null);
                    }
                }
            } finally {
                if (!cancelled) setLoadingGoogle(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [visibleRange, googleToken]);

    const companyFcEvents = useMemo(() => {
        if (!visibleRange) return [];
        const start = visibleRange.start;
        const end = visibleRange.end;
        return companyEvents
            .filter((e) => {
                const d = new Date(e.date + 'T12:00:00');
                return d >= start && d <= end;
            })
            .map((e) => ({
                id: `c-${e.id}`,
                title: e.name,
                start: e.date,
                allDay: true,
                className: e.is_holiday ? 'danger' : 'success',
                extendedProps: { source: 'company' as const, description: e.description || '' },
            }));
    }, [companyEvents, visibleRange]);

    const mergedEvents = useMemo(() => [...companyFcEvents, ...googleFcEvents], [companyFcEvents, googleFcEvents]);

    const disconnectGoogle = () => {
        sessionStorage.removeItem(oauthStorageKey());
        setGoogleToken(null);
        setGoogleFcEvents([]);
        setGoogleError(null);
    };

    const onEventClick = (info: any) => {
        const src = info.event?.extendedProps?.source;
        const desc = info.event?.extendedProps?.description || '';
        const title = info.event?.title || 'Event';
        if (src === 'google') {
            Swal.fire({
                title,
                text: desc || 'Google Calendar event',
                icon: 'info',
            });
        } else {
            Swal.fire({ title, text: desc || 'Company calendar', icon: 'info' });
        }
    };

    const panelInner = (
        <>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#e7515a]/80" />
                        <span>Company holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#00ab55]/80" />
                        <span>Company event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#2196f3]/80" />
                        <span>Your Google Calendar</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {userEmail && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]" title={userEmail}>
                            Signed in as <strong className="text-gray-700 dark:text-gray-300">{userEmail}</strong>
                        </span>
                    )}
                    {googleToken ? (
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={disconnectGoogle}>
                            Disconnect Google Calendar
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => googleLogin()}>
                            Connect Google Calendar
                        </button>
                    )}
                </div>
            </div>

            {!googleToken && (
                <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90">
                    Sign in with Google uses your profile only. To <strong>load your Gmail calendar</strong>, click &quot;Connect Google
                    Calendar&quot; once — choose the <strong>same Google account</strong> as your login. Requires Google Calendar API enabled
                    and the calendar scope on your OAuth client (see Google Cloud Console).
                </div>
            )}

            {googleError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                    {googleError}
                </div>
            )}

            {(loadingCompany || loadingGoogle) && (
                <div className="text-xs text-gray-500 mb-2">{loadingGoogle ? 'Loading Google Calendar…' : 'Loading…'}</div>
            )}

            <div className="calendar-wrapper">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height={embedded ? 480 : 'auto'}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: embedded ? 'dayGridMonth,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    editable={false}
                    selectable={false}
                    dayMaxEvents
                    events={mergedEvents}
                    datesSet={(arg) => {
                        setVisibleRange({ start: arg.start, end: arg.end });
                    }}
                    eventClick={onEventClick}
                />
            </div>
        </>
    );

    if (embedded) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#1b2e4b] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-[#191e3a] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#191e3a] bg-[#fbfbfb] dark:bg-[#121c2c]">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Calendar</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Company holidays and your Google Calendar (connect with the same account as Google sign-in).
                    </p>
                </div>
                <div className="p-4 sm:p-6">{panelInner}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0e1726] to-[#4361ee] p-6 rounded-xl shadow-lg">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Calendar</h1>
                <p className="text-white/80 mt-1 text-sm">
                    Company holidays and events, plus your Google Calendar when you connect the same account you use with Google sign-in.
                </p>
            </div>

            <div className="panel">{panelInner}</div>
        </div>
    );
};

export default CompanyGoogleCalendar;
