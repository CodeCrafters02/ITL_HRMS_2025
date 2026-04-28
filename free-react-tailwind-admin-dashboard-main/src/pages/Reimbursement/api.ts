import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/app/`;

export interface ReimbursementCategory {
    id: number;
    name: string;
    description: string;
    min_tenure_months: number;
    company: number;
}

export interface ReimbursementRequest {
    id: number;
    employee: number;
    employee_name: string;
    category: number;
    category_name: string;
    amount: number;
    description: string;
    bill_attachment: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reporting_manager: number | null;
    reporting_manager_name: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
}

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        Authorization: `Bearer ${token}`,
    };
};

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export const fetchCategories = async (params?: any): Promise<PaginatedResponse<ReimbursementCategory>> => {
    const response = await axios.get(`${API_URL}reimbursement-categories/`, { headers: getHeaders(), params });
    return response.data;
};

export const createCategory = async (data: Partial<ReimbursementCategory>) => {
    const response = await axios.post(`${API_URL}reimbursement-categories/`, data, { headers: getHeaders() });
    return response.data;
};

export const updateCategory = async (id: number, data: Partial<ReimbursementCategory>) => {
    const response = await axios.put(`${API_URL}reimbursement-categories/${id}/`, data, { headers: getHeaders() });
    return response.data;
};

export const deleteCategory = async (id: number) => {
    const response = await axios.delete(`${API_URL}reimbursement-categories/${id}/`, { headers: getHeaders() });
    return response.data;
};

export const fetchReimbursements = async (params?: any): Promise<PaginatedResponse<ReimbursementRequest>> => {
    const response = await axios.get(`${API_URL}reimbursement-requests/`, { headers: getHeaders(), params });
    return response.data;
};

export const fetchReimbursementStats = async (params?: any) => {
    const response = await axios.get(`${API_URL}reimbursement-requests/stats/`, { headers: getHeaders(), params });
    return response.data;
};

export const createReimbursement = async (formData: FormData) => {
    const response = await axios.post(`${API_URL}reimbursement-requests/`, formData, {
        headers: {
            ...getHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const approveReimbursement = async (id: number) => {
    const response = await axios.post(`${API_URL}reimbursement-requests/${id}/approve/`, {}, { headers: getHeaders() });
    return response.data;
};

export const rejectReimbursement = async (id: number, reason: string) => {
    const response = await axios.post(`${API_URL}reimbursement-requests/${id}/reject/`, { rejection_reason: reason }, { headers: getHeaders() });
    return response.data;
};
