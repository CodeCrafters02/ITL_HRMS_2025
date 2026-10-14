import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import DataTable, { Column } from '../../components/Common/DataTable';
import { fetchMyReportees, Reportee } from '../Employee/Reportees/api';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import {
    createManagerSubtask,
    createManagerTask,
    deleteManagerTask,
    fetchManagerTaskDetail,
    fetchManagerTasks,
    ManagerTask,
    NewSubtaskPayload,
    reassignManagerSubtask,
    reassignManagerTask,
    TaskPriority,
    TaskStatus,
    updateManagerTask,
} from '../Employee/AssignTask/api';

interface NewSubtask {
    id?: number;
    title: string;
    description: string;
    deadline: string;
    priority: TaskPriority;
    assignedEmployees: number[];
    taskOwner: number | null;
}

const priorityClasses: Record<TaskPriority, string> = {
    high: 'bg-danger-light text-danger',
    medium: 'bg-warning-light text-warning',
    low: 'bg-success-light text-success',
};

const statusLabel: Record<ManagerTask['status'], string> = {
    todo: 'To Do',
    inprogress: 'In Progress',
    inreview: 'In Review',
    done: 'Done',
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return value.replace('T', ' ');
};

const AdminAssignTask = () => {
    const dispatch = useDispatch();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [reportees, setReportees] = useState<Reportee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [ownerId, setOwnerId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [hasSubtasks, setHasSubtasks] = useState(false);
    const [subtasks, setSubtasks] = useState<NewSubtask[]>([]);

    const [tasks, setTasks] = useState<ManagerTask[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [selectedTask, setSelectedTask] = useState<ManagerTask | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailSaving, setDetailSaving] = useState(false);

    const [parentEdit, setParentEdit] = useState<{ title: string; description: string; deadline: string; priority: TaskPriority; status: TaskStatus }>({
        title: '',
        description: '',
        deadline: '',
        priority: 'medium',
        status: 'todo',
    });
    const [parentOwner, setParentOwner] = useState<number | null>(null);
    const [parentEmployees, setParentEmployees] = useState<number[]>([]);
    const [subtaskOwners, setSubtaskOwners] = useState<Record<number, number | null>>({});
    const [subtaskEmployees, setSubtaskEmployees] = useState<Record<number, number[]>>({});

    useEffect(() => {
        dispatch(setPageTitle('Assign Task'));
    }, [dispatch]);

    const loadReportees = async () => {
        try {
            const data = await fetchMyReportees({ page: 1, page_size: 200, search: '' });
            setReportees(data.results || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load reportees';
            Swal.fire('Error', message, 'error');
        }
    };

    const loadTasks = async () => {
        setLoadingTasks(true);
        try {
            const data = await fetchManagerTasks({ page, page_size: pageSize, search });
            setTasks(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tasks';
            Swal.fire('Error', message, 'error');
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        loadReportees();
    }, []);

    useEffect(() => {
        if (reportees.length !== 1) return;
        const onlyReporteeId = reportees[0].id;

        setSelectedEmployees((prev) => (prev.length === 0 ? [onlyReporteeId] : prev));
        setOwnerId((prev) => (prev ?? onlyReporteeId));
    }, [reportees]);

    useEffect(() => {
        loadTasks();
    }, [page, pageSize, search]);

    const toggleEmployee = (empId: number) => {
        setSelectedEmployees((prev) => {
            const exists = prev.includes(empId);
            const next = exists ? prev.filter((id) => id !== empId) : [...prev, empId];
            if (!next.includes(ownerId || -1)) {
                setOwnerId(next[0] ?? null);
            }
            return next;
        });
    };

    const submitTask = async () => {
        const effectiveSelectedEmployees = selectedEmployees.length === 0 && ownerId ? [ownerId] : selectedEmployees;
        if (!title.trim() || !deadline || effectiveSelectedEmployees.length === 0 || !ownerId) {
            Swal.fire('Validation', 'Please fill title, deadline, assignees, and task owner.', 'warning');
            return;
        }
        if (!effectiveSelectedEmployees.includes(ownerId)) {
            Swal.fire('Validation', 'Task owner must be one of selected assignees.', 'warning');
            return;
        }
        const parentDeadlineMs = new Date(deadline).getTime();
        const normalizedSubtasks = subtasks.map((sub) => {
            const assignees = sub.assignedEmployees.length === 0 && sub.taskOwner ? [sub.taskOwner] : sub.assignedEmployees;
            return { ...sub, title: sub.title.trim(), description: sub.description.trim(), assignedEmployees: assignees };
        });
        const invalidSubtask = normalizedSubtasks.find((sub) => {
            if (!sub.title || !sub.deadline) return true;
            if (sub.assignedEmployees.length === 0) return true;
            if (!sub.taskOwner || !sub.assignedEmployees.includes(sub.taskOwner)) return true;
            const subDeadlineMs = new Date(sub.deadline).getTime();
            return Number.isFinite(parentDeadlineMs) && Number.isFinite(subDeadlineMs) && subDeadlineMs > parentDeadlineMs;
        });
        if (invalidSubtask) {
            Swal.fire('Validation', 'Each subtask must have owner within assignees and deadline on/before parent deadline.', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            if (editingTaskId) {
                await updateManagerTask(editingTaskId, {
                    title: title.trim(),
                    description: description.trim(),
                    deadline,
                    priority,
                });
                await reassignManagerTask(editingTaskId, ownerId, effectiveSelectedEmployees);
                for (const sub of normalizedSubtasks) {
                    const subPayload: NewSubtaskPayload = {
                        title: sub.title.trim(),
                        description: sub.description.trim(),
                        deadline: sub.deadline,
                        priority: sub.priority,
                        assignedEmployees: sub.assignedEmployees,
                        taskOwner: sub.taskOwner,
                    };
                    if (sub.id) {
                        await updateManagerTask(sub.id, {
                            title: subPayload.title,
                            description: subPayload.description,
                            deadline: subPayload.deadline,
                            priority: subPayload.priority,
                        });
                        await reassignManagerSubtask(sub.id, subPayload.taskOwner as number, subPayload.assignedEmployees);
                    } else {
                        await createManagerSubtask(editingTaskId, subPayload);
                    }
                }
                Swal.fire('Updated', 'Task updated successfully.', 'success');
            } else {
                const payloadSubtasks: NewSubtaskPayload[] = normalizedSubtasks.map((sub) => ({
                    title: sub.title.trim(),
                    description: sub.description.trim(),
                    deadline: sub.deadline,
                    priority: sub.priority,
                    assignedEmployees: sub.assignedEmployees.length === 0 && sub.taskOwner ? [sub.taskOwner] : sub.assignedEmployees,
                    taskOwner: sub.taskOwner,
                }));
                await createManagerTask({
                    title: title.trim(),
                    description: description.trim(),
                    deadline,
                    priority,
                    assignedEmployees: effectiveSelectedEmployees,
                    taskOwner: ownerId,
                    subtasks: payloadSubtasks,
                });
                Swal.fire('Created', 'Task assigned successfully.', 'success');
            }
            setTitle('');
            setDescription('');
            setDeadline('');
            setPriority('medium');
            setSelectedEmployees([]);
            setOwnerId(null);
            setEditingTaskId(null);
            setSubtasks([]);
            setHasSubtasks(false);
            setShowCreateForm(false);
            loadTasks();
        } catch (err) {
            const message = err instanceof Error ? err.message : editingTaskId ? 'Failed to update task' : 'Failed to create task';
            Swal.fire('Error', message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateTask = async (e: FormEvent) => {
        e.preventDefault();
        await submitTask();
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const addSubtask = () => {
        const defaultAssignee = reportees.length === 1 ? [reportees[0].id] : [];
        setSubtasks((prev) => [
            ...prev,
            {
                title: '',
                description: '',
                deadline: '',
                priority: 'medium',
                assignedEmployees: defaultAssignee,
                taskOwner: defaultAssignee[0] ?? null,
            },
        ]);
    };

    const removeSubtask = (index: number) => {
        setSubtasks((prev) => prev.filter((_, idx) => idx !== index));
    };

    const deleteSubtask = async (index: number) => {
        const target = subtasks[index];
        if (!target) return;

        const confirm = await Swal.fire({
            title: 'Delete subtask?',
            text: 'This subtask will be removed permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;

        if (target.id) {
            try {
                setSubmitting(true);
                await deleteManagerTask(target.id);
                setSubtasks((prev) => prev.filter((_, idx) => idx !== index));
                await loadTasks();
                Swal.fire('Deleted', 'Subtask removed successfully.', 'success');
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to delete subtask';
                Swal.fire('Error', message, 'error');
            } finally {
                setSubmitting(false);
            }
            return;
        }

        setSubtasks((prev) => prev.filter((_, idx) => idx !== index));
    };

    const updateSubtaskField = (index: number, field: keyof NewSubtask, value: string | number | number[] | TaskPriority | null) => {
        setSubtasks((prev) => prev.map((sub, idx) => (idx === index ? { ...sub, [field]: value } : sub)));
    };

    const toggleExistingSubtaskEmployee = (index: number, empId: number) => {
        setSubtasks((prev) =>
            prev.map((sub, idx) => {
                if (idx !== index) return sub;
                const nextAssigned = sub.assignedEmployees.includes(empId)
                    ? sub.assignedEmployees.filter((id) => id !== empId)
                    : [...sub.assignedEmployees, empId];
                const nextOwner = nextAssigned.includes(sub.taskOwner || -1) ? sub.taskOwner : (nextAssigned[0] ?? null);
                return { ...sub, assignedEmployees: nextAssigned, taskOwner: nextOwner };
            })
        );
    };

    const startEditTask = async (taskId: number) => {
        setSubmitting(true);
        try {
            const detail = await fetchManagerTaskDetail(taskId);
            const parentAssign = ownerAndEmployeesFromAssignments(detail.assignments || []);
            setEditingTaskId(taskId);
            setShowCreateForm(true);
            setTitle(detail.title || '');
            setDescription(detail.description || '');
            setDeadline(detail.deadline || '');
            setPriority(detail.priority || 'medium');
            setSelectedEmployees(parentAssign.employees);
            setOwnerId(parentAssign.owner);
            const existingSubtasks: NewSubtask[] = (detail.subtask_details || []).map((sub) => {
                const subAssign = ownerAndEmployeesFromAssignments(sub.assignments || []);
                return {
                    id: sub.id,
                    title: sub.title || '',
                    description: sub.description || '',
                    deadline: sub.deadline || '',
                    priority: sub.priority || 'medium',
                    assignedEmployees: subAssign.employees,
                    taskOwner: subAssign.owner,
                };
            });
            setSubtasks(existingSubtasks);
            setHasSubtasks(existingSubtasks.length > 0);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load task details';
            Swal.fire('Error', message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const ownerAndEmployeesFromAssignments = (assignments: ManagerTask['assignments']) => {
        const employees = assignments.map((a) => a.employee);
        const owner = assignments.find((a) => a.role === 'owner')?.employee || null;
        return { owner, employees };
    };

    const openTaskDetail = async (taskId: number) => {
        setDetailLoading(true);
        try {
            const detail = await fetchManagerTaskDetail(taskId);
            setSelectedTask(detail);
            setParentEdit({
                title: detail.title || '',
                description: detail.description || '',
                deadline: detail.deadline || '',
                priority: detail.priority,
                status: detail.status,
            });
            const parentAssign = ownerAndEmployeesFromAssignments(detail.assignments || []);
            setParentOwner(parentAssign.owner);
            setParentEmployees(parentAssign.employees);

            const owners: Record<number, number | null> = {};
            const employees: Record<number, number[]> = {};
            (detail.subtask_details || []).forEach((sub) => {
                const subAssign = ownerAndEmployeesFromAssignments(sub.assignments || []);
                owners[sub.id] = subAssign.owner;
                employees[sub.id] = subAssign.employees;
            });
            setSubtaskOwners(owners);
            setSubtaskEmployees(employees);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load task details';
            Swal.fire('Error', message, 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const toggleParentEmployee = (empId: number) => {
        setParentEmployees((prev) => {
            const next = prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId];
            if (!next.includes(parentOwner || -1)) {
                setParentOwner(next[0] ?? null);
            }
            return next;
        });
    };

    const toggleSubtaskMember = (subtaskId: number, empId: number) => {
        setSubtaskEmployees((prev) => {
            const current = prev[subtaskId] || [];
            const next = current.includes(empId) ? current.filter((id) => id !== empId) : [...current, empId];
            setSubtaskOwners((owners) => ({
                ...owners,
                [subtaskId]: next.includes(owners[subtaskId] || -1) ? owners[subtaskId] : (next[0] ?? null),
            }));
            return { ...prev, [subtaskId]: next };
        });
    };

    const saveParentDetails = async () => {
        if (!selectedTask) return;
        setDetailSaving(true);
        try {
            await updateManagerTask(selectedTask.id, parentEdit);
            await loadTasks();
            await openTaskDetail(selectedTask.id);
            Swal.fire('Saved', 'Task details updated.', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update task';
            Swal.fire('Error', message, 'error');
        } finally {
            setDetailSaving(false);
        }
    };

    const saveParentReassignment = async () => {
        if (!selectedTask) return;
        if (!parentOwner || !parentEmployees.includes(parentOwner)) {
            Swal.fire('Validation', 'Owner must be one of selected assignees.', 'warning');
            return;
        }
        setDetailSaving(true);
        try {
            await reassignManagerTask(selectedTask.id, parentOwner, parentEmployees);
            await loadTasks();
            await openTaskDetail(selectedTask.id);
            Swal.fire('Updated', 'Parent task assignees updated.', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reassign task';
            Swal.fire('Error', message, 'error');
        } finally {
            setDetailSaving(false);
        }
    };

    const updateParentTask = async () => {
        if (!selectedTask) return;
        if (!parentEdit.title.trim() || !parentEdit.deadline) {
            Swal.fire('Validation', 'Please fill task title and deadline.', 'warning');
            return;
        }
        if (!parentOwner || !parentEmployees.includes(parentOwner)) {
            Swal.fire('Validation', 'Owner must be one of selected assignees.', 'warning');
            return;
        }

        setDetailSaving(true);
        try {
            await updateManagerTask(selectedTask.id, {
                title: parentEdit.title.trim(),
                description: parentEdit.description.trim(),
                deadline: parentEdit.deadline,
                priority: parentEdit.priority,
                status: parentEdit.status,
            });
            await reassignManagerTask(selectedTask.id, parentOwner, parentEmployees);
            await loadTasks();
            await openTaskDetail(selectedTask.id);
            Swal.fire('Updated', 'Task updated successfully.', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update task';
            Swal.fire('Error', message, 'error');
        } finally {
            setDetailSaving(false);
        }
    };

    const saveSubtaskReassignment = async (subtaskId: number) => {
        const owner = subtaskOwners[subtaskId];
        const contributors = subtaskEmployees[subtaskId] || [];
        if (!owner || !contributors.includes(owner)) {
            Swal.fire('Validation', 'Subtask owner must be one of selected assignees.', 'warning');
            return;
        }
        setDetailSaving(true);
        try {
            await reassignManagerSubtask(subtaskId, owner, contributors);
            if (selectedTask) {
                await openTaskDetail(selectedTask.id);
                await loadTasks();
            }
            Swal.fire('Updated', 'Subtask assignees updated.', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reassign subtask';
            Swal.fire('Error', message, 'error');
        } finally {
            setDetailSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Assign Task"
                subtitle="Create tasks for your reportees and track team execution in one place."
                icon={<IconListCheck />}
                actions={
                    <>
                        <button
                        type="button"
                        className={`btn ${showCreateForm ? 'btn-outline-danger border-white text-white hover:bg-white/10' : 'btn-primary'}`}
                        onClick={() => {
                            if (showCreateForm) {
                                setEditingTaskId(null);
                                setTitle('');
                                setDescription('');
                                setDeadline('');
                                setPriority('medium');
                                setSelectedEmployees([]);
                                setOwnerId(null);
                                setSubtasks([]);
                                setHasSubtasks(false);
                            }
                            setShowCreateForm((prev) => !prev);
                        }}
                    >
                        {showCreateForm ? (editingTaskId ? 'Cancel Edit' : 'Close') : '+ New Task'}
                    </button>
                    </>
                }
            />

            {showCreateForm && (
                <div className="panel">
                    <form className="space-y-4" onSubmit={handleCreateTask}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="form-input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-white-dark">Deadline</label>
                                    <input type="date" className="form-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                                </div>
                                <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        <textarea className="form-textarea min-h-[100px]" placeholder="Task description" value={description} onChange={(e) => setDescription(e.target.value)} />

                        <div>
                            <p className="text-sm font-semibold mb-2">Assign Reportees</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-52 overflow-auto border border-white-light dark:border-[#1b2e4b] rounded-lg p-3">
                                {reportees.length === 0 ? (
                                    <p className="text-sm text-white-dark">No reportees found.</p>
                                ) : (
                                    reportees.map((emp) => (
                                        <label key={emp.id} className="inline-flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={selectedEmployees.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                                            <span>{emp.full_name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold mb-2">Task Owner</p>
                            <select
                                className="form-select"
                                value={ownerId ?? ''}
                                onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : null)}
                                disabled={selectedEmployees.length === 0}
                            >
                                <option value="">Select owner</option>
                                {reportees
                                    .filter((emp) => selectedEmployees.includes(emp.id))
                                    .map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.full_name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                    </form>
                    {showCreateForm && (
                        <div className="mt-5 border-t border-white-light dark:border-[#1b2e4b] pt-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    id="has-subtasks"
                                    type="checkbox"
                                    checked={hasSubtasks}
                                    onChange={(e) => setHasSubtasks(e.target.checked)}
                                />
                                <label htmlFor="has-subtasks" className="text-sm font-semibold">
                                    Is there any subtask?
                                </label>
                            </div>
                            {hasSubtasks && (
                                <>
                                    <div className="flex items-center justify-between gap-3">
                                        <h4 className="font-semibold">{editingTaskId ? 'Manage Subtasks' : 'Subtasks for Parent Task'}</h4>
                                        <Button variant="outline" size="sm" type="button"  onClick={addSubtask}>
                                            Add Subtask
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {subtasks.length === 0 ? (
                                            <p className="text-xs text-white-dark">{editingTaskId ? 'No subtasks found for this task.' : 'No subtasks added yet.'}</p>
                                        ) : (
                                            subtasks.map((sub, idx) => (
                                                <div key={`${sub.id || 'new'}-${idx}`} className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3 space-y-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="font-semibold text-sm">Subtask {idx + 1}</p>
                                                        <Button variant="outline-danger" size="sm" className="!p-2"
                                                            type="button"
                                                            
                                                            onClick={() => (sub.id ? deleteSubtask(idx) : removeSubtask(idx))}
                                                            title="Delete subtask"
                                                            aria-label="Delete subtask"
                                                            disabled={submitting}
                                                        >
                                                            <IconTrashLines className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            className="form-input"
                                                            placeholder="Subtask title"
                                                            value={sub.title}
                                                            onChange={(e) => updateSubtaskField(idx, 'title', e.target.value)}
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                value={sub.deadline}
                                                                onChange={(e) => updateSubtaskField(idx, 'deadline', e.target.value)}
                                                            />
                                                            <select
                                                                className="form-select"
                                                                value={sub.priority}
                                                                onChange={(e) => updateSubtaskField(idx, 'priority', e.target.value as TaskPriority)}
                                                            >
                                                                <option value="high">High</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="low">Low</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        className="form-textarea min-h-[72px]"
                                                        placeholder="Subtask description"
                                                        value={sub.description}
                                                        onChange={(e) => updateSubtaskField(idx, 'description', e.target.value)}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-semibold mb-2">Subtask Assignees</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-36 overflow-auto border border-white-light dark:border-[#1b2e4b] rounded-lg p-3">
                                                            {reportees.map((emp) => (
                                                                <label key={`sub-existing-${sub.id || idx}-${emp.id}`} className="inline-flex items-center gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={sub.assignedEmployees.includes(emp.id)}
                                                                        onChange={() => toggleExistingSubtaskEmployee(idx, emp.id)}
                                                                    />
                                                                    <span>{emp.full_name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold mb-2">Subtask Owner</p>
                                                        <select
                                                            className="form-select"
                                                            value={sub.taskOwner ?? ''}
                                                            onChange={(e) => updateSubtaskField(idx, 'taskOwner', e.target.value ? Number(e.target.value) : null)}
                                                            disabled={sub.assignedEmployees.length === 0}
                                                        >
                                                            <option value="">Select owner</option>
                                                            {reportees
                                                                .filter((emp) => sub.assignedEmployees.includes(emp.id))
                                                                .map((emp) => (
                                                                    <option key={`sub-existing-owner-${sub.id || idx}-${emp.id}`} value={emp.id}>
                                                                        {emp.full_name}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {showCreateForm && (
                        <div className="mt-5 flex justify-start">
                            <Button className="min-w-[150px]" type="button"  onClick={submitTask} disabled={submitting}>
                                {submitting ? (editingTaskId ? 'Updating...' : 'Creating...') : (editingTaskId ? 'Update Task' : 'Create Task')}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!showCreateForm && (
                <DataTable
                    columns={[
                        {
                            key: 'title',
                            title: 'Task',
                            sortable: true,
                            render: (_val: any, task: ManagerTask) => (
                                <div className="max-w-xs">
                                    <p className="font-semibold text-gray-800 dark:text-white-light">{task.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{task.description || '-'}</p>
                                </div>
                            ),
                        },
                        {
                            key: 'priority',
                            title: 'Priority',
                            sortable: true,
                            align: 'center',
                            width: '100px',
                            render: (_val: any, task: ManagerTask) => (
                                <span className={`badge uppercase ${priorityClasses[task.priority]}`}>{task.priority}</span>
                            ),
                        },
                        {
                            key: 'status',
                            title: 'Status',
                            sortable: true,
                            align: 'center',
                            width: '120px',
                            render: (_val: any, task: ManagerTask) => (
                                <span className="badge bg-primary/10 text-primary font-semibold">{statusLabel[task.status] || task.status}</span>
                            ),
                        },
                        {
                            key: 'deadline',
                            title: 'Deadline',
                            sortable: true,
                            render: (_val: any, task: ManagerTask) => (
                                <span className="text-gray-500 dark:text-gray-400">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</span>
                            ),
                        },
                        {
                            key: 'created_at',
                            title: 'Created On',
                            sortable: true,
                            render: (_val: any, task: ManagerTask) => (
                                <span className="text-gray-500 dark:text-gray-400 text-xs">{task.created_at ? task.created_at.replace('T', ' ') : '-'}</span>
                            ),
                        },
                        {
                            key: 'progress',
                            title: 'Progress',
                            sortable: true,
                            align: 'center',
                            width: '120px',
                            render: (_val: any, task: ManagerTask) => (
                                <div className="w-full">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-semibold text-primary">{task.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 dark:bg-[#1b2e4b] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${task.progress}%` }}></div>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'assignments',
                            title: 'Assignees',
                            align: 'center',
                            width: '100px',
                            render: (_val: any, task: ManagerTask) => (
                                <span className="badge bg-secondary/10 text-secondary font-bold px-2.5 py-0.5 rounded-full">
                                    {task.assignments?.length || 0}
                                </span>
                            ),
                        },
                        {
                            key: 'actions',
                            title: 'Actions',
                            align: 'center',
                            width: '100px',
                            render: (_val: any, task: ManagerTask) => (
                                <Button variant="outline" size="sm"
                                    type="button"
                                    
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditTask(task.id);
                                    }}
                                >
                                    Edit
                                </Button>
                            ),
                        },
                    ]}
                    data={tasks}
                    loading={loadingTasks}
                    page={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                    searchValue={search}
                    onSearchChange={(val) => { setSearch(val); setPage(1); }}
                    searchPlaceholder="Search tasks by title, description..."
                    onRefresh={loadTasks}
                    onRowClick={(task) => openTaskDetail(task.id)}
                />
            )}

            {selectedTask && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md p-3 sm:p-4 flex items-center justify-center" onClick={() => setSelectedTask(null)}>
                    <div className="panel w-full max-w-7xl h-[92vh] overflow-hidden p-0 dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white-light bg-white px-5 py-4 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                            <div>
                                <h3 className="text-xl font-bold leading-tight">Task Details</h3>
                                <p className="text-xs text-white-dark mt-1">Parent task and subtask breakdown</p>
                            </div>
                            <Button variant="outline-danger" size="sm" type="button"  onClick={() => setSelectedTask(null)}>
                                Close
                            </Button>
                        </div>
                        {detailLoading ? (
                            <div className="text-center py-12 text-white-dark">Loading details...</div>
                        ) : (
                            <div className="h-[calc(92vh-74px)] p-5 overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                                    <div className="lg:col-span-4 h-full">
                                        <div className="rounded-lg border border-white-light bg-white p-4 dark:border-[#1b2e4b] dark:bg-[#132136] h-full overflow-y-auto">
                                            <h4 className="font-semibold mb-4 text-base">Parent Task</h4>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide text-white-dark">Title</p>
                                                <p className="font-semibold mt-1">{selectedTask.title || '-'}</p>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-[11px] uppercase tracking-wide text-white-dark">Description</p>
                                                <p className="mt-1 text-sm leading-6">{selectedTask.description || '-'}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-white-dark">Deadline</p>
                                                    <p className="font-semibold mt-1">{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-white-dark">Created On</p>
                                                    <p className="font-semibold mt-1">{selectedTask.created_at ? selectedTask.created_at.replace('T', ' ') : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-white-dark">Progress</p>
                                                    <p className="font-semibold mt-1">{selectedTask.progress}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-white-dark">Priority</p>
                                                    <p className="mt-1 inline-flex rounded-full bg-warning-light px-2 py-1 text-xs font-semibold text-warning">
                                                        {selectedTask.priority}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-white-dark">Status</p>
                                                    <p className="mt-1 inline-flex rounded-full bg-info-light px-2 py-1 text-xs font-semibold text-info">
                                                        {statusLabel[selectedTask.status]}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <p className="text-[11px] uppercase tracking-wide text-white-dark">Assigned Members</p>
                                                {(selectedTask.assignments || []).length === 0 ? (
                                                    <p className="text-xs text-white-dark mt-1">No assignees.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {selectedTask.assignments.map((a) => (
                                                            <span key={a.id} className="badge bg-primary-light text-primary px-2 py-1">
                                                                {a.employee_name} ({a.role})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-8 h-full">
                                        <div className="rounded-lg border border-white-light bg-white p-4 dark:border-[#1b2e4b] dark:bg-[#132136] h-full overflow-y-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-semibold text-base">Subtasks</h4>
                                                <span className="text-xs text-white-dark">Total: {(selectedTask.subtask_details || []).length}</span>
                                            </div>
                                            {(selectedTask.subtask_details || []).length === 0 ? (
                                                <p className="text-sm text-white-dark">No subtasks found.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {(selectedTask.subtask_details || []).map((sub) => (
                                                        <div key={sub.id} className="rounded-lg border border-white-light p-3 dark:border-[#1b2e4b]">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-sm truncate">{sub.title || '-'}</p>
                                                                    <p className="text-xs text-white-dark mt-1 line-clamp-2">{sub.description || '-'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="rounded-full bg-warning-light px-2 py-1 text-[10px] font-semibold uppercase text-warning">
                                                                        {sub.priority}
                                                                    </span>
                                                                    <span className="rounded-full bg-info-light px-2 py-1 text-[10px] font-semibold text-info">
                                                                        {statusLabel[sub.status]}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                                                                <div>
                                                                    <p className="text-white-dark">Deadline</p>
                                                                    <p className="font-semibold mt-1">{sub.deadline ? new Date(sub.deadline).toLocaleDateString() : '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-white-dark">Created On</p>
                                                                    <p className="font-semibold mt-1">{sub.created_at ? sub.created_at.replace('T', ' ') : '-'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-white-dark">Progress</p>
                                                                    <p className="font-semibold mt-1">{sub.progress}%</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-white-dark">Assignees</p>
                                                                    <p className="font-semibold mt-1">{(sub.assignments || []).length}</p>
                                                                </div>
                                                            </div>
                                                            {(sub.assignments || []).length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                                    {sub.assignments.map((a) => (
                                                                        <span key={a.id} className="badge bg-info-light text-info px-2 py-0.5 text-[10px]">
                                                                            {a.employee_name} ({a.role})
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default AdminAssignTask;
