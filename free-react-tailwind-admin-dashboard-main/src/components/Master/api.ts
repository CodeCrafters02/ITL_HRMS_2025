import Swal from 'sweetalert2';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

const FIELD_LABELS: Record<string, string> = {
    non_field_errors: '',
    detail: '',
    error: '',
    admin_username_input: 'Admin username',
    admin_email_input: 'Admin email',
    admin_password: 'Admin password',
    phone_number: 'Phone number',
    first_name: 'First name',
    last_name: 'Last name',
};

const labelFor = (key: string) => (key in FIELD_LABELS ? FIELD_LABELS[key] : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '));

/** Turns a DRF error body ({field: [msg]}, {detail: msg}, [msg] ...) into readable text. */
export const formatApiError = (body: unknown, fallback = 'Something went wrong. Please try again.'): string => {
    if (!body) return fallback;
    if (typeof body === 'string') return body.length > 300 ? fallback : body;
    if (Array.isArray(body)) return body.map((item) => formatApiError(item, '')).filter(Boolean).join(' ') || fallback;
    if (typeof body === 'object') {
        const lines = Object.entries(body as Record<string, unknown>)
            .map(([key, value]) => {
                const text = formatApiError(value, '');
                const label = labelFor(key);
                return text ? (label ? `${label}: ${text}` : text) : '';
            })
            .filter(Boolean);
        return lines.join('\n') || fallback;
    }
    return String(body);
};

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    params?: QueryParams;
    body?: Record<string, unknown> | FormData;
    signal?: AbortSignal;
}

/** Authenticated request against the HRMS API. Throws ApiError with a readable message. */
export async function apiRequest<T = any>(path: string, { method = 'GET', params, body, signal }: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });

    const headers: Record<string, string> = {};
    const token = localStorage.getItem('access_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const isForm = body instanceof FormData;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    const response = await fetch(url.toString(), {
        method,
        headers,
        signal,
        body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });

    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(formatApiError(data, `Request failed (${response.status}).`), response.status);
    return data as T;
}

export const notifySuccess = (message: string) =>
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: 'sweet-alerts' },
    });

export const notifyError = (message: string, title = 'Something went wrong') =>
    Swal.fire({ icon: 'error', title, text: message, customClass: { popup: 'sweet-alerts' } });

export const confirmDanger = async (title: string, text: string, confirmText = 'Yes, delete') => {
    const result = await Swal.fire({
        icon: 'warning',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        customClass: { popup: 'sweet-alerts' },
        padding: '2em',
    });
    return result.isConfirmed;
};
