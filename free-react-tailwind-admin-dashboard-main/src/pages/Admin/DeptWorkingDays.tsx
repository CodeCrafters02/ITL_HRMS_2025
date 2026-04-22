import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';

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
            const [wdRes, depRes, shRes] = await Promise.all([
                fetch(API_URL, { headers: headers() }),
                fetch(API_DEPTS, { headers: headers() }),
                fetch(API_SHIFTS, { headers: headers() }),
            ]);
            const wdData = await wdRes.json();
            const depData = await depRes.json();
            const shData = await shRes.json();
            if (!wdRes.ok) throw new Error(wdData?.detail || 'Failed to load working days');
            setItems(Array.isArray(wdData) ? wdData : wdData?.results || []);
            setDepartments(Array.isArray(depData) ? depData : depData?.results || []);
            setShifts(Array.isArray(shData) ? shData : shData?.results || []);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <div className="bg-gradient-to-r from-[#0f172a] to-[#3b82f6] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Dept Working Days</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Configure department-wise working days and default shift.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            </div>

            <div className="panel">
                <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                    <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                        <IconPlus /> Add
                    </button>
                </div>

            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Department</th>
                            <th>Shift</th>
                            <th>Count</th>
                            <th>Active Working Days</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-white-dark">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length ? (
                            rows.map((it, idx) => (
                                <tr key={it.id}>
                                    <td>{idx + 1}</td>
                                    <td className="font-semibold">{deptName(it.department)}</td>
                                    <td>{Array.isArray(it.shifts) && it.shifts.length ? shiftLabel((it.shifts as any)[0]) : '-'}</td>
                                    <td>{it.working_days_count}</td>
                                    <td>
                                        {Array.isArray(it.working_days) && it.working_days.length > 0 
                                            ? it.working_days.map(d => d.substring(0,3)).join(', ') 
                                            : `${it.week_start_day || ''} to ${it.week_end_day || ''}`}
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button type="button" className="text-primary" onClick={() => openEdit(it)} title="Edit">
                                                <IconPencil className="w-5 h-5" />
                                            </button>
                                            <button type="button" className="text-danger" onClick={() => del(it)} title="Delete">
                                                <IconTrashLines className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-white-dark">
                                    No configurations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-xl text-black dark:text-white-dark">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-white-dark hover:text-dark">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {form.id ? 'Edit' : 'Add'} Dept Working Days
                                    </div>
                                    <div className="p-5 space-y-4">
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
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                Cancel
                                            </button>
                                            <button type="button" className="btn btn-primary" onClick={save}>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
        </div>
    );
};

export default AdminDeptWorkingDays;

