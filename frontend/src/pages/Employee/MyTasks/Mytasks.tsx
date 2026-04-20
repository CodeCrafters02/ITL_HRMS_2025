import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { EmployeeSubtask, EmployeeTask, TaskAssignment, TaskPriority, TaskStatus, fetchMyTasks, updateTaskAssignmentStatus } from './api';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
    const [updatingAssignmentId, setUpdatingAssignmentId] = useState<number | null>(null);

    const currentUserName = useMemo(() => fullNameFromLocalStorage(), []);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMyTasks();
            setTasks(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tasks';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('My Tasks'));
    }, [dispatch]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const filteredTasks = useMemo(() => {
        const loweredSearch = search.trim().toLowerCase();
        return tasks.filter((task) => {
            const matchesSearch =
                loweredSearch.length === 0 ||
                task.title.toLowerCase().includes(loweredSearch) ||
                task.description.toLowerCase().includes(loweredSearch) ||
                task.subtask_details.some((subtask) => subtask.title.toLowerCase().includes(loweredSearch));

            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            return matchesSearch && matchesPriority && matchesStatus;
        });
    }, [tasks, search, priorityFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
    const clampedPage = Math.min(currentPage, totalPages);
    const pageStart = (clampedPage - 1) * itemsPerPage;
    const paginatedTasks = filteredTasks.slice(pageStart, pageStart + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, priorityFilter, statusFilter, itemsPerPage]);

    const totalCount = tasks.length;
    const doneCount = tasks.filter((task) => task.status === 'done').length;
    const inProgressCount = tasks.filter((task) => task.status === 'inprogress' || task.status === 'inreview').length;
    const overdueCount = tasks.filter((task) => {
        if (task.status === 'done') return false;
        const date = parseDate(`${task.deadline}T23:59:59`);
        if (!date) return false;
        return date.getTime() < Date.now();
    }).length;

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

    if (loading) {
        return (
            <div className="panel min-h-[320px] flex items-center justify-center">
                <div className="text-center">
                    <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent" />
                    <p className="mt-3 text-white-dark">Loading your tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">My Tasks</h1>
                        <p className="mt-1 text-white/80">Track your assigned tasks, update progress, and review subtasks.</p>
                    </div>
                    <button type="button" onClick={loadTasks} className="btn btn-outline-light w-full md:w-auto">
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total Tasks</p>
                    <p className="text-2xl font-bold mt-2">{totalCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Completed</p>
                    <p className="text-2xl font-bold mt-2 text-success">{doneCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">In Progress</p>
                    <p className="text-2xl font-bold mt-2 text-info">{inProgressCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Overdue</p>
                    <p className="text-2xl font-bold mt-2 text-danger">{overdueCount}</p>
                </div>
            </div>

            <div className="panel space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <input
                        type="text"
                        className="form-input lg:col-span-2"
                        placeholder="Search by task or subtask title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="form-select"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                        <option value="all">All Statuses</option>
                        <option value="todo">To Do</option>
                        <option value="inprogress">In Progress</option>
                        <option value="inreview">In Review</option>
                        <option value="done">Done</option>
                    </select>
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('card')}
                            aria-label="Card view"
                        >
                            <IconLayoutGrid className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                            aria-label="Table view"
                        >
                            <IconListCheck className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-white-dark">
                    <p>
                        Showing {filteredTasks.length} of {tasks.length} tasks
                    </p>
                    {(search || priorityFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            type="button"
                            className="text-primary hover:underline w-fit"
                            onClick={() => {
                                setSearch('');
                                setPriorityFilter('all');
                                setStatusFilter('all');
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {filteredTasks.length === 0 ? (
                <div className="panel py-14 text-center">
                    <h3 className="text-xl font-semibold">No tasks found</h3>
                    <p className="text-white-dark mt-2">Try changing your filters or search text.</p>
                </div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginatedTasks.map((task) => {
                        const ownAssignment = getOwnAssignment(task.assignments, currentUserName);
                        return (
                            <div key={task.id} className="panel h-full flex flex-col border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-base font-bold leading-snug">{task.title}</h3>
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedTask(task)}>
                                        View
                                    </button>
                                </div>
                                <p className="mt-3 text-sm text-white-dark min-h-[42px]">{task.description || 'No description available.'}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span>
                                    <span className={`badge ${statusStyleMap[task.status]}`}>{statusLabelMap[task.status]}</span>
                                </div>

                                <div className="mt-4 space-y-2 text-sm text-white-dark">
                                    <p>
                                        <span className="font-semibold">Deadline:</span> {formatDate(task.deadline)}
                                    </p>
                                    <p>
                                        <span className="font-semibold">Subtasks:</span> {task.subtask_details.length}
                                    </p>
                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="font-semibold">Progress</span>
                                            <span>{task.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-[#ebedf2] dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white-light dark:border-[#1b2e4b]">
                                    <p className="text-xs uppercase tracking-wide text-white-dark mb-2">My Status</p>
                                    {ownAssignment ? (
                                        statusSelect(ownAssignment)
                                    ) : (
                                        <p className="text-xs text-warning">No direct assignment found for your profile.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="panel overflow-x-auto p-0">
                    <table className="table-hover w-full">
                        <thead>
                            <tr>
                                <th>Task</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Deadline</th>
                                <th>Progress</th>
                                <th>My Status</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTasks.map((task) => {
                                const ownAssignment = getOwnAssignment(task.assignments, currentUserName);
                                return (
                                    <tr key={task.id}>
                                        <td>
                                            <p className="font-semibold">{task.title}</p>
                                            <p className="text-xs text-white-dark mt-1">{task.subtask_details.length} subtasks</p>
                                        </td>
                                        <td>
                                            <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusStyleMap[task.status]}`}>{statusLabelMap[task.status]}</span>
                                        </td>
                                        <td>{formatDate(task.deadline)}</td>
                                        <td>{task.progress}%</td>
                                        <td>{ownAssignment ? statusSelect(ownAssignment) : <span className="text-xs text-warning">N/A</span>}</td>
                                        <td className="text-center">
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedTask(task)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredTasks.length > 0 && (
                <div className="panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-white-dark">Items per page</span>
                        <select
                            className="form-select w-24 py-1.5"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value={6}>6</option>
                            <option value={12}>12</option>
                            <option value={24}>24</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={clampedPage === 1}
                        >
                            Prev
                        </button>
                        <span className="text-sm text-white-dark">
                            Page {clampedPage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={clampedPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {selectedTask && (
                <div className="fixed inset-0 z-[1000] bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelectedTask(null)}>
                    <div
                        className="panel w-full max-w-4xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold">{selectedTask.title}</h3>
                                <p className="text-white-dark mt-1">Created {formatDate(selectedTask.created_at)} · Due {formatDate(selectedTask.deadline)}</p>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSelectedTask(null)}>
                                Close
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className={`badge ${priorityStyleMap[selectedTask.priority]}`}>{priorityLabelMap[selectedTask.priority]}</span>
                            <span className={`badge ${statusStyleMap[selectedTask.status]}`}>{statusLabelMap[selectedTask.status]}</span>
                        </div>

                        <div className="mt-5 panel bg-[#f8f9fa] dark:bg-[#060818]">
                            <p className="text-sm font-semibold mb-2">Description</p>
                            <p className="text-sm text-white-dark">{selectedTask.description || 'No description available.'}</p>
                        </div>

                        <div className="mt-5">
                            <h4 className="font-bold mb-3">Subtasks Assigned to You</h4>
                            {selectedTask.subtask_details.length === 0 ? (
                                <div className="panel bg-[#f8f9fa] dark:bg-[#060818]">
                                    <p className="text-sm text-white-dark">No subtasks assigned under this task.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedTask.subtask_details.map((subtask: EmployeeSubtask) => {
                                        const ownAssignment = getOwnAssignment(subtask.assignments, currentUserName);
                                        return (
                                            <div key={subtask.id} className="panel border border-white-light dark:border-[#1b2e4b]">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                    <div>
                                                        <p className="font-semibold">{subtask.title}</p>
                                                        <p className="text-sm text-white-dark mt-1">{subtask.description || 'No description'}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => ownAssignment && handleStatusUpdate(ownAssignment.id, 'done')}
                                                        disabled={!ownAssignment || ownAssignment.status === 'done' || updatingAssignmentId === ownAssignment.id}
                                                    >
                                                        Mark Done
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className={`badge ${priorityStyleMap[subtask.priority]}`}>{priorityLabelMap[subtask.priority]}</span>
                                                    <span className={`badge ${statusStyleMap[subtask.status]}`}>{statusLabelMap[subtask.status]}</span>
                                                    <span className="text-xs text-white-dark">Due {formatDate(subtask.deadline)}</span>
                                                </div>
                                                <div className="mt-3">
                                                    {ownAssignment ? (
                                                        <div className="max-w-[180px]">{statusSelect(ownAssignment)}</div>
                                                    ) : (
                                                        <p className="text-xs text-warning">No personal assignment mapping found.</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
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
