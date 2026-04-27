import { authFetch } from '../../../utils/authFetch';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done';

export interface TaskAssignment {
    id: number;
    employee: number;
    role: 'owner' | 'contributor';
    status: TaskStatus;
    employee_name: string;
}

export interface ManagerSubtask {
    id: number;
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    status: TaskStatus;
    progress: number;
    assignments: TaskAssignment[];
}

export interface ManagerTask {
    id: number;
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    status: TaskStatus;
    progress: number;
    assignments: TaskAssignment[];
    subtask_details?: ManagerSubtask[];
}

export interface NewSubtaskPayload {
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    assignedEmployees: number[];
    taskOwner: number | null;
}

export interface CreateTaskPayload {
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    assignedEmployees: number[];
    taskOwner: number | null;
    subtasks: NewSubtaskPayload[];
}

export interface PaginatedManagerTasks {
    results: ManagerTask[];
    count: number;
    next: string | null;
    previous: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYEE_API = `${API_BASE_URL}/employee`;

const parseJson = async <T>(res: Response, fallback = 'Request failed'): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        throw new Error(detail || fallback);
    }
    return data as T;
};

export const fetchManagerTasks = async (params?: { page?: number; page_size?: number; search?: string }): Promise<PaginatedManagerTasks> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search?.trim()) query.set('search', params.search.trim());
    const url = `${EMPLOYEE_API}/tasks/${query.toString() ? `?${query.toString()}` : ''}`;

    const res = await authFetch(url);
    const data = await parseJson<PaginatedManagerTasks | ManagerTask[]>(res, 'Failed to load tasks');
    if (Array.isArray(data)) {
        return {
            results: data,
            count: data.length,
            next: null,
            previous: null,
        };
    }
    return data;
};

export const createManagerTask = async (payload: CreateTaskPayload): Promise<ManagerTask> => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseJson<ManagerTask>(res, 'Failed to create task');
};

export const fetchManagerTaskDetail = async (taskId: number): Promise<ManagerTask> => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks/${taskId}/`);
    return parseJson<ManagerTask>(res, 'Failed to load task details');
};

export const updateManagerTask = async (
    taskId: number,
    payload: Partial<Pick<ManagerTask, 'title' | 'description' | 'deadline' | 'priority' | 'status'>>
): Promise<ManagerTask> => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return parseJson<ManagerTask>(res, 'Failed to update task');
};

export const reassignManagerTask = async (taskId: number, owner: number, employees: number[]) => {
    const res = await authFetch(`${EMPLOYEE_API}/task-assign/${taskId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, employees }),
    });
    return parseJson<{ detail?: string }>(res, 'Failed to reassign task');
};

export const reassignManagerSubtask = async (subtaskId: number, owner: number, contributors: number[]) => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks/subtask-assign/${subtaskId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, contributors }),
    });
    return parseJson<{ detail?: string }>(res, 'Failed to reassign subtask');
};

export const createManagerSubtask = async (parentTaskId: number, payload: NewSubtaskPayload): Promise<ManagerTask> => {
    const res = await authFetch(`${EMPLOYEE_API}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent_task: parentTaskId,
            title: payload.title,
            description: payload.description,
            deadline: payload.deadline,
            priority: payload.priority,
            assignedEmployees: payload.assignedEmployees,
            taskOwner: payload.taskOwner,
            subtasks: [],
        }),
    });
    return parseJson<ManagerTask>(res, 'Failed to create subtask');
};
