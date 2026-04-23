import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { hasGrantedAllScopesGoogle, useGoogleLogin } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { authFetch } from '../../utils/authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
/** Full Calendar access (events, Meet/conferenceData). Narrow `calendar.events` alone can still 403 on insert with some OAuth setups. */
const GOOGLE_CAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

function calendarTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

/** Wide default window so fetches/sync run before `datesSet` — embedded dashboards often delay `datesSet` until layout settles. */
function defaultVisibleRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
    return { start, end };
}

function randomRequestId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Pulls email addresses from free text: comma lists, new lines, and `Name <user@domain.com>`.
 * The old splitter-only logic failed on "Name <email>" and on addresses pasted with extra words.
 */
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

function formatGoogleCalendarApiError(status: number, errBody: unknown): string {
    const e = errBody as { error?: { message?: string; errors?: { reason?: string; message?: string }[] } };
    const base = e?.error?.message || `HTTP ${status}`;
    const reason = e?.error?.errors?.[0]?.reason;
    const detail = e?.error?.errors?.[0]?.message;
    let msg = detail && detail !== base ? `${base} (${detail})` : base;
    if (status === 403) {
        msg +=
            '. If this persists: in Google Cloud enable the Calendar API for this OAuth client’s project, add the Calendar scope (see …/auth/calendar) on the OAuth consent screen, disconnect and connect again, and check Workspace admin policies.';
    }
    if (reason && !msg.includes(reason)) {
        msg += ` [${reason}]`;
    }
    return msg;
}

async function insertGoogleCalendarEvent(
    accessToken: string,
    body: Record<string, unknown>,
    opts: { withConference: boolean; sendUpdates?: 'all' }
): Promise<{ hangoutLink?: string; htmlLink?: string; id?: string }> {
    const params = new URLSearchParams();
    if (opts.withConference) params.set('conferenceDataVersion', '1');
    if (opts.sendUpdates === 'all') params.set('sendUpdates', 'all');
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${q}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (res.status === 401) {
        const e = new Error('Session expired — connect Google Calendar again.');
        (e as Error & { code?: number }).code = 401;
        throw e;
    }
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const e = new Error(formatGoogleCalendarApiError(res.status, errBody));
        const ex = e as Error & { status?: number; googleReason?: string };
        ex.status = res.status;
        const reason = (errBody as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]?.reason;
        if (reason) ex.googleReason = reason;
        throw e;
    }
    return res.json();
}

async function deleteGoogleCalendarEvent(accessToken: string, googleEventId: string): Promise<void> {
    const encoded = encodeURIComponent(googleEventId);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encoded}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
        const e = new Error('Session expired — connect Google Calendar again.');
        (e as Error & { code?: number }).code = 401;
        throw e;
    }
    if (res.status === 204 || res.status === 200 || res.status === 404) return;
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(formatGoogleCalendarApiError(res.status, errBody));
    const ex = err as Error & { status?: number; googleReason?: string };
    ex.status = res.status;
    const reason = (errBody as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]?.reason;
    if (reason) ex.googleReason = reason;
    throw err;
}

async function patchGoogleCalendarEvent(accessToken: string, googleEventId: string, body: Record<string, unknown>): Promise<void> {
    const encoded = encodeURIComponent(googleEventId);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encoded}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (res.status === 401) {
        const e = new Error('Session expired — connect Google Calendar again.');
        (e as Error & { code?: number }).code = 401;
        throw e;
    }
    if (res.status === 200) return;
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(formatGoogleCalendarApiError(res.status, errBody));
    const ex = err as Error & { status?: number; googleReason?: string };
    ex.status = res.status;
    const reason = (errBody as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]?.reason;
    if (reason) ex.googleReason = reason;
    throw err;
}

function stripConferenceFromBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!('conferenceData' in body)) return body;
    const rest = { ...body };
    delete rest.conferenceData;
    return rest;
}

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
    extendedProperties?: { private?: Record<string, string> };
};

const HRMS_HOLIDAY_SYNC_KEY = 'hrms_gcal_company_holiday_map_v1';

type HolidayGoogleSyncEntry = { googleEventId: string; fingerprint: string };

function holidaySyncMapStorageKey() {
    const u = localStorage.getItem('username') || 'anon';
    return `${HRMS_HOLIDAY_SYNC_KEY}_${u}`;
}

function readHolidaySyncMap(): Record<string, HolidayGoogleSyncEntry> {
    try {
        const raw = localStorage.getItem(holidaySyncMapStorageKey());
        if (!raw) return {};
        const p = JSON.parse(raw) as Record<string, HolidayGoogleSyncEntry>;
        return p && typeof p === 'object' ? p : {};
    } catch {
        return {};
    }
}

function writeHolidaySyncMap(m: Record<string, HolidayGoogleSyncEntry>) {
    localStorage.setItem(holidaySyncMapStorageKey(), JSON.stringify(m));
}

function clearHolidaySyncMap() {
    try {
        localStorage.removeItem(holidaySyncMapStorageKey());
    } catch {
        /* ignore */
    }
}

function fingerprintCompanyHoliday(h: CompanyCalEvent): string {
    return `${h.date}|${h.name}|${(h.description || '').trim()}`;
}

function buildCompanyHolidayGoogleBody(h: CompanyCalEvent): Record<string, unknown> {
    const d = new Date(h.date + 'T12:00:00');
    const endD = new Date(d);
    endD.setDate(endD.getDate() + 1);
    return {
        summary: `[Company] ${h.name}`,
        description: [h.description?.trim(), 'Synced from company calendar (HRMS).'].filter(Boolean).join('\n\n'),
        start: { date: h.date },
        end: { date: endD.toISOString().slice(0, 10) },
        extendedProperties: {
            private: {
                hrmsCompanyHolidayId: String(h.id),
                hrmsSync: 'company-holiday',
            },
        },
    };
}

/**
 * Keeps the signed-in user's Google Calendar in sync with HRMS company holidays.
 * Requires each employee to connect Google once; there is no server-side push to accounts that never authorized the app.
 */
async function syncCompanyHolidaysToUserGoogle(accessToken: string, holidays: CompanyCalEvent[]): Promise<void> {
    let map = readHolidaySyncMap();
    const currentIds = new Set(holidays.map((h) => String(h.id)));

    for (const idStr of Object.keys(map)) {
        if (!currentIds.has(idStr)) {
            try {
                await deleteGoogleCalendarEvent(accessToken, map[idStr].googleEventId);
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
        const body = buildCompanyHolidayGoogleBody(h);
        const existing = map[idStr];
        if (!existing) {
            const created = await insertGoogleCalendarEvent(accessToken, body, { withConference: false });
            if (created.id) {
                map = { ...map, [idStr]: { googleEventId: created.id, fingerprint: fp } };
            }
        } else if (existing.fingerprint !== fp) {
            try {
                await patchGoogleCalendarEvent(accessToken, existing.googleEventId, body);
                map = { ...map, [idStr]: { ...existing, fingerprint: fp } };
            } catch {
                const created = await insertGoogleCalendarEvent(accessToken, body, { withConference: false });
                if (created.id) {
                    map = { ...map, [idStr]: { googleEventId: created.id, fingerprint: fp } };
                }
            }
        }
    }

    writeHolidaySyncMap(map);
}

function oauthStorageKey() {
    const u = localStorage.getItem('username') || 'anon';
    return `google_calendar_oauth_${u}`;
}

/** Stored access token must have been issued with this exact scope (see TokenResponse.scope). */
function tokenIncludesRequiredCalendarScope(scopeField: string | undefined): boolean {
    if (!scopeField?.trim()) return false;
    const parts = scopeField.split(/\s+/).filter(Boolean);
    return parts.includes(GOOGLE_CAL_SCOPE);
}

type StoredGoogleCal = {
    access_token: string;
    expires_at: number;
    /** From OAuth TokenResponse.scope — required so we do not reuse a pre–Calendar token after scope changes */
    oauth_scopes?: string;
};

function clearGoogleCalendarSession() {
    try {
        sessionStorage.removeItem(oauthStorageKey());
    } catch {
        /* ignore */
    }
}

function readStoredAccessToken(): string | null {
    try {
        const raw = sessionStorage.getItem(oauthStorageKey());
        if (!raw) return null;
        const p = JSON.parse(raw) as StoredGoogleCal;
        if (p.expires_at && Date.now() > p.expires_at - 60_000) {
            clearGoogleCalendarSession();
            return null;
        }
        if (!p.access_token) return null;
        if (!tokenIncludesRequiredCalendarScope(p.oauth_scopes)) {
            clearGoogleCalendarSession();
            return null;
        }
        return p.access_token;
    } catch {
        return null;
    }
}

function writeStoredAccessToken(access_token: string, expires_in?: number, oauth_scopes?: string) {
    const ttlMs = (expires_in ?? 3600) * 1000;
    const expires_at = Date.now() + ttlMs;
    sessionStorage.setItem(oauthStorageKey(), JSON.stringify({ access_token, expires_at, oauth_scopes } satisfies StoredGoogleCal));
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
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || res.statusText || 'Google Calendar request failed';
        const e = new Error(msg);
        const ex = e as Error & { code?: number; status?: number; googleReason?: string };
        if (res.status === 401) ex.code = 401;
        ex.status = res.status;
        const reason = errBody?.error?.errors?.[0]?.reason;
        if (reason) ex.googleReason = reason;
        throw e;
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
        extendedProps: {
            source: 'google' as const,
            description: ev.description || '',
            googleEventId: ev.id,
            hrmsCompanyHolidayId: ev.extendedProperties?.private?.hrmsCompanyHolidayId,
        },
    };
}

type CompanyGoogleCalendarProps = {
    /** Full admin page with hero banner, or compact block for employee dashboard */
    variant?: 'page' | 'embedded';
};

type CompanyGuest = {
    id: number;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: string;
};

const CompanyGoogleCalendar = ({ variant = 'page' }: CompanyGoogleCalendarProps) => {
    const [companyEvents, setCompanyEvents] = useState<CompanyCalEvent[]>([]);
    const [googleFcEvents, setGoogleFcEvents] = useState<any[]>([]);
    const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>(() => defaultVisibleRange());
    const [googleToken, setGoogleToken] = useState<string | null>(() => readStoredAccessToken());
    const [loadingCompany, setLoadingCompany] = useState(true);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const [addOpen, setAddOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [eventAllDay, setEventAllDay] = useState(false);
    const [eventStart, setEventStart] = useState('10:00');
    const [eventEnd, setEventEnd] = useState('11:00');
    const [eventDesc, setEventDesc] = useState('');
    /** Off by default: simple calendar event without Meet unless user opts in */
    const [eventMeet, setEventMeet] = useState(false);
    const [saveBusy, setSaveBusy] = useState(false);

    const [companyGuests, setCompanyGuests] = useState<CompanyGuest[]>([]);
    const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);
    const [guestFilter, setGuestFilter] = useState('');
    const [externalEmails, setExternalEmails] = useState('');
    const [loadingGuests, setLoadingGuests] = useState(false);

    /** Admin: POST /app/calendar-events/ — company-wide holidays & events */
    const [coName, setCoName] = useState('');
    const [coDate, setCoDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [coDesc, setCoDesc] = useState('');
    const [coIsHoliday, setCoIsHoliday] = useState(true);
    const [coSaving, setCoSaving] = useState(false);

    /** Admin: Excel import → bulk create / update company holidays */
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importBusy, setImportBusy] = useState(false);

    const userEmail = localStorage.getItem('user_email') || localStorage.getItem('username') || '';
    const isAdmin = (localStorage.getItem('user_role') || '') === 'admin';
    const embedded = variant === 'embedded';

    const openAddModal = (dateStr?: string) => {
        setEventTitle('');
        setEventDesc('');
        setEventDate(dateStr || new Date().toISOString().slice(0, 10));
        setEventAllDay(false);
        setEventStart('10:00');
        setEventEnd('11:00');
        setEventMeet(false);
        setSelectedGuestIds([]);
        setExternalEmails('');
        setGuestFilter('');
        setAddOpen(true);
    };

    const toggleGuestId = (id: number) => {
        setSelectedGuestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const filteredCompanyGuests = useMemo(() => {
        const q = guestFilter.trim().toLowerCase();
        if (!q) return companyGuests;
        return companyGuests.filter((g) => {
            const em = (g.email || '').toLowerCase();
            const name = `${g.first_name || ''} ${g.last_name || ''}`.toLowerCase();
            return em.includes(q) || name.includes(q);
        });
    }, [companyGuests, guestFilter]);

    const submitGoogleEvent = async (e: FormEvent) => {
        e.preventDefault();
        if (!googleToken) return;
        const title = eventTitle.trim();
        if (!title) {
            Swal.fire('Title required', 'Please enter an event title.', 'warning');
            return;
        }
        if (!eventAllDay) {
            if (eventStart >= eventEnd) {
                Swal.fire('Invalid time', 'End time must be after start time.', 'warning');
                return;
            }
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
            const attendeeList = Array.from(emailSet).map((email) => ({ email }));
            const sendInvites = attendeeList.length > 0;

            let body: Record<string, unknown>;
            const withConference = !eventAllDay && eventMeet;
            if (eventAllDay) {
                const d = new Date(eventDate + 'T12:00:00');
                const endD = new Date(d);
                endD.setDate(endD.getDate() + 1);
                body = {
                    summary: title,
                    ...(eventDesc.trim() ? { description: eventDesc.trim() } : {}),
                    start: { date: eventDate },
                    end: { date: endD.toISOString().slice(0, 10) },
                    ...(sendInvites ? { attendees: attendeeList } : {}),
                };
            } else {
                body = {
                    summary: title,
                    ...(eventDesc.trim() ? { description: eventDesc.trim() } : {}),
                    start: { dateTime: `${eventDate}T${eventStart}:00`, timeZone: tz },
                    end: { dateTime: `${eventDate}T${eventEnd}:00`, timeZone: tz },
                    ...(sendInvites ? { attendees: attendeeList } : {}),
                    ...(eventMeet
                        ? {
                              conferenceData: {
                                  createRequest: {
                                      requestId: randomRequestId(),
                                      conferenceSolutionKey: { type: 'hangoutsMeet' },
                                  },
                              },
                          }
                        : {}),
                };
            }
            let bodyMut: Record<string, unknown> = { ...body };
            let useConference = withConference;
            let sendUpdates: 'all' | undefined = sendInvites ? 'all' : undefined;
            let emailInvitesSent = sendInvites;
            const fallbackWarnings: string[] = [];

            let created: {
                hangoutLink?: string;
                conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
            };
            for (;;) {
                try {
                    created = (await insertGoogleCalendarEvent(googleToken, bodyMut, {
                        withConference: useConference,
                        sendUpdates,
                    })) as typeof created;
                    break;
                } catch (err: any) {
                    if (err?.status !== 403) throw err;
                    const r = err?.googleReason as string | undefined;
                    if (
                        r === 'insufficientPermissions' ||
                        r === 'authError' ||
                        r === 'domainPolicy' ||
                        r === 'usageLimits'
                    ) {
                        throw err;
                    }
                    if (useConference) {
                        useConference = false;
                        bodyMut = stripConferenceFromBody(bodyMut);
                        fallbackWarnings.push(
                            'Google Meet was not added (your Google account or organization blocked it). The event was saved without a meeting link.'
                        );
                        continue;
                    }
                    if (sendUpdates === 'all') {
                        sendUpdates = undefined;
                        emailInvitesSent = false;
                        fallbackWarnings.push(
                            'Google did not send invitation emails (policy or permissions). Open the event in Google Calendar to share or add guests manually.'
                        );
                        continue;
                    }
                    throw err;
                }
            }

            setAddOpen(false);
            setRefreshTick((t) => t + 1);
            const meetUri =
                created.hangoutLink ||
                created.conferenceData?.entryPoints?.find((x) => x.entryPointType === 'video')?.uri;
            const warnHtml =
                fallbackWarnings.length > 0
                    ? `<p class="text-sm mt-2 text-amber-800 dark:text-amber-200/90">${fallbackWarnings.map((w) => `• ${w}`).join('<br/>')}</p>`
                    : '';
            const inviteNote =
                emailInvitesSent && sendInvites
                    ? '<p class="text-sm mt-2 text-gray-600 dark:text-gray-300">Guests will receive an email from Google Calendar (with Meet link if you added one).</p>'
                    : sendInvites && !emailInvitesSent
                      ? '<p class="text-sm mt-2 text-gray-600 dark:text-gray-300">Guests were added on the event; if Google blocked email delivery, share the event from Google Calendar.</p>'
                      : '';
            if (meetUri) {
                Swal.fire({
                    icon: 'success',
                    title: 'Event created',
                    html: `<p class="mb-2">Saved to your Google Calendar.</p>${warnHtml}${inviteNote}<p class="mt-2"><a class="text-primary font-semibold" href="${meetUri}" target="_blank" rel="noopener noreferrer">Open Google Meet</a></p>`,
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Event created',
                    html: `<p>Saved to your Google Calendar.</p>${warnHtml}${inviteNote}`,
                });
            }
        } catch (err: any) {
            if (err?.code === 401 || err?.googleReason === 'insufficientPermissions' || err?.googleReason === 'authError') {
                clearGoogleCalendarSession();
                setGoogleToken(null);
            }
            Swal.fire('Could not create event', err?.message || 'Unknown error', 'error');
        } finally {
            setSaveBusy(false);
        }
    };

    const submitCompanyCalendarEntry = async (e: FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        const name = coName.trim();
        if (!name) {
            Swal.fire('Required', 'Enter a title.', 'warning');
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
                const d = data?.detail;
                const msg =
                    typeof d === 'string'
                        ? d
                        : Array.isArray(d)
                          ? d.map((x: { message?: string }) => x?.message || '').filter(Boolean).join(' ')
                          : 'Could not save';
                throw new Error(msg);
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

    const ddmmyyyyToIso = (s: string) => {
        const m = String(s || '')
            .trim()
            .match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (!m) return null;
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
    };

    const excelCellToIso = (v: any) => {
        if (v == null || v === '') return null;
        if (v instanceof Date && !isNaN(v.getTime())) {
            return v.toISOString().slice(0, 10);
        }
        if (typeof v === 'number') {
            const d = XLSX.SSF.parse_date_code(v);
            if (!d || !d.y || !d.m || !d.d) return null;
            const mm = String(d.m).padStart(2, '0');
            const dd = String(d.d).padStart(2, '0');
            return `${d.y}-${mm}-${dd}`;
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
        if (!isAdmin) return;
        if (!importFile) {
            Swal.fire('Select an Excel file', 'Upload a sheet with Date + Event columns.', 'warning');
            return;
        }
        setImportBusy(true);
        try {
            const rows = await extractHolidayRowsFromWorkbook(importFile);
            if (rows.length === 0) {
                Swal.fire(
                    'No rows found',
                    'Could not find any Date/Event rows. Ensure format is DD-MM-YYYY with an event name column.',
                    'warning'
                );
                return;
            }
            const uniq = new Map<string, (typeof rows)[number]>();
            for (const r of rows) uniq.set(`${r.date}__${r.name.toLowerCase()}`, r);
            const payload = { rows: Array.from(uniq.values()) };

            const res = await authFetch(`${API_BASE_URL}/app/calendar-events/bulk-import/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Import failed');

            // Refresh in-memory list; Google sync effect will push holidays into admin Google automatically.
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
    }, [embedded]);

    const googleLogin = useGoogleLogin({
        /**
         * Library merges to: openid profile email + GOOGLE_CAL_SCOPE — matches Google’s usual web OAuth pattern.
         * Do not use overrideScope here: calendar-only tokens have caused 403 on events.insert for some projects.
         */
        scope: GOOGLE_CAL_SCOPE,
        include_granted_scopes: true,
        prompt: 'consent',
        hint: userEmail.includes('@') ? userEmail : undefined,
        onSuccess: (tokenResponse) => {
            if (!hasGrantedAllScopesGoogle(tokenResponse, GOOGLE_CAL_SCOPE)) {
                Swal.fire(
                    'Calendar access not granted',
                    'On the Google screen, allow access to Google Calendar, then click Connect Google Calendar again.',
                    'warning'
                );
                return;
            }
            const tr = tokenResponse as TokenResponse;
            const exp = tr.expires_in;
            writeStoredAccessToken(tr.access_token, exp, tr.scope);
            setGoogleToken(tr.access_token);
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
        if (!googleToken) {
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
                    const reason = e?.googleReason as string | undefined;
                    if (reason === 'insufficientPermissions' || e?.status === 403) {
                        clearGoogleCalendarSession();
                        setGoogleToken(null);
                        setGoogleError(
                            'Google Calendar needs permission: disconnect, then connect again and approve Calendar access. In Google Cloud → OAuth consent screen, add scope ' +
                                GOOGLE_CAL_SCOPE +
                                ' and enable the Calendar API for this client’s project.'
                        );
                    } else {
                        setGoogleError(e?.message || 'Google Calendar failed');
                        if (e?.code === 401) {
                            clearGoogleCalendarSession();
                            setGoogleToken(null);
                        }
                    }
                }
            } finally {
                if (!cancelled) setLoadingGoogle(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [visibleRange, googleToken, refreshTick]);

    /** Push company holidays (admin-configured) into the user's Google Calendar; remove when HRMS list changes. Debounced. */
    useEffect(() => {
        if (!googleToken || loadingCompany) return;
        const holidayList = companyEvents.filter((e) => e.is_holiday);
        let cancelled = false;
        const timer = window.setTimeout(() => {
            (async () => {
                try {
                    await syncCompanyHolidaysToUserGoogle(googleToken, holidayList);
                    if (!cancelled) setRefreshTick((t) => t + 1);
                } catch {
                    /* avoid spam; token/scope issues surface elsewhere */
                }
            })();
        }, 500);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [googleToken, companyEvents, loadingCompany]);

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

    /** Hide Google copies of HRMS holidays — we already render the company layer so the grid stays single-entry. */
    const googleFcEventsForDisplay = useMemo(() => {
        const holidayIds = new Set(companyEvents.filter((e) => e.is_holiday).map((e) => String(e.id)));
        return googleFcEvents.filter((ev) => {
            const hid = ev.extendedProps?.hrmsCompanyHolidayId as string | undefined;
            if (hid != null && hid !== '' && holidayIds.has(String(hid))) return false;
            return true;
        });
    }, [googleFcEvents, companyEvents]);

    const mergedEvents = useMemo(
        () => [...companyFcEvents, ...googleFcEventsForDisplay],
        [companyFcEvents, googleFcEventsForDisplay]
    );

    const disconnectGoogle = () => {
        clearGoogleCalendarSession();
        clearHolidaySyncMap();
        setGoogleToken(null);
        setGoogleFcEvents([]);
        setGoogleError(null);
    };

    const onEventClick = useCallback(
        async (info: any) => {
            const props = info.event?.extendedProps || {};
            const src = props.source as 'google' | 'company' | undefined;
            const desc = (props.description as string) || '';
            const title = info.event?.title || 'Event';
            const googleEventId = props.googleEventId as string | undefined;
            const companyEventId = props.companyEventId as number | undefined;
            const hrmsHolidaySyncId = props.hrmsCompanyHolidayId as string | undefined;

            if (src === 'google' && hrmsHolidaySyncId) {
                Swal.fire({
                    title,
                    text: 'This entry is synced from your company holiday list. An admin removes it in HRMS; it will drop from Google Calendar on the next sync.',
                    icon: 'info',
                });
                return;
            }

            const canDeleteGoogle = src === 'google' && googleToken && googleEventId;
            const canDeleteCompany = src === 'company' && isAdmin && companyEventId != null;

            if (!canDeleteGoogle && !canDeleteCompany) {
                if (src === 'google') {
                    Swal.fire({ title, text: desc || 'Google Calendar event', icon: 'info' });
                } else {
                    Swal.fire({
                        title,
                        text: desc || 'Company calendar',
                        icon: 'info',
                        footer: !isAdmin ? 'Only admins can remove company holidays/events from the calendar.' : undefined,
                    });
                }
                return;
            }

            const confirm = await Swal.fire({
                title: 'Delete this event?',
                text: desc ? `${title}\n\n${desc}\n\nThis cannot be undone.` : `${title}\n\nThis cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#e7515a',
            });
            if (!confirm.isConfirmed) return;

            Swal.fire({ title: 'Deleting…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                if (src === 'google' && googleEventId && googleToken) {
                    await deleteGoogleCalendarEvent(googleToken, googleEventId);
                    setRefreshTick((t) => t + 1);
                } else if (companyEventId != null) {
                    const res = await authFetch(`${API_BASE_URL}/app/calendar-events/${companyEventId}/`, {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.detail || res.statusText || 'Could not delete');
                    setCompanyEvents((prev) => prev.filter((e) => e.id !== companyEventId));
                }
                Swal.close();
                Swal.fire({ icon: 'success', title: 'Removed', timer: 1600, showConfirmButton: false });
            } catch (err: any) {
                Swal.close();
                if (err?.code === 401 || err?.googleReason === 'insufficientPermissions' || err?.googleReason === 'authError') {
                    clearGoogleCalendarSession();
                    setGoogleToken(null);
                }
                Swal.fire('Could not delete', err?.message || 'Unknown error', 'error');
            }
        },
        [googleToken, isAdmin]
    );

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
                        <>
                            <button type="button" className="btn btn-success btn-sm" onClick={() => openAddModal()}>
                                Add Google event
                            </button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={disconnectGoogle}>
                                Disconnect Google Calendar
                            </button>
                        </>
                    ) : (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => googleLogin()}>
                            Connect Google Calendar
                        </button>
                    )}
                </div>
            </div>

            {!googleToken && (
                <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90">
                    Sign in with Google uses your profile only. To <strong>view and create events</strong>, click &quot;Connect Google
                    Calendar&quot; — same Google account as login — and on the Google screen <strong>allow Calendar access</strong>.{' '}
                    <strong>Company holidays</strong> (admin) are copied into <em>your</em> Google Calendar while this page is used (each
                    colleague must connect once). In Google Cloud, enable <strong>Google Calendar API</strong> and add the{' '}
                    <code className="text-xs">../auth/calendar</code> scope on the OAuth consent screen (sensitive). If you see permission
                    errors, use <strong>Disconnect Google Calendar</strong> and connect again. Optional Meet and guests for timed events.
                </div>
            )}

            {googleError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                    {googleError}
                </div>
            )}

            {isAdmin && (
                <div className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.06] dark:bg-primary/10 px-4 py-3 sm:px-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Company calendar (admin)</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Add a <strong>holiday</strong> or a regular <strong>company event</strong> for everyone in your company. Check{' '}
                        <strong>Holiday</strong> for days off (red on the grid); leave it off for general events (green). Holidays can sync to
                        Google Calendar for staff who use &quot;Connect Google Calendar&quot; above.
                    </p>
                    <form onSubmit={submitCompanyCalendarEntry} className="space-y-3">
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
                                <input
                                    className="form-input py-1.5 text-sm"
                                    value={coName}
                                    onChange={(e) => setCoName(e.target.value)}
                                    placeholder="e.g. Diwali, Town hall"
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
                            <div className="flex items-center gap-2 pb-1.5">
                                <input
                                    type="checkbox"
                                    id="co-is-holiday"
                                    className="form-checkbox"
                                    checked={coIsHoliday}
                                    onChange={(e) => setCoIsHoliday(e.target.checked)}
                                />
                                <label htmlFor="co-is-holiday" className="text-sm text-gray-700 dark:text-gray-300">
                                    Holiday (day off)
                                </label>
                            </div>
                            <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={coSaving}>
                                {coSaving ? 'Saving…' : 'Add to company calendar'}
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Description (optional)</label>
                            <textarea
                                className="form-textarea text-sm min-h-[52px] py-2"
                                value={coDesc}
                                onChange={(e) => setCoDesc(e.target.value)}
                                placeholder="Notes for employees"
                            />
                        </div>
                    </form>

                    <div className="mt-4 border-t border-primary/20 pt-4">
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-1">Import holidays from Excel</h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">
                            Upload a sheet where one row contains headers like <strong>Date</strong> and <strong>Event</strong>. Dates can be
                            <strong> DD-MM-YYYY</strong> (recommended) or Excel date cells.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Excel file</label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                    className="form-input py-1.5 text-sm"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm shrink-0"
                                onClick={importHolidaysFromExcel}
                                disabled={importBusy}
                            >
                                {importBusy ? 'Importing…' : 'Import holidays'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(loadingCompany || loadingGoogle) && (
                <div className="text-xs text-gray-500 mb-2">{loadingGoogle ? 'Loading Google Calendar…' : 'Loading…'}</div>
            )}

            <div className="calendar-wrapper">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height={embedded ? 320 : 'auto'}
                    headerToolbar={{
                        left: embedded ? 'prev,next' : 'prev,next today',
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
                    dateClick={
                        googleToken
                            ? (info) => {
                                  openAddModal(info.dateStr);
                              }
                            : undefined
                    }
                />
            </div>

            {addOpen && (
                <div
                    className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/50"
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setAddOpen(false);
                    }}
                >
                    <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
                        <div
                            className="relative flex w-full max-w-2xl flex-col max-h-[min(90dvh,52rem)] rounded-xl border border-gray-200 bg-white shadow-xl dark:border-[#191e3a] dark:bg-[#1b2e4b]"
                            onClick={(e) => e.stopPropagation()}
                        >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4 dark:border-[#191e3a]">
                            <h4 className="text-base font-semibold text-gray-800 dark:text-white sm:text-lg pr-2">New Google Calendar event</h4>
                            <button
                                type="button"
                                className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none p-1"
                                onClick={() => setAddOpen(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submitGoogleEvent} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4">
                            <p className="text-xs text-gray-600 dark:text-gray-400 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-[#191e3a] px-3 py-2 leading-relaxed">
                                <strong className="text-gray-800 dark:text-gray-200">Just for you (no meeting):</strong> fill Title + date
                                (and time if not &quot;All day&quot;). Leave <strong>Add Google Meet</strong> unchecked and skip{' '}
                                <strong>Guests</strong> — the event is saved only on your Google Calendar.
                            </p>
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    className="form-input"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    placeholder="e.g. Focus time, Doctor visit"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="ev-allday"
                                    className="form-checkbox"
                                    checked={eventAllDay}
                                    onChange={(e) => setEventAllDay(e.target.checked)}
                                />
                                <label htmlFor="ev-allday" className="text-sm">
                                    All day
                                </label>
                            </div>
                            {!eventAllDay && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start</label>
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={eventStart}
                                            onChange={(e) => setEventStart(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End</label>
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={eventEnd}
                                            onChange={(e) => setEventEnd(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                            {!eventAllDay && (
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        id="ev-meet"
                                        className="form-checkbox mt-0.5"
                                        checked={eventMeet}
                                        onChange={(e) => setEventMeet(e.target.checked)}
                                    />
                                    <label htmlFor="ev-meet" className="text-sm leading-snug">
                                        <span className="font-medium">Add Google Meet</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Optional. Guests get the Meet link in the invitation email from Google.
                                        </span>
                                    </label>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                                <textarea
                                    className="form-textarea min-h-[72px]"
                                    value={eventDesc}
                                    onChange={(e) => setEventDesc(e.target.value)}
                                    placeholder="Notes — include guest@email.com addresses here; they are invited automatically"
                                />
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                    Valid <span className="font-mono text-[10px]">name@domain.com</span> addresses in this box are added as
                                    invitees (same as External emails). A plain @name without a full address is not enough for Google.
                                </p>
                            </div>

                            <div className="border border-gray-100 dark:border-[#191e3a] rounded-lg p-4 space-y-3 bg-gray-50/80 dark:bg-black/20">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">Guests (optional)</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Google emails invitations to people you tick below, plus every address under External emails and any full
                                    addresses found in the description. Meet link is included when enabled. Workspace policies may block
                                    external mail — check the confirmation dialog.
                                </p>
                                <div>
                                    <label className="block text-xs font-medium mb-1">People in your company</label>
                                    <input
                                        className="form-input py-1.5 text-sm mb-2"
                                        placeholder="Filter by name or email…"
                                        value={guestFilter}
                                        onChange={(e) => setGuestFilter(e.target.value)}
                                    />
                                    <div className="max-h-36 overflow-y-auto rounded border border-gray-200 dark:border-[#191e3a] bg-white dark:bg-[#0e1726] p-2 space-y-1.5">
                                        {loadingGuests ? (
                                            <p className="text-xs text-gray-500">Loading directory…</p>
                                        ) : filteredCompanyGuests.length === 0 ? (
                                            <p className="text-xs text-gray-500">No colleagues found (same company as your account).</p>
                                        ) : (
                                            filteredCompanyGuests.map((g) => (
                                                <label
                                                    key={g.id}
                                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded px-1 py-0.5"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-checkbox"
                                                        checked={selectedGuestIds.includes(g.id)}
                                                        onChange={() => toggleGuestId(g.id)}
                                                    />
                                                    <span className="truncate">
                                                        {[g.first_name, g.last_name].filter(Boolean).join(' ') || g.email}{' '}
                                                        <span className="text-gray-500 text-xs">({g.email})</span>
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">External emails</label>
                                    <textarea
                                        className="form-textarea min-h-[56px] text-sm"
                                        placeholder={'one@company.com, Name <other@gmail.com>'}
                                        value={externalEmails}
                                        onChange={(e) => setExternalEmails(e.target.value)}
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Comma, space, or new line. Formats like <span className="font-mono text-[10px]">Name &lt;email@x.com&gt;</span>{' '}
                                        work. Do not rely on @mentions in prose unless the full address appears.
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Time zone for the event: <strong>{calendarTimeZone()}</strong>. Leave &quot;Add Google Meet&quot; off for a simple
                                invite-only event.
                            </p>
                        </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-[#fbfbfb] px-4 py-3 dark:border-[#191e3a] dark:bg-[#121c2c] sm:px-5">
                                <button type="button" className="btn btn-outline-danger" onClick={() => setAddOpen(false)} disabled={saveBusy}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saveBusy}>
                                    {saveBusy ? 'Saving…' : 'Create in Google Calendar'}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (embedded) {
        return (
            <div className="rounded-xl bg-white dark:bg-[#1b2e4b] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-[#191e3a] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[#191e3a] bg-[#fbfbfb] dark:bg-[#121c2c]">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white">Calendar</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        Company holidays and Google Calendar (same account as sign-in).
                    </p>
                </div>
                <div className="p-3 sm:p-4">{panelInner}</div>
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
