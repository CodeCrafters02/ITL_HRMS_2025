import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { EmployeeTask, MyTasksResponse, TaskAssignment, TaskPriority, TaskStatus, fetchMyTasks, updateTaskAssignmentStatus } from './api';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';
import IconSearch from '../../../components/Icon/IconSearch';

type PriorityFilter = 'all' | TaskPriority;
type StatusFilter = 'all' | TaskStatus;
type ViewMode = 'card' | 'table';

const priorityStyleMap: Record<TaskPriority, string> = {
    high: 'bg-danger-light text-danger',
    medium: 'bg-warning-light text-warning',
    low: 'bg-success-light text-success',
};

const statusStyleMap: Record<TaskStatus, string> = {
    todo: 'bg-dark-light text-white-dark',
    inprogress: 'bg-info-light text-info',
    inreview: 'bg-secondary-light text-secondary',
    done: 'bg-success-light text-success',
};

const statusLabelMap: Record<TaskStatus, string> = {
    todo: 'To Do',
    inprogress: 'In Progress',
    inreview: 'In Review',
    done: 'Done',
};

const priorityLabelMap: Record<TaskPriority, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const parseDate = (value: string) => {
    if (!value) return null;
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string) => {
    const date = parseDate(value);
    if (!date) return value || '-';
    return date.toLocaleDateString();
};

const fullNameFromLocalStorage = () => {
    const first = (localStorage.getItem('first_name') || '').trim();
    const last = (localStorage.getItem('last_name') || '').trim();
    const combined = `${first} ${last}`.trim();
    const fallback = (localStorage.getItem('username') || '').trim();
    return (combined || fallback).toLowerCase();
};

const getOwnAssignment = (assignments: TaskAssignment[], currentUserName: string) =>
    assignments.find((assignment) => assignment.employee_name?.trim().toLowerCase() === currentUserName);

const MyTasks = () => {
    const dispatch = useDispatch();

    const [tasks, setTasks] = useState<EmployeeTask[]>([]);
    const [summary, setSummary] = useState<MyTasksResponse['summary'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
    const [updatingAssignmentId, setUpdatingAssignmentId] = useState<number | null>(null);

    const currentUserName = useMemo(() => fullNameFromLocalStorage(), []);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyTasks({
                search: search.trim(),
                status: statusFilter,
                priority: priorityFilter,
                page,
                page_size: pageSize,
            });
            setTasks(data.results || []);
            setSummary(data.summary);
            setTotalCount(data.count || 0);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tasks';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, priorityFilter, page, pageSize]);

    useEffect(() => {
        dispatch(setPageTitle('My Tasks'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTasks();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadTasks]);

    useEffect(() => {
        if (!selectedTask) return;
        const refreshedSelected = tasks.find((task) => task.id === selectedTask.id);
        if (refreshedSelected) {
            setSelectedTask(refreshedSelected);
        }
    }, [tasks, selectedTask]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const handleStatusUpdate = async (assignmentId: number, status: TaskStatus) => {
        try {
            setUpdatingAssignmentId(assignmentId);
            await updateTaskAssignmentStatus(assignmentId, status);
            await loadTasks();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update status';
            setError(message);
        } finally {
            setUpdatingAssignmentId(null);
        }
    };

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const statusSelect = (assignment: TaskAssignment) => (
        <select
            value={assignment.status}
            onChange={(e) => handleStatusUpdate(assignment.id, e.target.value as TaskStatus)}
            disabled={updatingAssignmentId === assignment.id}
            className="form-select text-xs py-1.5 px-2 disabled:opacity-60"
        >
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
            <option value="done">Done</option>
        </select>
    );

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <IconListCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">My Tasks</h1>
                        <p className="mt-1 text-white/75 text-sm md:text-base">Monitor assignments, update status, and keep work on schedule.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{error}</p>
                        <button type="button" onClick={loadTasks} className="btn btn-sm btn-danger">
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Assigned</p>
                    <p className="text-2xl font-bold mt-2">{summary?.total ?? 0}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">In Progress</p>
                    <p className="text-2xl font-bold mt-2 text-info">{summary?.in_progress ?? 0}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Completed</p>
                    <p className="text-2xl font-bold mt-2 text-success">{summary?.done ?? 0}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Overdue</p>
                    <p className="text-2xl font-bold mt-2 text-danger">{summary?.overdue ?? 0}</p>
                </div>
            </div>

            <div className="panel">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <div className="relative flex-1 min-w-[220px]">
                            <input
                                type="text"
                                className="form-input pl-10"
                                placeholder="Search title or description..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>

                        <select
                            className="form-select sm:w-[150px]"
                            value={priorityFilter}
                            onChange={(e) => {
                                setPriorityFilter(e.target.value as PriorityFilter);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>

                        <select
                            className="form-select sm:w-[160px]"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as StatusFilter);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="inreview">In Review</option>
                            <option value="done">Done</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('card')}
                            aria-label="Card view"
                        >
                            <IconLayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                            aria-label="Table view"
                        >
                            <IconListCheck className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {totalCount > 0 && (
                <div className="panel">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-white-dark">
                            Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary font-semibold">{totalCount}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-white-dark">Per page</label>
                            <select
                                className="form-select w-20 text-xs"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={6}>6</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button type="button" className="btn btn-sm btn-outline-primary px-2.5" onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? <li key={`dots-${idx}`} className="px-2 text-white-dark">...</li> : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ),
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {loading && tasks.length === 0 ? (
                <div className="panel text-center py-14 text-white-dark">
                    <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-primary border-l-transparent mb-3" />
                    <p>Loading tasks...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="panel text-center py-14 text-white-dark">
                    <IconListCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No tasks available for current filters.</p>
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tasks.map((task) => {
                        const ownAssign = getOwnAssignment(task.assignments, currentUserName);
                        const dueDate = parseDate(task.deadline);
                        const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

                        return (
                            <div key={task.id} className="panel border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base truncate">{task.title}</h3>
                                        <p className="text-xs text-white-dark mt-1 line-clamp-2 min-h-[34px]">{task.description || 'No description provided.'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span>
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedTask(task)}>
                                            View
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-white-dark">Progress</span>
                                        <span className="font-semibold text-primary">{task.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-[#ebedf2] dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-2">
                                        <p className="text-white-dark">Status</p>
                                        <p className="mt-1">
                                            <span className={`badge ${statusStyleMap[task.status]}`}>{statusLabelMap[task.status]}</span>
                                        </p>
                                    </div>
                                    <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-2">
                                        <p className="text-white-dark">Deadline</p>
                                        <p className={`font-semibold mt-1 ${isOverdue ? 'text-danger' : ''}`}>{formatDate(task.deadline)}</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <p className="text-[11px] text-white-dark mb-1.5">My Assignment</p>
                                    {ownAssign ? statusSelect(ownAssign) : <span className="text-xs text-white-dark">Not directly assigned</span>}
                                </div>

                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="panel p-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Priority</th>
                                    <th>Deadline</th>
                                    <th>Progress</th>
                                    <th>My Assignment</th>
                                    <th className="text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => {
                                    const ownAssign = getOwnAssignment(task.assignments, currentUserName);
                                    const dueDate = parseDate(task.deadline);
                                    const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

                                    return (
                                        <tr key={task.id}>
                                            <td className="font-semibold">
                                                <div className="max-w-[320px]">
                                                    <p className="truncate">{task.title}</p>
                                                    <p className="text-xs text-white-dark truncate mt-1">{task.description || '-'}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span>
                                            </td>
                                            <td className={isOverdue ? 'text-danger font-semibold' : ''}>{formatDate(task.deadline)}</td>
                                            <td>
                                                <div className="flex items-center gap-2 min-w-[130px]">
                                                    <div className="flex-1 h-1.5 bg-[#ebedf2] dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-primary">{task.progress}%</span>
                                                </div>
                                            </td>
                                            <td>{ownAssign ? statusSelect(ownAssign) : <span className="text-xs text-white-dark">-</span>}</td>
                                            <td className="text-center">
                                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedTask(task)}>
                                                    Open
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedTask && (
                <div className="fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelectedTask(null)}>
                    <div className="panel w-full max-w-3xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-bold">{selectedTask.title}</h3>
                                <p className="text-white-dark mt-1">{selectedTask.description || 'No description provided.'}</p>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSelectedTask(null)}>
                                Close
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-3">
                                <p className="text-xs text-white-dark">Priority</p>
                                <p className="font-semibold mt-1">{priorityLabelMap[selectedTask.priority]}</p>
                            </div>
                            <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-3">
                                <p className="text-xs text-white-dark">Status</p>
                                <p className="mt-1">
                                    <span className={`badge ${statusStyleMap[selectedTask.status]}`}>{statusLabelMap[selectedTask.status]}</span>
                                </p>
                            </div>
                            <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-3">
                                <p className="text-xs text-white-dark">Deadline</p>
                                <p className="font-semibold mt-1">{formatDate(selectedTask.deadline)}</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <h4 className="font-semibold mb-3">Subtasks ({selectedTask.subtask_details.length})</h4>
                            {selectedTask.subtask_details.length === 0 ? (
                                <p className="text-white-dark">No subtasks available.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedTask.subtask_details.map((sub) => (
                                        <div key={sub.id} className="rounded-md border border-white-light dark:border-[#1b2e4b] p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-semibold">{sub.title}</p>
                                                <span className={`badge ${statusStyleMap[sub.status]}`}>{statusLabelMap[sub.status]}</span>
                                            </div>
                                            <p className="text-sm text-white-dark mt-1">{sub.description || '-'}</p>
                                            <div className="mt-3 flex items-center justify-between text-xs text-white-dark">
                                                <span>Progress: {sub.progress}%</span>
                                                <span>Deadline: {formatDate(sub.deadline)}</span>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-[11px] text-white-dark mb-1.5">My Subtask Assignment</p>
                                                {(() => {
                                                    const ownSubtaskAssignment = getOwnAssignment(sub.assignments, currentUserName);
                                                    return ownSubtaskAssignment ? (
                                                        statusSelect(ownSubtaskAssignment)
                                                    ) : (
                                                        <span className="text-xs text-white-dark">Not directly assigned</span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTasks;
