import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { EmployeeTask, MyTasksResponse, TaskAssignment, TaskPriority, TaskStatus, fetchMyTasks, updateTaskAssignmentStatus } from './api';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';

import Button from '../../../components/Common/Button';
import PageHeader from '../../../components/Common/PageHeader';
import DataTable, { Column } from '../../../components/Common/DataTable';
import CardGrid from '../../../components/Common/CardGrid';
import Modal from '../../../components/Common/Modal';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import IconClock from '../../../components/Icon/IconClock';
import IconChecks from '../../../components/Icon/IconChecks';
import IconInfoTriangle from '../../../components/Icon/IconInfoTriangle';
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

const formatDateTime = (value: string) => {
    if (!value) return '-';
    return value.replace('T', ' ');
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

    const filterControls = (
        <>
            <select className="form-select h-10 w-40 rounded-xl" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value as PriorityFilter); setPage(1); }}>
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
            </select>
            <select className="form-select h-10 w-44 rounded-xl" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="inreview">In Review</option>
                <option value="done">Done</option>
            </select>
        </>
    );

    const viewSwitcher = (
        <div className="flex items-center gap-1.5">
            <Button size="sm" variant={viewMode === 'card' ? 'primary' : 'outline'} onClick={() => setViewMode('card')} aria-label="Card view"><IconLayoutGrid /></Button>
            <Button size="sm" variant={viewMode === 'table' ? 'primary' : 'outline'} onClick={() => setViewMode('table')} aria-label="Table view"><IconListCheck /></Button>
        </div>
    );

    const columns: Column<EmployeeTask>[] = [
        {
            key: 'title', title: 'Task',
            render: (_v, task) => (
                <div className="max-w-[320px]">
                    <p className="truncate font-semibold">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-white-dark">{task.description || '-'}</p>
                </div>
            ),
        },
        { key: 'priority', title: 'Priority', render: (_v, task) => <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span> },
        {
            key: 'deadline', title: 'Deadline',
            render: (_v, task) => {
                const dueDate = parseDate(task.deadline);
                const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;
                return <span className={isOverdue ? 'font-semibold text-danger' : ''}>{formatDate(task.deadline)}</span>;
            },
        },
        { key: 'created_at', title: 'Created On', hideBelow: 'lg', render: (_v, task) => formatDateTime(task.created_at) },
        {
            key: 'progress', title: 'Progress',
            render: (_v, task) => (
                <div className="flex min-w-[130px] items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-primary">{task.progress}%</span>
                </div>
            ),
        },
        {
            key: 'assignments', title: 'My Assignment', hideBelow: 'md',
            render: (_v, task) => {
                const ownAssign = getOwnAssignment(task.assignments, currentUserName);
                return ownAssign ? statusSelect(ownAssign) : <span className="text-xs text-white-dark">-</span>;
            },
        },
        { key: 'details', title: 'Details', align: 'center', render: (_v, task) => <Button variant="outline" size="sm" onClick={() => setSelectedTask(task)}>Open</Button> },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="My Tasks"
                subtitle="Monitor assignments, update status, and keep work on schedule."
            />

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{error}</p>
                        <Button variant="danger" size="sm" type="button" onClick={loadTasks}>
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            <StatGrid cols={4} className="!mb-0">
                <StatCard label="Assigned" value={summary?.total ?? 0} tone="primary" icon={<IconListCheck />} />
                <StatCard label="In Progress" value={summary?.in_progress ?? 0} tone="info" icon={<IconClock />} />
                <StatCard label="Completed" value={summary?.done ?? 0} tone="success" icon={<IconChecks />} />
                <StatCard label="Overdue" value={summary?.overdue ?? 0} tone="danger" icon={<IconInfoTriangle />} />
            </StatGrid>

            {viewMode === 'table' ? (
                <DataTable
                    columns={columns}
                    data={tasks}
                    loading={loading}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[6, 10, 20, 50]}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    onRefresh={loadTasks}
                    searchPlaceholder="Search title or description..."
                    emptyMessage="No tasks available for current filters"
                    entityLabel="tasks"
                    filters={filterControls}
                    actionButton={viewSwitcher}
                />
            ) : (
                <CardGrid
                    items={tasks}
                    loading={loading}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[6, 10, 20, 50]}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    onRefresh={loadTasks}
                    searchPlaceholder="Search title or description..."
                    emptyMessage="No tasks available for current filters"
                    entityLabel="tasks"
                    filters={filterControls}
                    actions={viewSwitcher}
                    renderCard={(task) => {
                        const ownAssign = getOwnAssignment(task.assignments, currentUserName);
                        const dueDate = parseDate(task.deadline);
                        const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

                        return (
                            <div className="panel border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base truncate">{task.title}</h3>
                                        <p className="text-xs text-white-dark mt-1 line-clamp-2 min-h-[34px]">{task.description || 'No description provided.'}</p>
                                        <p className="text-[11px] text-white-dark mt-1">Created: {formatDateTime(task.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`badge ${priorityStyleMap[task.priority]}`}>{priorityLabelMap[task.priority]}</span>
                                        <Button variant="outline" size="sm" type="button"  onClick={() => setSelectedTask(task)}>
                                            View
                                        </Button>
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
                    }}
                />
            )}


            {selectedTask && (
                <Modal open onClose={() => setSelectedTask(null)} title={selectedTask.title} subtitle={selectedTask.description || 'No description provided.'} size="3xl">
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                                    <div className="rounded-md bg-[#f8f9fa] dark:bg-[#060818] p-3">
                                        <p className="text-xs text-white-dark">Created On</p>
                                        <p className="font-semibold mt-1">{formatDateTime(selectedTask.created_at)}</p>
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
                </Modal>
            )}
        </div>
    );
};

export default MyTasks;
