import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconCalendar from '../../components/Icon/IconCalendar';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/department-working-days/`;
const API_DEPTS = `${API_BASE_URL}/app/departments/?page_size=1000`;
const API_SHIFTS = `${API_BASE_URL}/app/shift-policies/`;

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Department = { id: number; department_name: string };
type Shift = { id: number; shift_type: string; checkin: string; checkout: string };

type WorkingDay = {
    id: number;
    department: Department | number;
    shifts: Shift[] | number[];
    working_days_count: number;
    working_days?: string[];
    weekend_days?: string[];
    week_start_day?: string;
    week_end_day?: string;
};

const AdminDeptWorkingDays = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<WorkingDay[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<any>({
        id: null,
        department_id: '',
        shift_id: '',
        working_days_count: 5,
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    });

    useEffect(() => {
        dispatch(setPageTitle('Dept Working Days'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (search.trim()) url.searchParams.append('search', search.trim());

            const [wdRes, depRes, shRes] = await Promise.all([
                fetch(url.toString(), { headers: headers() }),
                fetch(API_DEPTS, { headers: headers() }),
                fetch(API_SHIFTS, { headers: headers() }),
            ]);
            const wdData = await wdRes.json();
            const depData = await depRes.json();
            const shData = await shRes.json();
            if (!wdRes.ok) throw new Error(wdData?.detail || 'Failed to load working days');
            if (wdData.results) {
                setItems(wdData.results);
                setTotalCount(wdData.count ?? 0);
            } else {
                const arr = Array.isArray(wdData) ? wdData : [];
                setItems(arr);
                setTotalCount(arr.length);
            }
            setDepartments(Array.isArray(depData) ? depData : depData?.results || []);
            setShifts(Array.isArray(shData) ? shData : shData?.results || []);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAll();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, search]);

    const deptName = (d: any) => (typeof d === 'object' ? d?.department_name : departments.find((x) => x.id === d)?.department_name) || '-';
    const shiftLabel = (s: any) => {
        const sh = typeof s === 'object' ? s : shifts.find((x) => x.id === s);
        if (!sh) return '-';
        return `${sh.shift_type} (${sh.checkin} - ${sh.checkout})`;
    };

    const openAdd = () => {
        setForm({ 
            id: null, 
            department_id: '', 
            shift_id: '', 
            working_days_count: 5, 
            working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
        });
        setModalOpen(true);
    };

    const openEdit = (it: WorkingDay) => {
        const department_id = typeof it.department === 'object' ? it.department.id : it.department;
        const firstShift = Array.isArray(it.shifts) && it.shifts.length ? (typeof it.shifts[0] === 'object' ? (it.shifts[0] as any).id : (it.shifts[0] as any)) : '';
        setForm({
            id: it.id,
            department_id: String(department_id || ''),
            shift_id: String(firstShift || ''),
            working_days_count: it.working_days_count || 5,
            working_days: Array.isArray(it.working_days) && it.working_days.length > 0 ? it.working_days : [],
        });
        setModalOpen(true);
    };

    const toggleDay = (day: string) => {
        let newWorkingDays = [...(form.working_days || [])];
        if (newWorkingDays.includes(day)) {
            newWorkingDays = newWorkingDays.filter(d => d !== day);
        } else {
            if (newWorkingDays.length >= form.working_days_count) {
                Swal.fire('Limit Reached', `You can only select up to ${form.working_days_count} working days.`, 'warning');
                return;
            }
            newWorkingDays.push(day);
        }
        setForm({ ...form, working_days: newWorkingDays });
    };

    const save = async () => {
        try {
            const selectedWorkingDays = form.working_days || [];
            if (selectedWorkingDays.length !== Number(form.working_days_count)) {
                Swal.fire('Validation Error', `Please select exactly ${form.working_days_count} working days. You have selected ${selectedWorkingDays.length} so far.`, 'warning');
                return;
            }

            const weekendDays = DAYS_OF_WEEK.filter(d => !selectedWorkingDays.includes(d));

            const payload: any = {
                department: Number(form.department_id),
                working_days_count: Number(form.working_days_count || 0),
                working_days: selectedWorkingDays,
                weekend_days: weekendDays,
                shifts: form.shift_id ? [Number(form.shift_id)] : [],
            };
            
            if (!payload.department) {
                Swal.fire('Required', 'Department is required.', 'warning');
                return;
            }
            
            const isEdit = !!form.id;
            const resp = await fetch(isEdit ? `${API_URL}${form.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: headers(),
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to save');
            setModalOpen(false);
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (it: WorkingDay) => {
        const ok = await Swal.fire({ title: 'Delete config?', showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${it.id}/`, { method: 'DELETE', headers: headers() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const rows = useMemo(() => items, [items]);

    const columns: Column<WorkingDay>[] = [
        {
            key: 'id',
            label: '#',
            width: '60px',
            align: 'center',
            render: (_val, _row, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'department',
            label: 'Department',
            sortable: true,
            render: (_val, row) => <span className="font-semibold text-gray-800 dark:text-white-light">{deptName(row.department)}</span>,
        },
        {
            key: 'shifts',
            label: 'Shift',
            render: (_val, row) => (
                <span className="badge bg-info/10 text-info font-medium">
                    {Array.isArray(row.shifts) && row.shifts.length ? shiftLabel((row.shifts as any)[0]) : '-'}
                </span>
            ),
        },
        {
            key: 'working_days_count',
            label: 'Count',
            sortable: true,
            align: 'center',
            width: '100px',
            render: (_val, row) => <span className="badge bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">{row.working_days_count} days</span>,
        },
        {
            key: 'working_days',
            label: 'Active Working Days',
            render: (_val, row) => (
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {Array.isArray(row.working_days) && row.working_days.length > 0 
                        ? row.working_days.map(d => d.substring(0,3)).join(', ') 
                        : `${row.week_start_day || ''} to ${row.week_end_day || ''}`}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, row) => (
                <div className="flex items-center justify-center gap-2">
                    <IconButton tone="primary"
                        type="button"
                        
                        onClick={() => openEdit(row)}
                        title="Edit"
                    >
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger"
                        type="button"
                        
                        onClick={() => del(row)}
                        title="Delete"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <PageHeader
                icon={<IconCalendar />}
                title="Dept Working Days"
                subtitle="Configure department-wise working days and default shift."
                variant="indigo"
            />

            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                }}
                onRefresh={fetchAll}
                searchPlaceholder="Search working day configurations..."
                actionButton={
                    <Button type="button"  onClick={openAdd}>
                        <IconPlus className="w-4 h-4" /> Add
                    </Button>
                }
            />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={<>{form.id ? 'Edit' : 'Add'} Dept Working Days</>} size="xl">
                <div className="space-y-4">
                                                        <div>
                                                            <label className="font-semibold">Department</label>
                                                            <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                                                                <option value="">Select department</option>
                                                                {departments.map((d) => (
                                                                    <option key={d.id} value={d.id}>
                                                                        {d.department_name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="font-semibold">Shift (optional)</label>
                                                                <select className="form-select" value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}>
                                                                    <option value="">All / None</option>
                                                                    {shifts.map((s) => (
                                                                        <option key={s.id} value={s.id}>
                                                                            {shiftLabel(s)}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="font-semibold">Working Days Count</label>
                                                                <input className="form-input" type="number" min={1} max={7} value={form.working_days_count} onChange={(e) => {
                                                                    const count = Number(e.target.value);
                                                                    let currentDays = [...(form.working_days || [])];
                                                                    // Truncate if we lower the count
                                                                    if (currentDays.length > count) {
                                                                        currentDays = currentDays.slice(0, count);
                                                                    }
                                                                    setForm({ ...form, working_days_count: count, working_days: currentDays });
                                                                }} />
                                                            </div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <label className="font-semibold">Select Specific Working Days</label>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {DAYS_OF_WEEK.map(day => {
                                                                    const isSelected = (form.working_days || []).includes(day);
                                                                    return (
                                                                        <button 
                                                                        key={day} 
                                                                        type="button" 
                                                                        onClick={() => toggleDay(day)}
                                                                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                                                                        >
                                                                            {day.substring(0,3)}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-white-dark mt-2">
                                                                Selected <strong>{(form.working_days || []).length} / {form.working_days_count}</strong> days. Unselected days will automatically be evaluated as weekends.
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-3 pt-4">
                                                            <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button type="button"  onClick={save}>
                                                                Save
                                                            </Button>
                                                        </div>

                </div>
            </Modal>
        </div>
    );
};

export default AdminDeptWorkingDays;

