import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { authFetch } from '../../utils/authFetch';
import IconMicrosoft from '../Icon/IconMicrosoft';
import IconVideo from '../Icon/IconVideo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

function calendarTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

function defaultVisibleRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
    return { start, end };
}

function extractEmailAddressesFromText(raw: string): string[] {
    if (!raw?.trim()) return [];
    const re = /\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}\b/g;
    const seen = new Set<string>();
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
        const s = m[0].toLowerCase();
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

function formatMicrosoftApiError(status: number, errBody: any): string {
    const msg = errBody?.error?.message || `HTTP ${status}`;
    const code = errBody?.error?.code;
    return code ? `${msg} (${code})` : msg;
}

// ─────────────────────────────────────────────────────────────
// Microsoft Graph API Helpers
// ─────────────────────────────────────────────────────────────

type MsOutlookEvent = {
    id: string;
    subject?: string;
    bodyPreview?: string;
    body?: { contentType?: string; content?: string };
    start?: { dateTime?: string; timeZone?: string };
    end?: { dateTime?: string; timeZone?: string };
    isAllDay?: boolean;
    location?: { displayName?: string };
    webLink?: string;
    isOnlineMeeting?: boolean;
    onlineMeeting?: { joinUrl?: string };
    categories?: string[];
};

async function fetchMicrosoftEvents(accessToken: string, startIso: string, endIso: string): Promise<MsOutlookEvent[]> {
    const tz = calendarTimeZone();
    const url = `${MS_GRAPH_BASE}/me/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$top=250&$select=id,subject,bodyPreview,body,start,end,isAllDay,location,webLink,isOnlineMeeting,onlineMeeting,categories`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: `outlook.timezone="${tz}"`,
        },
    });

    if (res.status === 401) {
        const e = new Error('Session expired — please connect Microsoft Outlook Calendar again.');
        (e as any).code = 401;
        throw e;
    }
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(formatMicrosoftApiError(res.status, errBody));
    }

    const data = await res.json();
    return Array.isArray(data.value) ? data.value : [];
}

async function insertMicrosoftEvent(accessToken: string, body: Record<string, unknown>): Promise<MsOutlookEvent> {
    const tz = calendarTimeZone();
    const res = await fetch(`${MS_GRAPH_BASE}/me/events`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: `outlook.timezone="${tz}"`,
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        const e = new Error('Session expired — please connect Microsoft Outlook Calendar again.');
        (e as any).code = 401;
        throw e;
    }
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const err = new Error(formatMicrosoftApiError(res.status, errBody));
        (err as any).status = res.status;
        (err as any).body = errBody;
        throw err;
    }

    return res.json();
}

async function deleteMicrosoftEvent(accessToken: string, eventId: string): Promise<void> {
    const res = await fetch(`${MS_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
        const e = new Error('Session expired — please connect Microsoft Outlook Calendar again.');
        (e as any).code = 401;
        throw e;
    }
    if (res.status === 204 || res.status === 200 || res.status === 404) return;
    const errBody = await res.json().catch(() => ({}));
    throw new Error(formatMicrosoftApiError(res.status, errBody));
}

async function patchMicrosoftEvent(accessToken: string, eventId: string, body: Record<string, unknown>): Promise<void> {
    const tz = calendarTimeZone();
    const res = await fetch(`${MS_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: `outlook.timezone="${tz}"`,
        },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        const e = new Error('Session expired — please connect Microsoft Outlook Calendar again.');
        (e as any).code = 401;
        throw e;
    }
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(formatMicrosoftApiError(res.status, errBody));
    }
}

// ─────────────────────────────────────────────────────────────
// Company Holiday & Event Definitions
// ─────────────────────────────────────────────────────────────

type CompanyCalEvent = {
    id: number;
    name: string;
    date: string;
    description?: string;
    is_holiday?: boolean;
};

type CompanyGuest = {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
};

const HRMS_HOLIDAY_SYNC_KEY = 'hrms_outlook_company_holiday_map_v1';

type HolidayOutlookSyncEntry = { msEventId: string; fingerprint: string };

function holidaySyncMapStorageKey() {
    const u = localStorage.getItem('username') || 'anon';
    return `${HRMS_HOLIDAY_SYNC_KEY}_${u}`;
}

function readHolidaySyncMap(): Record<string, HolidayOutlookSyncEntry> {
    try {
        const raw = localStorage.getItem(holidaySyncMapStorageKey());
        if (!raw) return {};
        const p = JSON.parse(raw);
        return p && typeof p === 'object' ? p : {};
    } catch {
        return {};
    }
}

function writeHolidaySyncMap(m: Record<string, HolidayOutlookSyncEntry>) {
    localStorage.setItem(holidaySyncMapStorageKey(), JSON.stringify(m));
}

function fingerprintCompanyHoliday(h: CompanyCalEvent): string {
    return `${h.date}|${h.name}|${(h.description || '').trim()}`;
}

function buildCompanyHolidayOutlookBody(h: CompanyCalEvent): Record<string, unknown> {
    const tz = calendarTimeZone();
    const d = new Date(h.date + 'T00:00:00');
    const endD = new Date(d);
    endD.setDate(endD.getDate() + 1);
    const endStr = endD.toISOString().slice(0, 10);

    return {
        subject: `[Company] ${h.name}`,
        body: {
            contentType: 'Text',
            content: [h.description?.trim(), 'Synced from company calendar (HRMS).'].filter(Boolean).join('\n\n'),
        },
        start: { dateTime: `${h.date}T00:00:00`, timeZone: tz },
        end: { dateTime: `${endStr}T00:00:00`, timeZone: tz },
        isAllDay: true,
        categories: ['HRMS Company Holiday'],
    };
}

async function syncCompanyHolidaysToUserOutlook(accessToken: string, holidays: CompanyCalEvent[]): Promise<void> {
    let map = readHolidaySyncMap();
    const currentIds = new Set(holidays.map((h) => String(h.id)));

    for (const idStr of Object.keys(map)) {
        if (!currentIds.has(idStr)) {
            try {
                await deleteMicrosoftEvent(accessToken, map[idStr].msEventId);
            } catch {
                /* already removed or token issue */
            }
            const next = { ...map };
            delete next[idStr];
            map = next;
        }
    }

    for (const h of holidays) {
        const idStr = String(h.id);
        const fp = fingerprintCompanyHoliday(h);
        const body = buildCompanyHolidayOutlookBody(h);
        const existing = map[idStr];
        if (!existing) {
            try {
                const created = await insertMicrosoftEvent(accessToken, body);
                if (created.id) {
                    map = { ...map, [idStr]: { msEventId: created.id, fingerprint: fp } };
                }
            } catch {
                /* ignore */
            }
        } else if (existing.fingerprint !== fp) {
            try {
                await patchMicrosoftEvent(accessToken, existing.msEventId, body);
                map = { ...map, [idStr]: { ...existing, fingerprint: fp } };
            } catch {
                try {
                    const created = await insertMicrosoftEvent(accessToken, body);
                    if (created.id) {
                        map = { ...map, [idStr]: { msEventId: created.id, fingerprint: fp } };
                    }
                } catch {
                    /* ignore */
                }
            }
        }
    }

    writeHolidaySyncMap(map);
}

// ─────────────────────────────────────────────────────────────
// Token Storage & Refresh
// ─────────────────────────────────────────────────────────────

function getStoredMsToken(): string | null {
    return localStorage.getItem('ms_calendar_token') || null;
}

function setStoredMsToken(token: string, refreshToken?: string) {
    localStorage.setItem('ms_calendar_token', token);
    if (refreshToken) {
        localStorage.setItem('ms_refresh_token', refreshToken);
    }
}

function clearStoredMsToken() {
    localStorage.removeItem('ms_calendar_token');
    localStorage.removeItem('ms_refresh_token');
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export type CompanyCalendarProps = {
    variant?: 'page' | 'widget';
};

export const CompanyMicrosoftCalendar = ({ variant = 'page' }: CompanyCalendarProps) => {
    const embedded = variant === 'widget';
    const userRole = localStorage.getItem('user_role') || '';
    const isAdmin = userRole === 'admin' || userRole === 'master';
    const userEmail = localStorage.getItem('user_email') || '';

    const [visibleRange, setVisibleRange] = useState(defaultVisibleRange);
    const [companyEvents, setCompanyEvents] = useState<CompanyCalEvent[]>([]);
    const [loadingCompany, setLoadingCompany] = useState(false);

    const [msToken, setMsToken] = useState<string | null>(getStoredMsToken());
    const [msFcEvents, setMsFcEvents] = useState<any[]>([]);
    const [loadingMs, setLoadingMs] = useState(false);
    const [msError, setMsError] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    // Add Event Modal (Outlook)
    const [addOpen, setAddOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [eventStart, setEventStart] = useState('10:00');
    const [eventEnd, setEventEnd] = useState('11:00');
    const [eventAllDay, setEventAllDay] = useState(false);
    const [eventLocation, setEventLocation] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventWithTeams, setEventWithTeams] = useState(true);
    const [externalEmails, setExternalEmails] = useState('');
    const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
    const [companyGuests, setCompanyGuests] = useState<CompanyGuest[]>([]);
    const [loadingGuests, setLoadingGuests] = useState(false);
    const [saveBusy, setSaveBusy] = useState(false);

    // Admin Add Company Holiday/Event Form
    const [coName, setCoName] = useState('');
    const [coDate, setCoDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [coDesc, setCoDesc] = useState('');
    const [coIsHoliday, setCoIsHoliday] = useState(true);
    const [coSaving, setCoSaving] = useState(false);

    // Admin Excel Import
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importBusy, setImportBusy] = useState(false);

    // ─────────────────────────────────────────────────────────────
    // Fetch Company Events from HRMS
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingCompany(true);
            try {
                const res = await authFetch(`${API_BASE_URL}/app/calendar-events/`);
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(data?.detail || 'Failed to load company calendar');
                const list = Array.isArray(data) ? data : data?.results || [];
                if (!cancelled) setCompanyEvents(list);
            } catch (e: any) {
                if (!cancelled && !embedded) {
                    Swal.fire('Error', e?.message || 'Company calendar failed to load', 'error');
                }
            } finally {
                if (!cancelled) setLoadingCompany(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [embedded]);

    // ─────────────────────────────────────────────────────────────
    // Fetch Company Guests for Event Creation
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!addOpen) return;
        let cancelled = false;
        (async () => {
            setLoadingGuests(true);
            try {
                const res = await authFetch(`${API_BASE_URL}/app/chat/users/`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.detail || 'Failed to load company directory');
                const list: CompanyGuest[] = Array.isArray(data?.results) ? data.results : [];
                if (!cancelled) setCompanyGuests(list);
            } catch {
                if (!cancelled) setCompanyGuests([]);
            } finally {
                if (!cancelled) setLoadingGuests(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [addOpen]);

    // ─────────────────────────────────────────────────────────────
    // Token Refresh Helper
    // ─────────────────────────────────────────────────────────────
    const refreshMsToken = useCallback(async (): Promise<string | null> => {
        const rt = localStorage.getItem('ms_refresh_token');
        if (!rt) return null;
        try {
            const res = await fetch(`${API_BASE_URL}/app/microsoft-calendar-token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'refresh', refresh_token: rt }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access_token) {
                    setStoredMsToken(data.access_token, data.refresh_token);
                    setMsToken(data.access_token);
                    return data.access_token;
                }
            }
        } catch {}
        return null;
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Fetch Microsoft Outlook Calendar Events
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!msToken) {
            setMsFcEvents([]);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoadingMs(true);
            setMsError(null);
            try {
                const startIso = visibleRange.start.toISOString();
                const endIso = visibleRange.end.toISOString();
                let events: MsOutlookEvent[] = [];
                try {
                    events = await fetchMicrosoftEvents(msToken, startIso, endIso);
                } catch (err: any) {
                    if (err?.code === 401) {
                        const newToken = await refreshMsToken();
                        if (newToken && !cancelled) {
                            events = await fetchMicrosoftEvents(newToken, startIso, endIso);
                        } else {
                            throw err;
                        }
                    } else {
                        throw err;
                    }
                }

                if (cancelled) return;

                const mapped = events.map((ev) => {
                    const allDay = !!ev.isAllDay;
                    const start = allDay ? ev.start?.dateTime?.slice(0, 10) : ev.start?.dateTime;
                    const end = allDay ? ev.end?.dateTime?.slice(0, 10) : ev.end?.dateTime;
                    if (!start) return null;

                    return {
                        id: `ms-${ev.id}`,
                        title: ev.subject || '(No title)',
                        start,
                        end: end || start,
                        allDay,
                        className: 'info',
                        extendedProps: {
                            source: 'microsoft' as const,
                            description: ev.bodyPreview || '',
                            location: ev.location?.displayName || '',
                            teamsMeetingLink: ev.onlineMeeting?.joinUrl || '',
                            webLink: ev.webLink || '',
                            msEventId: ev.id,
                            isCompanyHoliday: ev.categories?.includes('HRMS Company Holiday'),
                        },
                    };
                }).filter(Boolean);

                setMsFcEvents(mapped);
            } catch (e: any) {
                if (!cancelled) {
                    setMsFcEvents([]);
                    if (e?.code === 401) {
                        clearStoredMsToken();
                        setMsToken(null);
                    }
                    setMsError(e?.message || 'Microsoft Outlook Calendar sync failed');
                }
            } finally {
                if (!cancelled) setLoadingMs(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [visibleRange, msToken, refreshTick, refreshMsToken]);

    // ─────────────────────────────────────────────────────────────
    // Sync Company Holidays to Outlook
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!msToken || loadingCompany) return;
        const holidayList = companyEvents.filter((e) => e.is_holiday);
        let cancelled = false;
        const timer = window.setTimeout(() => {
            (async () => {
                try {
                    await syncCompanyHolidaysToUserOutlook(msToken, holidayList);
                    if (!cancelled) setRefreshTick((t) => t + 1);
                } catch {}
            })();
        }, 800);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [msToken, companyEvents, loadingCompany]);

    // ─────────────────────────────────────────────────────────────
    // Connect / Disconnect Microsoft Outlook
    // ─────────────────────────────────────────────────────────────
    const handleConnectMicrosoft = async () => {
        try {
            setMsError(null);
            const redirectUri = window.location.origin + '/auth/callback/microsoft';
            const state = 'ms_popup';
            const scopes = 'openid profile email User.Read Calendars.ReadWrite offline_access';

            const res = await fetch(
                `${API_BASE_URL}/app/microsoft-auth-url/?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Swal.fire('Error', err.detail || 'Failed to initialize Microsoft login.', 'error');
                return;
            }

            const data = await res.json();
            if (!data.auth_url) {
                Swal.fire('Error', 'Microsoft authorization URL was not provided.', 'error');
                return;
            }

            const width = 600;
            const height = 720;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            localStorage.removeItem('ms_auth_result');
            localStorage.setItem('ms_auth_in_progress', 'true');

            const popup = window.open(
                data.auth_url,
                'ms_calendar_popup',
                `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                Swal.fire('Popup Blocked', 'Please allow popups to connect Microsoft Outlook Calendar.', 'warning');
                return;
            }

            const exchangeCode = async (code: string) => {
                try {
                    Swal.fire({
                        title: 'Connecting to Outlook…',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                    });
                    const tokenRes = await fetch(`${API_BASE_URL}/app/microsoft-calendar-token/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'exchange',
                            code,
                            redirect_uri: redirectUri,
                        }),
                    });
                    const tokenData = await tokenRes.json();
                    if (!tokenRes.ok || !tokenData.access_token) {
                        throw new Error(tokenData?.detail || 'Failed to retrieve access token from Microsoft.');
                    }

                    setStoredMsToken(tokenData.access_token, tokenData.refresh_token);
                    setMsToken(tokenData.access_token);
                    setRefreshTick((t) => t + 1);
                    Swal.close();
                    Swal.fire({
                        icon: 'success',
                        title: 'Outlook Calendar Connected',
                        text: 'Your Microsoft Outlook Calendar events are now synced.',
                        timer: 2000,
                        showConfirmButton: false,
                    });
                } catch (err: any) {
                    Swal.close();
                    Swal.fire('Connection Error', err?.message || 'Could not connect Outlook Calendar.', 'error');
                }
            };

            // BroadcastChannel listener
            let handled = false;
            let channel: BroadcastChannel | null = null;
            try {
                channel = new BroadcastChannel('ms_auth_channel');
                channel.onmessage = (event) => {
                    if (handled) return;
                    if (event.data?.code) {
                        handled = true;
                        cleanup();
                        exchangeCode(event.data.code);
                    }
                };
            } catch {}

            const handleStorage = (e: StorageEvent) => {
                if (handled || e.key !== 'ms_auth_result' || !e.newValue) return;
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed?.code) {
                        handled = true;
                        cleanup();
                        exchangeCode(parsed.code);
                    }
                } catch {}
            };
            window.addEventListener('storage', handleStorage);

            const handleMsg = (e: MessageEvent) => {
                if (handled || e.origin !== window.location.origin) return;
                if (e.data?.type === 'MS_AUTH_CODE' && e.data?.code) {
                    handled = true;
                    cleanup();
                    exchangeCode(e.data.code);
                }
            };
            window.addEventListener('message', handleMsg);

            const interval = setInterval(() => {
                if (popup.closed && !handled) {
                    cleanup();
                }
            }, 1000);

            const cleanup = () => {
                clearInterval(interval);
                window.removeEventListener('storage', handleStorage);
                window.removeEventListener('message', handleMsg);
                if (channel) {
                    try {
                        channel.close();
                    } catch {}
                }
                localStorage.removeItem('ms_auth_in_progress');
                localStorage.removeItem('ms_auth_result');
            };
        } catch (err: any) {
            Swal.fire('Error', err?.message || 'Failed to start Microsoft authorization.', 'error');
        }
    };

    const handleDisconnectMicrosoft = () => {
        clearStoredMsToken();
        setMsToken(null);
        setMsFcEvents([]);
        Swal.fire({
            icon: 'info',
            title: 'Disconnected',
            text: 'Microsoft Outlook Calendar has been disconnected.',
            timer: 1600,
            showConfirmButton: false,
        });
    };

    // ─────────────────────────────────────────────────────────────
    // Add Outlook Event Modal Handlers
    // ─────────────────────────────────────────────────────────────
    const openAddModal = (dateStr?: string) => {
        const d = dateStr || new Date().toISOString().slice(0, 10);
        setEventDate(d);
        setEventTitle('');
        setEventStart('10:00');
        setEventEnd('11:00');
        setEventAllDay(false);
        setEventLocation('');
        setEventDesc('');
        setEventWithTeams(true);
        setExternalEmails('');
        setSelectedGuestIds([]);
        setAddOpen(true);
    };

    const submitOutlookEvent = async (e: FormEvent) => {
        e.preventDefault();
        const title = eventTitle.trim();
        if (!title) {
            Swal.fire('Title required', 'Please enter an event title.', 'warning');
            return;
        }
        if (!msToken) {
            Swal.fire('Outlook not connected', 'Please connect Microsoft Outlook Calendar first.', 'warning');
            return;
        }

        setSaveBusy(true);
        try {
            const tz = calendarTimeZone();
            const emailSet = new Set<string>();
            for (const id of selectedGuestIds) {
                const u = companyGuests.find((g) => g.id === id);
                const em = (u?.email || '').trim().toLowerCase();
                if (em) emailSet.add(em);
            }
            for (const em of extractEmailAddressesFromText(`${externalEmails}\n${eventDesc}`)) {
                emailSet.add(em);
            }
            const attendeesList = Array.from(emailSet).map((email) => ({
                emailAddress: { address: email },
                type: 'required',
            }));

            let startDt: string;
            let endDt: string;

            if (eventAllDay) {
                startDt = `${eventDate}T00:00:00`;
                const d = new Date(eventDate + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                endDt = `${d.toISOString().slice(0, 10)}T00:00:00`;
            } else {
                startDt = `${eventDate}T${eventStart}:00`;
                endDt = `${eventDate}T${eventEnd}:00`;
            }

            const body: Record<string, unknown> = {
                subject: title,
                body: {
                    contentType: 'HTML',
                    content: eventDesc.trim() || title,
                },
                start: { dateTime: startDt, timeZone: tz },
                end: { dateTime: endDt, timeZone: tz },
                isAllDay: eventAllDay,
                location: eventLocation.trim() ? { displayName: eventLocation.trim() } : undefined,
                attendees: attendeesList,
            };

            if (!eventAllDay && eventWithTeams) {
                body.isOnlineMeeting = true;
                body.onlineMeetingProvider = 'teamsForBusiness';
            }

            let created: MsOutlookEvent;
            try {
                created = await insertMicrosoftEvent(msToken, body);
            } catch (err: any) {
                // If Teams meeting failed (tenant lacks Teams license), retry without onlineMeeting
                if (body.isOnlineMeeting) {
                    delete body.isOnlineMeeting;
                    delete body.onlineMeetingProvider;
                    created = await insertMicrosoftEvent(msToken, body);
                } else {
                    throw err;
                }
            }

            setAddOpen(false);
            setRefreshTick((t) => t + 1);

            const teamsUrl = created.onlineMeeting?.joinUrl;
            const teamsHtml = teamsUrl
                ? `<p class="mt-3"><a class="btn btn-sm btn-primary inline-flex items-center gap-2" href="${teamsUrl}" target="_blank" rel="noopener noreferrer"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>Join Teams Meeting</a></p>`
                : '';

            Swal.fire({
                icon: 'success',
                title: 'Event Created',
                html: `<p>Saved to your Microsoft Outlook Calendar.</p>${teamsHtml}`,
            });
        } catch (err: any) {
            Swal.fire('Could not create event', err?.message || 'Unknown error', 'error');
        } finally {
            setSaveBusy(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Admin Add Company Event / Holiday
    // ─────────────────────────────────────────────────────────────
    const submitCompanyCalendarEntry = async (e: FormEvent) => {
        e.preventDefault();
        const name = coName.trim();
        if (!name) {
            Swal.fire('Title required', 'Please enter a name for the company event/holiday.', 'warning');
            return;
        }
        setCoSaving(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/app/calendar-events/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    date: coDate,
                    description: coDesc.trim(),
                    is_holiday: coIsHoliday,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.detail || 'Could not save company event');
            }
            const row = data as CompanyCalEvent;
            setCompanyEvents((prev) => [...prev, row].sort((a, b) => a.date.localeCompare(b.date)));
            setCoName('');
            setCoDesc('');
            setCoDate(new Date().toISOString().slice(0, 10));
            setCoIsHoliday(true);
            Swal.fire({ icon: 'success', title: 'Added to company calendar', timer: 1400, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire('Could not save', err?.message || 'Unknown error', 'error');
        } finally {
            setCoSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Admin Excel Holiday Import
    // ─────────────────────────────────────────────────────────────
    const ddmmyyyyToIso = (s: string) => {
        const m = String(s || '').trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (!m) return null;
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
    };

    const excelCellToIso = (v: any) => {
        if (v == null || v === '') return null;
        if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
        if (typeof v === 'number') {
            const d = XLSX.SSF.parse_date_code(v);
            if (!d || !d.y || !d.m || !d.d) return null;
            return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        }
        const s = String(v).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        return ddmmyyyyToIso(s);
    };

    const extractHolidayRowsFromWorkbook = async (file: File) => {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = wb.SheetNames?.[0];
        if (!sheetName) return [];
        const ws = wb.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][];
        if (!Array.isArray(matrix) || matrix.length === 0) return [];

        let headerRow = 0;
        let dateIdx = 0;
        let eventIdx = 1;
        for (let i = 0; i < Math.min(15, matrix.length); i++) {
            const row = matrix[i] || [];
            const joined = row.map((x) => String(x || '').toLowerCase()).join(' | ');
            if (joined.includes('date') && (joined.includes('event') || joined.includes('holiday') || joined.includes('name'))) {
                headerRow = i;
                const lower = row.map((x) => String(x || '').toLowerCase());
                const di = lower.findIndex((c) => c.includes('date'));
                const ei = lower.findIndex((c) => c.includes('event') || c.includes('holiday') || c.includes('name'));
                dateIdx = di >= 0 ? di : 0;
                eventIdx = ei >= 0 ? ei : dateIdx + 1;
                break;
            }
        }

        const rows: { date: string; name: string; description: string; is_holiday: boolean }[] = [];
        for (let r = headerRow + 1; r < matrix.length; r++) {
            const row = matrix[r] || [];
            const dateIso = excelCellToIso(row[dateIdx]);
            const name = String(row[eventIdx] || '').trim();
            if (!dateIso || !name) continue;
            rows.push({ date: dateIso, name, description: '', is_holiday: true });
        }
        return rows;
    };

    const importHolidaysFromExcel = async () => {
        if (!isAdmin || !importFile) return;
        setImportBusy(true);
        try {
            const rows = await extractHolidayRowsFromWorkbook(importFile);
            if (rows.length === 0) {
                Swal.fire('No rows found', 'Could not parse Date/Event rows. Ensure format has Date and Event columns.', 'warning');
                return;
            }
            const res = await authFetch(`${API_BASE_URL}/app/calendar-events/bulk_import_holidays/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ holidays: rows }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Import failed');

            setCompanyEvents((prev) => {
                const merged = [...prev];
                for (const it of data?.results || []) {
                    const existing = merged.find((x: any) => x.id === it.id);
                    if (!existing) merged.push(it);
                }
                return merged.sort((a: any, b: any) => String(a.date || '').localeCompare(String(b.date || '')));
            });
            setImportFile(null);
            Swal.fire({
                icon: 'success',
                title: 'Imported',
                text: `Created ${data.created || 0}, updated ${data.updated || 0}, skipped ${data.skipped || 0}.`,
            });
        } catch (err: any) {
            Swal.fire('Import failed', err?.message || 'Unknown error', 'error');
        } finally {
            setImportBusy(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Event Click / Delete Handlers
    // ─────────────────────────────────────────────────────────────
    const onEventClick = useCallback(
        async (clickInfo: any) => {
            const ev = clickInfo.event;
            const ext = ev.extendedProps || {};
            const src = ext.source as 'company' | 'microsoft';
            const title = ev.title || 'Event';
            const desc = ext.description as string;
            const teamsLink = ext.teamsMeetingLink as string;
            const webLink = ext.webLink as string;
            const msEventId = ext.msEventId as string;
            const companyEventId = ext.companyEventId as number | undefined;

            const canDeleteMs = Boolean(src === 'microsoft' && msToken && msEventId);
            const canDeleteCompany = Boolean(src === 'company' && isAdmin && companyEventId != null);
            const canDelete = canDeleteMs || canDeleteCompany;

            let htmlContent = `<div class="text-left text-sm space-y-2 mt-2">`;
            if (desc) htmlContent += `<p class="text-gray-700 dark:text-gray-300">${desc}</p>`;
            if (ext.location) htmlContent += `<p class="text-xs text-gray-500">📍 ${ext.location}</p>`;
            if (teamsLink) {
                htmlContent += `<p class="pt-2"><a href="${teamsLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary inline-flex items-center gap-2">Join Microsoft Teams</a></p>`;
            }
            if (webLink) {
                htmlContent += `<p class="pt-1"><a href="${webLink}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View in Outlook on the web →</a></p>`;
            }
            htmlContent += `</div>`;

            const confirm = await Swal.fire({
                title,
                html: htmlContent,
                icon: 'info',
                showCancelButton: canDelete,
                confirmButtonText: canDelete ? 'Delete Event' : 'Close',
                confirmButtonColor: canDelete ? '#e7515a' : '#4361ee',
                cancelButtonText: 'Cancel',
            });

            if (!confirm.isConfirmed || !canDelete) return;

            Swal.fire({ title: 'Deleting…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                if (src === 'microsoft' && msEventId && msToken) {
                    await deleteMicrosoftEvent(msToken, msEventId);
                    setRefreshTick((t) => t + 1);
                } else if (companyEventId != null) {
                    const res = await authFetch(`${API_BASE_URL}/app/calendar-events/${companyEventId}/`, {
                        method: 'DELETE',
                    });
                    if (!res.ok) throw new Error('Could not delete company event');
                    setCompanyEvents((prev) => prev.filter((e) => e.id !== companyEventId));
                }
                Swal.close();
                Swal.fire({ icon: 'success', title: 'Removed', timer: 1400, showConfirmButton: false });
            } catch (err: any) {
                Swal.close();
                Swal.fire('Could not delete', err?.message || 'Unknown error', 'error');
            }
        },
        [msToken, isAdmin]
    );

    // ─────────────────────────────────────────────────────────────
    // Combine Events for Display
    // ─────────────────────────────────────────────────────────────
    const companyFcEvents = useMemo(() => {
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
                extendedProps: {
                    source: 'company' as const,
                    description: e.description || '',
                    companyEventId: e.id,
                },
            }));
    }, [companyEvents, visibleRange]);

    const msFcEventsForDisplay = useMemo(() => {
        // Exclude duplicate company holiday entries from Outlook layer
        return msFcEvents.filter((ev) => !ev.extendedProps?.isCompanyHoliday);
    }, [msFcEvents]);

    const combinedEvents = useMemo(() => {
        return [...companyFcEvents, ...msFcEventsForDisplay];
    }, [companyFcEvents, msFcEventsForDisplay]);

    // ─────────────────────────────────────────────────────────────
    // Calendar Panel Header & Legend
    // ─────────────────────────────────────────────────────────────
    const panelInner = (
        <>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#e7515a]" />
                        <span>Company holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#00ab55]" />
                        <span>Company event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#2196f3]" />
                        <span>Your Outlook Calendar</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {userEmail && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]" title={userEmail}>
                            Signed in as <strong className="text-gray-700 dark:text-gray-300">{userEmail}</strong>
                        </span>
                    )}

                    {msToken ? (
                        <>
                            <button type="button" className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => openAddModal()}>
                                <IconMicrosoft size={16} />
                                <span>Add Outlook event</span>
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDisconnectMicrosoft}>
                                Disconnect Outlook
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm flex items-center gap-2"
                            onClick={handleConnectMicrosoft}
                        >
                            <IconMicrosoft size={16} />
                            <span>Connect Outlook Calendar</span>
                        </button>
                    )}
                </div>
            </div>

            {!msToken && (
                <div className="mb-4 rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-200/90 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <IconMicrosoft size={28} />
                        <div>
                            <p className="font-semibold">Connect your Microsoft Outlook Calendar</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                View your schedule, schedule Teams meetings, and keep company holidays in sync with your Outlook calendar.
                            </p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-primary shrink-0" onClick={handleConnectMicrosoft}>
                        Connect Now
                    </button>
                </div>
            )}

            {msError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                    {msError}
                </div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
                <div className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.06] dark:bg-primary/10 px-4 py-3 sm:px-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Company Calendar Management (Admin)</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Add official company holidays (red) or organizational events (green). Company holidays automatically sync to employee Outlook calendars.
                    </p>
                    <form onSubmit={submitCompanyCalendarEntry} className="space-y-3">
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Event Title</label>
                                <input
                                    className="form-input py-1.5 text-sm"
                                    value={coName}
                                    onChange={(e) => setCoName(e.target.value)}
                                    placeholder="e.g. Diwali, Independence Day, Annual Townhall"
                                    required
                                />
                            </div>
                            <div className="w-full sm:w-40">
                                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
                                <input
                                    type="date"
                                    className="form-input py-1.5 text-sm"
                                    value={coDate}
                                    onChange={(e) => setCoDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2 pb-2">
                                <input
                                    type="checkbox"
                                    id="coHolidayCheck"
                                    className="form-checkbox text-primary"
                                    checked={coIsHoliday}
                                    onChange={(e) => setCoIsHoliday(e.target.checked)}
                                />
                                <label htmlFor="coHolidayCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Official Holiday (Day off)
                                </label>
                            </div>
                            <button type="submit" disabled={coSaving} className="btn btn-primary btn-sm">
                                {coSaving ? 'Saving…' : 'Add Event'}
                            </button>
                        </div>
                    </form>

                    {/* Bulk Excel Upload */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Bulk Import Holidays (Excel):</span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-white"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            disabled={!importFile || importBusy}
                            onClick={importHolidaysFromExcel}
                            className="btn btn-outline-primary btn-sm py-1 text-xs"
                        >
                            {importBusy ? 'Importing…' : 'Upload Sheet'}
                        </button>
                    </div>
                </div>
            )}

            {/* Calendar View */}
            <div className="calendar-wrapper">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    editable={false}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    events={combinedEvents}
                    datesSet={(arg) => setVisibleRange({ start: arg.start, end: arg.end })}
                    select={(info) => {
                        if (msToken) openAddModal(info.startStr.slice(0, 10));
                    }}
                    eventClick={onEventClick}
                />
            </div>
        </>
    );

    return (
        <div className={embedded ? '' : 'p-6'}>
            <div className="panel">{panelInner}</div>

            {/* Modal: Add Microsoft Outlook Event */}
            {addOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-4">
                    {/* Never taller than the screen: the header and buttons stay put, the fields scroll */}
                    <div className="relative flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl dark:bg-[#121e32]">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
                            <div className="flex items-center gap-2">
                                <IconMicrosoft size={22} />
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Outlook Event</h3>
                            </div>
                            <button
                                type="button"
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                onClick={() => setAddOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitOutlookEvent} className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Event Title *
                                </label>
                                <input
                                    className="form-input text-sm"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    placeholder="e.g. Sprint Planning, Client Sync"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="form-input text-sm"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-2 sm:pt-6">
                                    <input
                                        type="checkbox"
                                        id="allDayCheck"
                                        className="form-checkbox text-primary"
                                        checked={eventAllDay}
                                        onChange={(e) => setEventAllDay(e.target.checked)}
                                    />
                                    <label htmlFor="allDayCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                        All day event
                                    </label>
                                </div>
                            </div>

                            {!eventAllDay && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            className="form-input text-sm"
                                            value={eventStart}
                                            onChange={(e) => setEventStart(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            className="form-input text-sm"
                                            value={eventEnd}
                                            onChange={(e) => setEventEnd(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
                                <input
                                    className="form-input text-sm"
                                    value={eventLocation}
                                    onChange={(e) => setEventLocation(e.target.value)}
                                    placeholder="e.g. Conference Room 1 / Online"
                                />
                            </div>

                            {!eventAllDay && (
                                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <IconVideo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">Microsoft Teams Meeting</p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Generate an online Teams meeting link</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox text-indigo-600 h-5 w-5"
                                        checked={eventWithTeams}
                                        onChange={(e) => setEventWithTeams(e.target.checked)}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Company Colleagues (Attendees)
                                </label>
                                {loadingGuests ? (
                                    <p className="text-xs text-gray-400">Loading directory…</p>
                                ) : (
                                    <select
                                        multiple
                                        className="form-multiselect text-xs h-24"
                                        value={selectedGuestIds.map(String)}
                                        onChange={(e) => {
                                            const ids = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                                            setSelectedGuestIds(ids);
                                        }}
                                    >
                                        {companyGuests.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.first_name || ''} {g.last_name || ''} ({g.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-[11px] text-gray-400 mt-1">Hold Ctrl (Cmd) to select multiple colleagues.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">External Guests</label>
                                <input
                                    className="form-input text-sm"
                                    value={externalEmails}
                                    onChange={(e) => setExternalEmails(e.target.value)}
                                    placeholder="client@partner.com, consultant@corp.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description / Agenda</label>
                                <textarea
                                    className="form-textarea text-sm"
                                    rows={3}
                                    value={eventDesc}
                                    onChange={(e) => setEventDesc(e.target.value)}
                                    placeholder="Meeting agenda or notes..."
                                />
                            </div>

                            </div>

                            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700 sm:px-6">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => setAddOpen(false)}
                                    disabled={saveBusy}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5" disabled={saveBusy}>
                                    <IconMicrosoft size={16} />
                                    <span>{saveBusy ? 'Saving to Outlook…' : 'Save to Outlook'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyMicrosoftCalendar;
