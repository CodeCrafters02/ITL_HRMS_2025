import { authFetch } from '../../../utils/authFetch';

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'half_day' | 'weekend' | 'checked_in' | 'no_data';

export interface AttendanceDayRecord {
    date: string;
    day_name: string;
    check_in: string;
    check_out: string;
    shift: string;
    is_weekend: boolean;
    status: AttendanceStatus;
    is_late: boolean;
    late_duration: string | null;
    total_hours: number | '-';
    overtime_hours: number | '-';
    break_time: string;
}

export interface AttendanceSummary {
    present: number;
    absent: number;
    leave: number;
    half_day: number;
    late: number;
    working_days: number;
}

export interface AttendanceOption {
    value: number;
    name: string;
}

export interface AttendanceHistoryResponse {
    months: AttendanceOption[];
    years: number[];
    selected_month: number;
    selected_year: number;
    selected_month_name: string;
    monthly_data: AttendanceDayRecord[];
    summary: AttendanceSummary;
    count: number;
    total_pages: number;
}

export interface CalendarHolidayEvent {
    id: number;
    date: string;
    name: string;
    is_holiday: boolean;
    description?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;
const APP_API = `${API_BASE_URL}/app`;

const parseJson = async <T>(res: Response): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(detail || 'Failed to load attendance history');
    }
    return data as T;
};

export const fetchAttendanceHistory = async (params: { 
    month?: number; 
    year?: number; 
    search?: string; 
    status?: string; 
    page?: number; 
    page_size?: number;
}): Promise<AttendanceHistoryResponse> => {
    const url = new URL(`${EMPLOYEE_API}/attendance-history/`);
    if (params.month) url.searchParams.set('month', String(params.month));
    if (params.year) url.searchParams.set('year', String(params.year));
    if (params.search) url.searchParams.set('search', params.search);
    if (params.status && params.status !== 'all') url.searchParams.set('status', params.status);
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.page_size) url.searchParams.set('page_size', String(params.page_size));

    const res = await authFetch(url.toString());
    return parseJson<AttendanceHistoryResponse>(res);
};

export const fetchCompanyHolidays = async (): Promise<CalendarHolidayEvent[]> => {
    const res = await authFetch(`${APP_API}/calendar-events/`);
    const data = await parseJson<CalendarHolidayEvent[] | { results?: CalendarHolidayEvent[] }>(res);
    const events = Array.isArray(data) ? data : data.results || [];
    return events.filter((event) => event?.is_holiday);
};
