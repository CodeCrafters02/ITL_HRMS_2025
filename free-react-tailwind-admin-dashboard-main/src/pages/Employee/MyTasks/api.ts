import { authFetch } from '../../../utils/authFetch';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done';
export type TaskRole = 'owner' | 'contributor';

export interface TaskAssignment {
    id: number;
    task: number;
    employee: number;
    role: TaskRole;
    status: TaskStatus;
    is_seen: boolean;
    employee_name: string;
    avatar_url: string | null;
}

export interface EmployeeSubtask {
    id: number;
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    status: TaskStatus;
    assignments: TaskAssignment[];
    progress: number;
}

export interface EmployeeTask {
    id: number;
    title: string;
    description: string;
    contributors: string[];
    created_by: number;
    created_at: string;
    deadline: string;
    priority: TaskPriority;
    status: TaskStatus;
    subtask_details: EmployeeSubtask[];
    assignments: TaskAssignment[];
    progress: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const authHeaders = (): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    return headers;
};

const parseJson = async <T>(res: Response): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(detail || 'Request failed');
    }
    return data as T;
};

export interface MyTasksResponse {
    results: EmployeeTask[];
    count: number;
    next: string | null;
    previous: string | null;
    summary: {
        total: number;
        done: number;
        in_progress: number;
        overdue: number;
    };
}

export const fetchMyTasks = async (params: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    page_size?: number;
}): Promise<MyTasksResponse> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());

    const res = await authFetch(`${EMPLOYEE_API}/my-tasks/?${query.toString()}`, { headers: authHeaders() });
    return parseJson<MyTasksResponse>(res);
};

export const updateTaskAssignmentStatus = async (assignmentId: number, status: TaskStatus): Promise<void> => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks-assignment/${assignmentId}/status/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
    });
    await parseJson<{ detail?: string }>(res);
};
