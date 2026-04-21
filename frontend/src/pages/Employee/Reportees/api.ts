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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;
const APP_API = `${API_BASE_URL}/app`;

const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

const parseJson = async <T>(res: Response, fallback = 'Request failed'): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string; error?: string }).detail || (data as { detail?: string; error?: string }).error;
        throw new Error(detail || fallback);
    }
    return data as T;
};

export const fetchMyEmployeeId = async (): Promise<number> => {
    const res = await fetch(`${EMPLOYEE_API}/employee-id/`, { headers: authHeaders() });
    const data = await parseJson<EmployeeIdResponse>(res, 'Failed to fetch employee profile');
    return data.id;
};

export const fetchMyReportees = async (): Promise<Reportee[]> => {
    const employeeId = await fetchMyEmployeeId();
    const res = await fetch(`${APP_API}/getreportees/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ employee_id: employeeId }),
    });
    return parseJson<Reportee[]>(res, 'Failed to fetch reportees');
};
