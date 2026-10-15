import { authFetch } from '../../../utils/authFetch';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ManagerLeaveRequest {
    id: number;
    employee_name: string;
    reporting_manager_name: string;
    leave_type_name: string;
    leave_duration?: string | null;
    from_date: string;
    to_date: string;
    reason: string;
    rejection_reason: string;
    status: LeaveStatus;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const parseJson = async <T>(res: Response, fallback = 'Request failed'): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(detail || fallback);
    }
    return data as T;
};

export const fetchManagerLeaveRequests = async (): Promise<ManagerLeaveRequest[]> => {
    const res = await authFetch(`${EMPLOYEE_API}/emp-leaves/`);
    const data = await parseJson<ManagerLeaveRequest[] | { results?: ManagerLeaveRequest[] }>(res, 'Failed to load leave requests');
    return Array.isArray(data) ? data : data.results || [];
};

export interface ManagerLeavePage {
    results: ManagerLeaveRequest[];
    count: number;
    counts: Partial<Record<LeaveStatus, number>>;
}

/** Server-side page of leave requests (search + status filter handled by the backend). */
export const fetchManagerLeavePage = async (opts: { page: number; pageSize: number; search?: string; status?: string }): Promise<ManagerLeavePage> => {
    const url = new URL(`${EMPLOYEE_API}/emp-leaves/`);
    url.searchParams.set('page', String(opts.page));
    url.searchParams.set('page_size', String(opts.pageSize));
    if (opts.search?.trim()) url.searchParams.set('search', opts.search.trim());
    if (opts.status && opts.status !== 'all') url.searchParams.set('status', opts.status);
    const res = await authFetch(url.toString());
    const data = await parseJson<ManagerLeavePage | ManagerLeaveRequest[]>(res, 'Failed to load leave requests');
    if (Array.isArray(data)) return { results: data, count: data.length, counts: {} };
    return { results: data.results || [], count: data.count ?? (data.results || []).length, counts: data.counts || {} };
};

export const approveManagerLeave = async (leaveId: number): Promise<{ detail?: string }> => {
    const res = await authFetch(`${EMPLOYEE_API}/emp-leaves/${leaveId}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    return parseJson<{ detail?: string }>(res, 'Failed to approve leave');
};

export const rejectManagerLeave = async (leaveId: number, rejection_reason: string): Promise<{ detail?: string }> => {
    const res = await authFetch(`${EMPLOYEE_API}/emp-leaves/${leaveId}/reject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason }),
    });
    return parseJson<{ detail?: string }>(res, 'Failed to reject leave');
};
