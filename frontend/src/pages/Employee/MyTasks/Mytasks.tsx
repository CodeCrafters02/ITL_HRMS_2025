import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { 
    EmployeeSubtask, 
    EmployeeTask, 
    TaskAssignment, 
    TaskPriority, 
    TaskStatus, 
    fetchMyTasks, 
    updateTaskAssignmentStatus,
    MyTasksResponse 
} from './api';
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
    
    // Server-side state
    const [tasks, setTasks] = useState<EmployeeTask[]>([]);
    const [summary, setSummary] = useState<MyTasksResponse['summary'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination & Filter state
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    
    // UI state
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
                page_size: pageSize
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

    // Pagination logic (Smart Pagination)
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
            className="form-select text-xs py-1.5 px-2 font-bold rounded-lg border-gray-200 dark:border-gray-700 disabled:opacity-60 focus:ring-primary shadow-sm"
        >
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
            <option value="done">Done</option>
        </select>
    );

    return (
        <div className="space-y-6 animate__animated animate__fadeIn pb-8">
            {/* ─── Premium Header Banner ─── */}
            <div className="relative bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg border-0">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/3 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
                            <IconListCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Task Workspace</h1>
                            <p className="text-white/80 mt-1 font-medium max-w-lg">
                                Manage your individual assignments and collaborate on team goals in one unified view.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Summary Counters Dashboard ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Assigned Tasks', value: summary?.total ?? 0, color: 'primary', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { label: 'Active Workflows', value: summary?.in_progress ?? 0, color: 'info', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                    { label: 'Completed', value: summary?.done ?? 0, color: 'success', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Overdue', value: summary?.overdue ?? 0, color: 'danger', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((stat, i) => (
                    <div key={i} className="panel p-5 bg-white dark:bg-[#111c2d] border-0 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 bg-${stat.color}/10 rounded-xl`}>
                                <svg className={`w-5 h-5 text-${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white-dark uppercase tracking-tight">Dashboard</span>
                        </div>
                        <div className="mt-4">
                            <h4 className="text-2xl font-black text-gray-800 dark:text-white-light">{stat.value}</h4>
                            <p className="text-xs font-bold text-white-dark mt-1 uppercase tracking-tight">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Consolidated Filter Bar ─── */}
            <div className="panel p-5 border-0 shadow-lg bg-white dark:bg-[#111c2d] rounded-2xl overflow-visible">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="relative flex-1 min-w-[200px]">
                            <input
                                type="text"
                                className="form-input pl-10 text-xs py-2 h-10 rounded-xl border-gray-200 dark:border-gray-700 shadow-sm"
                                placeholder="Search by title, description or subtask..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Priority</label>
                             <select
                                className="form-select sm:w-[140px] text-xs py-1.5 h-10 rounded-xl border-gray-200 dark:border-gray-700"
                                value={priorityFilter}
                                onChange={(e) => { setPriorityFilter(e.target.value as PriorityFilter); setPage(1); }}
                            >
                                <option value="all">All Levels</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Status</label>
                            <select 
                                className="form-select sm:w-[140px] text-xs py-1.5 h-10 rounded-xl border-gray-200 dark:border-gray-700" 
                                value={statusFilter} 
                                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                            >
                                <option value="all">Every State</option>
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="inreview">In Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-800 pl-5">
                        <button
                            type="button"
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'card' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800'}`}
                            onClick={() => setViewMode('card')}
                        >
                            <IconLayoutGrid className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800'}`}
                            onClick={() => setViewMode('table')}
                        >
                            <IconListCheck className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger rounded-xl p-4 flex items-center justify-between">
                    <span className="font-semibold">{error}</span>
                    <button onClick={loadTasks} className="btn btn-sm btn-danger">Retry</button>
                </div>
            )}

            {/* ─── Data Display Area ─── */}
            <div className="min-h-[400px]">
                {loading && tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-l-transparent" />
                        <p className="text-white-dark font-bold text-sm tracking-wide">Refreshing workspace...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="panel flex flex-col items-center justify-center py-24 rounded-2xl border-dashed border-2 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-transparent">
                        <div className="p-5 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4">
                            <IconListCheck className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">Perfectly Clean!</h3>
                        <p className="text-white-dark text-sm mt-1">No tasks matching your current filters were found.</p>
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {tasks.map((task) => (
                            <div key={task.id} className="panel group p-0 relative overflow-hidden flex flex-col border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl bg-white dark:bg-[#111c2d]">
                                <div className={`h-1.5 w-full ${priorityStyleMap[task.priority].split(' ')[0].replace('-light', '')} bg-current opacity-80 shadow-[0_1px_5px_rgba(0,0,0,0.1)]`}></div>
                                <div className="p-6 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white-light leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                                            {task.title}
                                        </h3>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${priorityStyleMap[task.priority]}`}>
                                            {priorityLabelMap[task.priority]}
                                        </span>
                                    </div>
                                    <p className="text-white-dark text-sm line-clamp-2 mb-6 flex-grow">{task.description}</p>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-white-dark uppercase tracking-widest text-[9px]">Workflow Progress</span>
                                            <span className="text-primary">{task.progress}%</span>
                                        </div>
                                        <div className="w-full bg-[#ebedf2] dark:bg-dark/40 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${task.progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                                        <div className="flex -space-x-2">
                                            {(task.contributors || []).slice(0, 3).map((name, i) => (
                                                <div key={i} className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black uppercase text-gray-500" title={name}>
                                                    {name.charAt(0)}
                                                </div>
                                            ))}
                                            {(task.contributors || []).length > 3 && (
                                                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-900 bg-primary text-white flex items-center justify-center text-[10px] font-black">
                                                    +{(task.contributors || []).length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-white-dark uppercase tracking-widest">Deadline</p>
                                            <p className={`text-xs font-bold mt-0.5 ${parseDate(task.deadline) && parseDate(task.deadline)!.getTime() < Date.now() ? 'text-danger' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {formatDate(task.deadline)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="panel p-0 border-0 overflow-hidden shadow-lg rounded-2xl bg-white dark:bg-[#111c2d]">
                        <div className="table-responsive">
                            <table className="table-hover text-sm">
                                <thead className="bg-[#f8faff] dark:bg-[#17243b]">
                                    <tr>
                                        <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Task Overview</th>
                                        <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Urgency</th>
                                        <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Due Date</th>
                                        <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Progress</th>
                                        <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Self Status</th>
                                        <th className="!py-4 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task) => {
                                        const ownAssign = getOwnAssignment(task.assignments, currentUserName);
                                        return (
                                            <tr key={task.id} className="group hover:bg-primary/5 transition-colors">
                                                <td className="!py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 dark:text-white-light group-hover:text-primary transition-colors">{task.title}</span>
                                                        <span className="text-xs text-white-dark line-clamp-1 max-w-[200px] mt-0.5">{task.description}</span>
                                                    </div>
                                                </td>
                                                <td className="!py-4">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${priorityStyleMap[task.priority]}`}>
                                                        {priorityLabelMap[task.priority]}
                                                    </span>
                                                </td>
                                                <td className="!py-4">
                                                    <div className="flex items-center gap-2">
                                                        <svg className={`w-3.5 h-3.5 ${parseDate(task.deadline) && parseDate(task.deadline)!.getTime() < Date.now() ? 'text-danger' : 'text-white-dark'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className={`text-xs font-bold ${parseDate(task.deadline) && parseDate(task.deadline)!.getTime() < Date.now() ? 'text-danger' : 'text-gray-600'}`}>
                                                            {formatDate(task.deadline)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="!py-4">
                                                    <div className="flex items-center gap-3 min-w-[120px]">
                                                        <div className="flex-1 bg-gray-100 dark:bg-dark/40 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-primary h-full" style={{ width: `${task.progress}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-primary">{task.progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="!py-4">
                                                    {ownAssign ? statusSelect(ownAssign) : (
                                                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-white-dark uppercase tracking-wide">Contributor</span>
                                                    )}
                                                </td>
                                                <td className="!py-4 text-center">
                                                    <button onClick={() => setSelectedTask(task)} className="p-2 text-white-dark hover:text-primary transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
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
            </div>

            {/* ─── Pagination Footer ─── */}
            {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4 bg-white dark:bg-[#111c2d] rounded-2xl shadow-lg border-0">
                    <div className="flex items-center gap-6">
                        <div className="text-[11px] text-white-dark font-black uppercase tracking-widest">
                            Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary">{totalCount}</span> tasks
                        </div>
                        <div className="flex items-center gap-2">
                             <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Per Page:</label>
                             <select
                                className="form-select border-gray-100 dark:border-gray-800 w-16 text-xs font-bold py-1 h-8 rounded-lg"
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={6}>6</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    <ul className="inline-flex items-center space-x-1.5 font-bold">
                        <li>
                            <button
                                type="button"
                                className="flex justify-center p-2 rounded-xl transition bg-gray-50 text-dark hover:text-white hover:bg-primary border border-gray-100 dark:border-gray-800 dark:bg-[#191e3a] disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                disabled={page === 1}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        </li>
                        {getPageNumbers().map((p, idx) =>
                            p === '...' ? (
                                <li key={`dots-${idx}`} className="px-1 text-white-dark font-black">…</li>
                            ) : (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center px-3.5 h-9 min-w-[36px] rounded-xl transition border items-center text-xs ${
                                            p === page
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                : 'bg-gray-50 text-dark hover:text-white hover:bg-primary border-gray-100 dark:border-gray-800 dark:bg-[#191e3a]'
                                        }`}
                                        onClick={() => setPage(p as number)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            )
                        )}
                        <li>
                            <button
                                type="button"
                                className="flex justify-center p-2 rounded-xl transition bg-gray-50 text-dark hover:text-white hover:bg-primary border border-gray-100 dark:border-gray-800 dark:bg-[#191e3a] disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                disabled={page === totalPages || totalPages === 0}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            {/* ─── Task Detail Sidebar Overlay ─── */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-sm animate__animated animate__fadeIn">
                    <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-[#0e1726] shadow-2xl flex flex-col animate__animated animate__slideInRight animate__fast">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-primary/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-1">Workflow Track</span>
                                <h2 className="text-xl font-black text-gray-800 dark:text-white-light">{selectedTask.title}</h2>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 transition-colors">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-grow space-y-8">
                             <div>
                                <h4 className="text-[11px] font-black uppercase text-white-dark tracking-widest mb-3">Objective Description</h4>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 italic text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    {selectedTask.description || "No deep objective provided for this workflow."}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                    <span className="block text-[9px] font-black text-white-dark uppercase tracking-widest mb-1">Target Priority</span>
                                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-black uppercase ${priorityStyleMap[selectedTask.priority]}`}>
                                        {priorityLabelMap[selectedTask.priority]}
                                    </span>
                                </div>
                                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                    <span className="block text-[9px] font-black text-white-dark uppercase tracking-widest mb-1">Exp. Completion</span>
                                     <span className={`text-[11px] font-black ${parseDate(selectedTask.deadline) && parseDate(selectedTask.deadline)!.getTime() < Date.now() ? 'text-danger' : 'text-gray-700 dark:text-white-light uppercase'}`}>
                                        {formatDate(selectedTask.deadline)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-black uppercase text-white-dark tracking-widest">Target Subtasks ({selectedTask.subtask_details.length})</h4>
                                    <span className="text-[10px] font-black text-primary uppercase">Milestones</span>
                                </div>
                                <div className="space-y-4">
                                    {selectedTask.subtask_details.length > 0 ? (
                                        selectedTask.subtask_details.map((sub: EmployeeSubtask, i: number) => (
                                            <div key={i} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl transform transition-all hover:translate-x-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-sm text-gray-700 dark:text-white-light">{sub.title}</h5>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${statusStyleMap[sub.status]}`}>
                                                        {statusLabelMap[sub.status]}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white-dark line-clamp-2">{sub.description}</p>
                                                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                                    <div className="flex -space-x-1.5">
                                                        {(sub.assignments || []).map((a, j) => (
                                                            <div key={j} className="h-6 w-6 rounded-full border border-white dark:border-gray-900 bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-500 uppercase">
                                                                {a.employee_name?.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-black text-white-dark">{sub.progress}%</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-white-dark italic text-xs">No granular milestones defined.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-transparent">
                            <button onClick={() => setSelectedTask(null)} className="btn btn-primary w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                                Close Workspace View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTasks;
