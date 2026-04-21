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
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

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

    const res = await fetch(url.toString(), { headers: authHeaders() });
    return parseJson<AttendanceHistoryResponse>(res);
};
