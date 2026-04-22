import { authFetch } from '../../../utils/authFetch';

export interface Reportee {
    id: number;
    employee_id: string | null;
    full_name: string;
    status: string;
    department_name: string | null;
    designation_name: string | null;
    photo: string | null;
    is_checked_in: boolean;
}

interface EmployeeIdResponse {
    id: number;
    full_name: string;
}

export interface PaginatedReportees {
    results: Reportee[];
    count: number;
    total_pages: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;
const APP_API = `${API_BASE_URL}/app`;

const parseJson = async <T>(res: Response, fallback = 'Request failed'): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string; error?: string }).detail || (data as { detail?: string; error?: string }).error;
        throw new Error(detail || fallback);
    }
    return data as T;
};

export const fetchMyEmployeeId = async (): Promise<number> => {
    const res = await authFetch(`${EMPLOYEE_API}/employee-id/`);
    const data = await parseJson<EmployeeIdResponse>(res, 'Failed to fetch employee profile');
    return data.id;
};

export const fetchMyReportees = async (params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedReportees> => {
    const employeeId = await fetchMyEmployeeId();
    const url = new URL(`${APP_API}/getreportees/`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.page_size) url.searchParams.set("page_size", String(params.page_size));
    if (params?.search) url.searchParams.set("search", params.search);

    const res = await authFetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, search: params?.search || "" }),
    });
    const data = await parseJson<Reportee[] | { results?: Reportee[]; count?: number }>(res, 'Failed to fetch reportees');
    if (Array.isArray(data)) {
        return {
            results: data,
            count: data.length,
            total_pages: 1,
        };
    }
    const results = data.results || [];
    const count = data.count ?? results.length;
    const pageSize = Math.max(1, params?.page_size || 10);
    return {
        results,
        count,
        total_pages: Math.max(1, Math.ceil(count / pageSize)),
    };
};
