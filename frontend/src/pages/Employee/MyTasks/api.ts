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
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
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

export const fetchMyTasks = async (): Promise<EmployeeTask[]> => {
    const res = await fetch(`${EMPLOYEE_API}/my-tasks/`, { headers: authHeaders() });
    const data = await parseJson<EmployeeTask[] | { results?: EmployeeTask[] }>(res);
    if (Array.isArray(data)) return data;
    return data.results || [];
};

export const updateTaskAssignmentStatus = async (assignmentId: number, status: TaskStatus): Promise<void> => {
    const res = await fetch(`${EMPLOYEE_API}/tasks-assignment/${assignmentId}/status/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
    });
    await parseJson<{ detail?: string }>(res);
};
