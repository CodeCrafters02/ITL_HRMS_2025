import { authFetch } from '../../../utils/authFetch';

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
    total_pages?: number;
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

export interface PaginatedReferences {
    results: EmployeeReferenceItem[];
    count: number;
    total_pages: number;
}

export const fetchMyReferences = async (params?: { page?: number; page_size?: number; search?: string; status?: string }): Promise<PaginatedReferences> => {
    const url = new URL(EMPLOYEE_REFERENCE_API);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.page_size) url.searchParams.set("page_size", String(params.page_size));
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.status && params.status !== "All") url.searchParams.set("status", params.status);

    const res = await authFetch(url.toString());
    const data = await parseJson<EmployeeReferenceItem[] | PaginatedResponse<EmployeeReferenceItem>>(res, 'Failed to load references');
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
        total_pages: data.total_pages || Math.max(1, Math.ceil(count / pageSize)),
    };
};

export const createReference = async (payload: CreateReferencePayload): Promise<EmployeeReferenceItem> => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('designation', payload.designation);
    formData.append('contact_number', payload.contact_number);
    formData.append('email', payload.email);
    if (payload.resume) formData.append('resume', payload.resume);

    const res = await authFetch(EMPLOYEE_REFERENCE_API, {
        method: 'POST',
        body: formData,
    });
    return parseJson<EmployeeReferenceItem>(res, 'Failed to submit reference');
};
