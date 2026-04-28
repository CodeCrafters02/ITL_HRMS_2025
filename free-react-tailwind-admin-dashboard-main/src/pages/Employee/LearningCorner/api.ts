import { authFetch } from '../../../utils/authFetch';

export interface LearningResource {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    video: string | null;
    document: string | null;
    links?: { title: string; url: string }[] | null;
}

export interface PaginatedLearningResources {
    results: LearningResource[];
    count: number;
    total_pages: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const parseJson = async <T>(res: Response): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(detail || 'Failed to load learning resources');
    }
    return data as T;
};

export const fetchLearningResources = async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    type?: string;
}): Promise<PaginatedLearningResources> => {
    const url = new URL(`${EMPLOYEE_API}/emp-learning-corner/`);
    if (params?.page) url.searchParams.set("page", String(params.page));
    if (params?.page_size) url.searchParams.set("page_size", String(params.page_size));
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.type && params.type !== "all") url.searchParams.set("type", params.type);

    const res = await authFetch(url.toString());
    const data = await parseJson<LearningResource[] | { results?: LearningResource[]; count?: number }>(res);
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
