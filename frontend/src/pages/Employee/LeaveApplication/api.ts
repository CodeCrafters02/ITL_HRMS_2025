export interface LeaveBalance {
    id: number;
    leave_name: string;
    count: number;
    is_paid: boolean;
    used_count: number;
    remaining_count: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
    id: number;
    company: number;
    employee_name: string;
    employee_id: string;
    reporting_manager_name: string;
    leave_type: number;
    leave_type_name: string;
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
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const authHeaders = (json = true): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

const parseApiError = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object') return 'Request failed';

    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (Array.isArray(obj.non_field_errors) && typeof obj.non_field_errors[0] === 'string') return obj.non_field_errors[0];

    const firstValue = Object.values(obj)[0];
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
    return 'Request failed';
};

const parseJson = async <T>(res: Response): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseApiError(data));
    return data as T;
};

export const fetchLeaveBalances = async (): Promise<LeaveBalance[]> => {
    const res = await fetch(`${EMPLOYEE_API}/leaves-list/`, { headers: authHeaders(false) });
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
    const res = await fetch(url.toString(), { headers: authHeaders(false) });
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
    const res = await fetch(`${EMPLOYEE_API}/employee-leave-create/`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(payload),
    });
    return parseJson<LeaveRequest>(res);
};

export const cancelLeaveRequest = async (leaveId: number): Promise<void> => {
    const res = await fetch(`${EMPLOYEE_API}/emp-leaves/${leaveId}/cancel/`, {
        method: 'POST',
        headers: authHeaders(false),
    });
    await parseJson<{ detail?: string }>(res);
};
