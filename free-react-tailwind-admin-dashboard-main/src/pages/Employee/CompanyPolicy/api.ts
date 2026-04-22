export interface CompanyPolicy {
    id: number;
    name: string;
    document: string | null;
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
        throw new Error(detail || 'Failed to load company policies');
    }
    return data as T;
};

export const fetchCompanyPolicies = async (): Promise<CompanyPolicy[]> => {
    const res = await fetch(`${EMPLOYEE_API}/employee-companypolicies/`, { headers: authHeaders() });
    const data = await parseJson<CompanyPolicy[] | { results?: CompanyPolicy[] }>(res);
    if (Array.isArray(data)) return data;
    return data.results || [];
};
