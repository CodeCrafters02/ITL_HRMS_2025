export type ReferenceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface EmployeeReferenceItem {
    id: number;
    employee: number;
    employee_name?: string;
    employee_id?: string;
    employee_email?: string;
    employee_designation?: string;
    employee_department?: string;
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    resume?: string | null;
    status: ReferenceStatus;
    admin_comment?: string | null;
    submitted_at: string;
    updated_at: string;
}

interface PaginatedResponse<T> {
    count: number;
    results: T[];
}

export interface CreateReferencePayload {
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    resume?: File | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_REFERENCE_API = `${API_BASE_URL}/employee/employeereference/`;

const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

const parseJson = async <T>(res: Response, fallback = 'Request failed'): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string; error?: string; non_field_errors?: string[] }).detail
            || (data as { detail?: string; error?: string; non_field_errors?: string[] }).error
            || (data as { detail?: string; error?: string; non_field_errors?: string[] }).non_field_errors?.[0];
        throw new Error(detail || fallback);
    }
    return data as T;
};

export const buildResumeUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith('http')) return value;
    return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

export const fetchMyReferences = async (): Promise<EmployeeReferenceItem[]> => {
    const res = await fetch(`${EMPLOYEE_REFERENCE_API}?page_size=100`, { headers: authHeaders() });
    const data = await parseJson<EmployeeReferenceItem[] | PaginatedResponse<EmployeeReferenceItem>>(res, 'Failed to load references');
    if (Array.isArray(data)) return data;
    return data.results || [];
};

export const createReference = async (payload: CreateReferencePayload): Promise<EmployeeReferenceItem> => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('designation', payload.designation);
    formData.append('contact_number', payload.contact_number);
    formData.append('email', payload.email);
    if (payload.resume) formData.append('resume', payload.resume);

    const res = await fetch(EMPLOYEE_REFERENCE_API, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });
    return parseJson<EmployeeReferenceItem>(res, 'Failed to submit reference');
};
