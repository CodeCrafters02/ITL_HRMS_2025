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

type OffRule = { weekday: string; weeks: number[] };
const WEEK_OPTS: [number, string][] = [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [5, '5th'], [-1, 'Last']];

type WorkingDay = {
    id: number;
    department: Department | number;
    shifts: Shift[] | number[];
    working_days_count: number;
    working_days?: string[];
    weekend_days?: string[];
    off_day_rules?: OffRule[];
    effective_from?: string | null;
    week_start_day?: string;
    week_end_day?: string;
};

const AdminDeptWorkingDays = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<WorkingDay[]>([]);
    const [configuredDepts, setConfiguredDepts] = useState<Set<number> | null>(null);
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
        off_day_rules: [] as OffRule[],
        effective_from: '',
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
            fetch(`${API_URL}?page_size=1000`, { headers: headers() })
                .then((x) => x.json())
                .then((d) => {
                    const list: WorkingDay[] = Array.isArray(d) ? d : d?.results || [];
                    setConfiguredDepts(new Set(list.map((c) => (typeof c.department === 'object' ? c.department?.id : c.department)).filter(Boolean) as number[]));
                })
                .catch(() => {});
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
            working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            off_day_rules: [],
            effective_from: '',
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
            off_day_rules: Array.isArray(it.off_day_rules) ? it.off_day_rules : [],
            effective_from: '',
            current_effective_from: it.effective_from || null,
        });
        setModalOpen(true);
    };

    const [previewOffset, setPreviewOffset] = useState(0);
    const preview = useMemo(() => {
        const base = new Date();
        const y = new Date(base.getFullYear(), base.getMonth() + previewOffset, 1);
        const year = y.getFullYear();
        const month = y.getMonth();
        const total = new Date(year, month + 1, 0).getDate();
        const working: string[] = (form.working_days || []).map((d: string) => d.toLowerCase());
        const rules: OffRule[] = form.off_day_rules || [];
        const cells = Array.from({ length: total }, (_, i) => {
            const day = i + 1;
            const name = DAYS_OF_WEEK[(new Date(year, month, day).getDay() + 6) % 7].toLowerCase();
            const nth = Math.floor((day - 1) / 7) + 1;
            const ruleOff = rules.some((x) => x.weekday === name && (!x.weeks.length || x.weeks.includes(nth) || (x.weeks.includes(-1) && day + 7 > total)));
            return { day, off: !working.includes(name) || ruleOff, ruleOff };
        });
        return { label: y.toLocaleString('default', { month: 'long', year: 'numeric' }), lead: (y.getDay() + 6) % 7, cells, workingCount: cells.filter((c) => !c.off).length };
    }, [previewOffset, form.working_days, form.off_day_rules]);

    const setRule = (i: number, patch: Partial<OffRule>) =>
        setForm({ ...form, off_day_rules: form.off_day_rules.map((x: OffRule, j: number) => (j === i ? { ...x, ...patch } : x)) });

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
                department: form.department_id === 'all' ? 0 : Number(form.department_id),
                working_days_count: Number(form.working_days_count || 0),
                working_days: selectedWorkingDays,
                weekend_days: weekendDays,
                effective_from: form.effective_from || undefined,
                off_day_rules: (form.off_day_rules || []).filter((x: OffRule) => x.weeks.length > 0),
                shifts: form.shift_id ? [Number(form.shift_id)] : [],
            };
            
            const isAll = form.department_id === 'all';
            if (!payload.department && !isAll) {
                Swal.fire('Required', 'Department is required.', 'warning');
                return;
            }

            if (isAll) {
                const ok = await Swal.fire({ title: 'Apply to all departments?', text: 'Existing configs of every department will be overwritten with these working days and off-day rules.', showCancelButton: true, confirmButtonText: 'Apply' });
                if (!ok.isConfirmed) return;
                const existingRes = await fetch(`${API_URL}?page_size=1000`, { headers: headers() });
                const existingData = await existingRes.json();
                const existing: WorkingDay[] = Array.isArray(existingData) ? existingData : existingData?.results || [];
                const deptOf = (i: WorkingDay) => (typeof i.department === 'object' ? i.department.id : i.department);
                const calls = departments.flatMap((d) => {
                    const mine = existing.filter((e) => deptOf(e) === d.id);
                    if (!mine.length) return [fetch(API_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ ...payload, department: d.id }) })];
                    return mine.map((e) => fetch(`${API_URL}${e.id}/`, {
                        method: 'PUT',
                        headers: headers(),
                        body: JSON.stringify({ ...payload, department: d.id, shifts: (e.shifts as any[]).map((x) => (typeof x === 'object' ? x.id : x)) }),
                    }));
                });
                const results = await Promise.all(calls);
                const failed = results.filter((x) => !x.ok).length;
                setModalOpen(false);
                await fetchAll();
                if (failed) Swal.fire('Partially applied', `${failed} of ${results.length} configs failed to save.`, 'warning');
                else Swal.fire('Done', `Applied to ${departments.length} department(s).`, 'success');
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

            {configuredDepts && departments.some((d) => !configuredDepts.has(d.id)) && (
                <div className="rounded border border-warning bg-warning-light text-warning p-3 text-sm">
                    <strong>Working days not defined</strong> for: {departments.filter((d) => !configuredDepts.has(d.id)).map((d) => d.department_name).join(', ')}. Default (Sat &amp; Sun off) applies to them.
                </div>
            )}

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
                                                                <option value="all">All Departments</option>
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

                                                        <div className="mt-4">
                                                            <label className="font-semibold">Effective From</label>
                                                            <input className="form-input" type="date" value={form.effective_from || ''} min={form.current_effective_from ? new Date(new Date(form.current_effective_from).getTime() + 86400000).toISOString().slice(0, 10) : undefined} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
                                                            <div className="text-xs text-white-dark mt-1">
                                                                Changes apply from this date onward (blank = today). Earlier dates keep the previous working days, so past attendance and payroll don't change.
                                                                {form.current_effective_from ? ` Current version started on ${form.current_effective_from}.` : ''}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <label className="font-semibold">Recurring Off Days (e.g. 2nd & 4th Saturday)</label>
                                                            {(form.off_day_rules || []).map((rule: OffRule, i: number) => (
                                                                <div key={i} className="flex flex-wrap items-center gap-2 mt-2">
                                                                    <select className="form-select w-auto" value={rule.weekday} onChange={(e) => setRule(i, { weekday: e.target.value })}>
                                                                        {DAYS_OF_WEEK.map((d) => (
                                                                            <option key={d} value={d.toLowerCase()}>{d}</option>
                                                                        ))}
                                                                    </select>
                                                                    {WEEK_OPTS.map(([n, label]) => (
                                                                        <button
                                                                            key={n}
                                                                            type="button"
                                                                            className={`btn btn-sm ${rule.weeks.includes(n) ? 'btn-primary' : 'btn-outline-primary'}`}
                                                                            onClick={() => setRule(i, { weeks: rule.weeks.includes(n) ? rule.weeks.filter((w) => w !== n) : [...rule.weeks, n] })}
                                                                        >
                                                                            {label}
                                                                        </button>
                                                                    ))}
                                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setForm({ ...form, off_day_rules: form.off_day_rules.filter((_: OffRule, j: number) => j !== i) })}>
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={() => setForm({ ...form, off_day_rules: [...(form.off_day_rules || []), { weekday: 'saturday', weeks: [2] }] })}>
                                                                + Add rule
                                                            </button>
                                                            <div className="text-xs text-white-dark mt-2">Applies on top of the working days above; those dates are treated as holidays.</div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <div className="flex items-center justify-between">
                                                                <label className="font-semibold">Preview – {preview.label}</label>
                                                                <div className="flex gap-2">
                                                                    <button type="button" className="btn btn-sm btn-outline-primary" disabled={previewOffset <= 0} onClick={() => setPreviewOffset(previewOffset - 1)}>&lt;</button>
                                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPreviewOffset(previewOffset + 1)}>&gt;</button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-7 gap-1 mt-2 text-center text-xs">
                                                                {DAYS_OF_WEEK.map((d) => (
                                                                    <div key={d} className="font-semibold text-white-dark">{d.substring(0, 3)}</div>
                                                                ))}
                                                                {Array.from({ length: preview.lead }, (_, i) => (
                                                                    <div key={`b${i}`} />
                                                                ))}
                                                                {preview.cells.map((c) => (
                                                                    <div
                                                                        key={c.day}
                                                                        title={c.ruleOff ? 'Off (recurring rule)' : c.off ? 'Weekly off' : 'Working day'}
                                                                        className={`rounded py-1 ${c.ruleOff ? 'bg-warning text-white' : c.off ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}
                                                                    >
                                                                        {c.day}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="text-xs text-white-dark mt-2">
                                                                <strong>{preview.workingCount}</strong> working / {preview.cells.length - preview.workingCount} off days. Green = working, red = weekly off, orange = recurring off rule.
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

