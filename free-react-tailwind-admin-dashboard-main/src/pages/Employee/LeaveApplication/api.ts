import { authFetch } from '../../../utils/authFetch';

export interface LeaveBalance {
    id: number;
    leave_name: string;
    count: number;
    is_paid: boolean;
    used_count: number;
    remaining_count: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type LeaveDuration = 'half_day' | 'full_day';

export interface LeaveRequest {
    id: number;
    company: number;
    employee_name: string;
    employee_id: string;
    reporting_manager_name: string;
    leave_type: number;
    leave_type_name: string;
    leave_duration?: LeaveDuration;
    status: LeaveStatus;
    reason: string;
    rejection_reason: string;
    from_date: string;
    to_date: string;
    created_at: string;
}

export interface CreateLeavePayload {
    leave_type: number;
    from_date: string;
    to_date: string;
    reason: string;
    leave_duration?: LeaveDuration;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const authHeaders = (json = true): HeadersInit => {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
};

const collectErrorMessages = (value: unknown, bucket: string[]) => {
    if (!value) return;
    if (typeof value === 'string') {
        const msg = value.trim();
        if (msg) bucket.push(msg);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectErrorMessages(item, bucket));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach((item) => collectErrorMessages(item, bucket));
    }
};

const parseApiError = (data: unknown): string => {
    const messages: string[] = [];
    collectErrorMessages(data, messages);
    const uniqueMessages = Array.from(new Set(messages.filter(Boolean)));
    if (uniqueMessages.length > 0) return uniqueMessages.join('\n');
    return 'Unable to process request. Please verify required fields and try again.';
};

const parseJson = async <T>(res: Response): Promise<T> => {
    const rawText = await res.text();
    let data: unknown = {};
    try {
        data = rawText ? JSON.parse(rawText) : {};
    } catch {
        data = rawText;
    }
    if (!res.ok) throw new Error(parseApiError(data));
    return data as T;
};

export const fetchLeaveBalances = async (): Promise<LeaveBalance[]> => {
    const res = await authFetch(`${EMPLOYEE_API}/leaves-list/`, { headers: authHeaders(false) });
    return parseJson<LeaveBalance[]>(res);
};

export interface PaginatedLeaveRequests {
    results: LeaveRequest[];
    count: number;
    total_pages: number;
}

export const fetchMyLeaveRequests = async (params?: { page?: number; page_size?: number; search?: string; status?: string }): Promise<PaginatedLeaveRequests> => {
    const url = new URL(`${EMPLOYEE_API}/employee-leave-create/`);
    if (params) {
        if (params.page) url.searchParams.set('page', String(params.page));
        if (params.page_size) url.searchParams.set('page_size', String(params.page_size));
        if (params.search) url.searchParams.set('search', params.search);
        if (params.status && params.status !== 'all') url.searchParams.set('status', params.status);
    }
    const res = await authFetch(url.toString(), { headers: authHeaders(false) });
    const data = await parseJson<any>(res);

    // Handle both paginated and non-paginated (backward compatibility) responses
    if (data.results && Array.isArray(data.results)) {
        return {
            results: data.results,
            count: data.count || data.results.length,
            total_pages: data.total_pages || 1
        };
    }

    const arr = Array.isArray(data) ? data : [];
    return {
        results: arr,
        count: arr.length,
        total_pages: 1
    };
};

export const createLeaveRequest = async (payload: CreateLeavePayload): Promise<LeaveRequest> => {
    const res = await authFetch(`${EMPLOYEE_API}/employee-leave-create/`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(payload),
    });
    return parseJson<LeaveRequest>(res);
};

export const cancelLeaveRequest = async (leaveId: number): Promise<void> => {
    const res = await authFetch(`${EMPLOYEE_API}/emp-leaves/${leaveId}/cancel/`, {
        method: 'POST',
        headers: authHeaders(false),
    });
    await parseJson<{ detail?: string }>(res);
};
