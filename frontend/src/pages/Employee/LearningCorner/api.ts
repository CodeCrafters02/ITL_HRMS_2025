export interface LearningResource {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    video: string | null;
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
        throw new Error(detail || 'Failed to load learning resources');
    }
    return data as T;
};

export const fetchLearningResources = async (): Promise<LearningResource[]> => {
    const res = await fetch(`${EMPLOYEE_API}/emp-learning-corner/`, { headers: authHeaders() });
    const data = await parseJson<LearningResource[] | { results?: LearningResource[] }>(res);
    if (Array.isArray(data)) return data;
    return data.results || [];
};
