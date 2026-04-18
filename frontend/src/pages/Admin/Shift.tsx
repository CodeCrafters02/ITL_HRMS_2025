import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/shift-policies/`;

type ShiftPolicy = {
    id: number;
    shift_type: string;
    checkin: string;
    checkout: string;
    grace_period: string;
    half_day: string;
    full_day: string;
};

// ─── Time helpers ───
// Generate time options in 15-minute intervals: ["00:00", "00:15", ..., "23:45"]
const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return options;
};
const TIME_OPTIONS = generateTimeOptions();

// Generate duration options in 5-minute intervals from 00:05 to 02:00
const generateGraceOptions = (): string[] => {
    const options: string[] = [];
    for (let m = 0; m <= 120; m += 5) {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        options.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    return options;
};
const GRACE_OPTIONS = generateGraceOptions();

// Parse "HH:MM" or "HH:MM:SS" into total minutes
const timeToMinutes = (t: string): number => {
    if (!t) return 0;
    const parts = t.split(':');
    return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
};

// Convert minutes back to "HH:MM:SS"
const minutesToHHMMSS = (mins: number): string => {
    const h = Math.floor(Math.abs(mins) / 60);
    const m = Math.abs(mins) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

// Format "HH:MM:SS" → "HH:MM" for display / dropdown matching
const toHHMM = (t: string): string => {
    if (!t) return '00:00';
    const parts = t.split(':');
    return `${(parts[0] || '00').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
};

// Format "HH:MM" or "HH:MM:SS" to a readable label like "09:00 AM"
const formatTimeLabel = (t: string): string => {
    const parts = t.split(':');
    let h = parseInt(parts[0] || '0');
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

// Format duration "HH:MM:SS" to readable like "8h 30m"
const formatDuration = (t: string): string => {
    if (!t || t === '00:00:00') return '0h 0m';
    const parts = t.split(':');
    const h = parseInt(parts[0] || '0');
    const m = parseInt(parts[1] || '0');
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

// Calculate total work hours between checkin and checkout
const calcTotalHours = (checkin: string, checkout: string): string => {
    const inMins = timeToMinutes(checkin);
    let outMins = timeToMinutes(checkout);
    // Handle overnight: if checkout is before checkin, add 24h
    if (outMins <= inMins) outMins += 24 * 60;
    return minutesToHHMMSS(outMins - inMins);
};

// Calculate half day = total / 2
const calcHalfDay = (fullDayHHMMSS: string): string => {
    const totalMins = timeToMinutes(fullDayHHMMSS);
    return minutesToHHMMSS(Math.floor(totalMins / 2));
};

const AdminShift = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<ShiftPolicy[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ShiftPolicy | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        dispatch(setPageTitle('Shift'));
    }, [dispatch]);

    const hdrs = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const resp = await fetch(API_URL, { headers: hdrs() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load shift policies');
            setItems(Array.isArray(data) ? data : data?.results || []);
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

    // ─── Auto-calculate full_day when checkin/checkout changes ───
    useEffect(() => {
        if (!editing) return;
        const fullDay = calcTotalHours(editing.checkin, editing.checkout);
        const totalMins = timeToMinutes(fullDay);
        // If half_day exceeds total, reset it
        const halfMins = timeToMinutes(editing.half_day);
        const newHalfDay = halfMins > totalMins ? minutesToHHMMSS(Math.floor(totalMins / 2)) : editing.half_day;
        setEditing((p) => (p ? { ...p, full_day: fullDay, half_day: newHalfDay } : p));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing?.checkin, editing?.checkout]);

    const openAdd = () => {
        setErrors({});
        setEditing({
            id: 0,
            shift_type: '',
            checkin: '09:00:00',
            checkout: '18:00:00',
            grace_period: '00:15:00',
            half_day: '04:30:00',
            full_day: '09:00:00',
        });
        setModalOpen(true);
    };

    const openEdit = (s: ShiftPolicy) => {
        setErrors({});
        setEditing({ ...s });
        setModalOpen(true);
    };

    const validate = (): boolean => {
        if (!editing) return false;
        const errs: Record<string, string> = {};

        if (!editing.shift_type.trim()) {
            errs.shift_type = 'Shift type is required';
        }
        if (!editing.checkin || editing.checkin === '00:00:00') {
            errs.checkin = 'Check-in time is required';
        }
        if (!editing.checkout || editing.checkout === '00:00:00') {
            errs.checkout = 'Check-out time is required';
        }
        if (editing.checkin && editing.checkout && toHHMM(editing.checkin) === toHHMM(editing.checkout)) {
            errs.checkout = 'Check-out must be different from check-in';
        }
        if (!editing.grace_period || editing.grace_period === '00:00:00') {
            errs.grace_period = 'Grace period is required';
        }

        // Check total hours are reasonable (at least 1 hour)
        const totalMins = timeToMinutes(calcTotalHours(editing.checkin, editing.checkout));
        if (totalMins < 60) {
            errs.checkout = 'Shift must be at least 1 hour long';
        }
        if (totalMins > 16 * 60) {
            errs.checkout = 'Shift cannot exceed 16 hours';
        }

        // Half day validation
        const halfMins = timeToMinutes(editing.half_day);
        if (halfMins <= 0) {
            errs.half_day = 'Half day hours are required';
        } else if (halfMins >= totalMins) {
            errs.half_day = `Half day must be less than total hours (${formatDuration(minutesToHHMMSS(totalMins))})`;
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const save = async () => {
        if (!editing || !validate()) return;
        const payload = {
            shift_type: editing.shift_type.trim(),
            checkin: editing.checkin.length === 5 ? `${editing.checkin}:00` : editing.checkin,
            checkout: editing.checkout.length === 5 ? `${editing.checkout}:00` : editing.checkout,
            grace_period: editing.grace_period.length === 5 ? `${editing.grace_period}:00` : editing.grace_period,
            half_day: editing.half_day,
            full_day: editing.full_day,
        };
        try {
            const isEdit = !!editing.id;
            const resp = await fetch(isEdit ? `${API_URL}${editing.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: hdrs(),
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || JSON.stringify(data) || 'Failed to save');
            Swal.fire({ title: 'Saved!', text: `Shift "${payload.shift_type}" saved successfully.`, icon: 'success', timer: 1500, showConfirmButton: false });
            setModalOpen(false);
            setEditing(null);
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (s: ShiftPolicy) => {
        const ok = await Swal.fire({ title: `Delete "${s.shift_type}"?`, showCancelButton: true, confirmButtonText: 'Delete', icon: 'warning' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${s.id}/`, { method: 'DELETE', headers: hdrs() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1200, showConfirmButton: false });
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const countLabel = useMemo(() => `${items.length} total`, [items.length]);

    // Computed total hours for the editing modal
    const computedTotal = editing ? calcTotalHours(editing.checkin, editing.checkout) : '00:00:00';

    return (
        <div>
            {/* Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Shift Policies</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Configure work shifts, check-in/check-out times and grace periods.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{countLabel}</div>
                    <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                        <IconPlus /> Add Shift
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Shift Type</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Total Hours</th>
                                <th>Grace</th>
                                <th>Half Day</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-6 text-white-dark">
                                        <span className="animate-pulse">Loading...</span>
                                    </td>
                                </tr>
                            ) : items.length ? (
                                items.map((s, idx) => (
                                    <tr key={s.id}>
                                        <td>{idx + 1}</td>
                                        <td className="font-semibold">{s.shift_type}</td>
                                        <td>
                                            <span className="badge badge-outline-primary font-mono px-2.5 py-1">
                                                {formatTimeLabel(s.checkin)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-outline-danger font-mono px-2.5 py-1">
                                                {formatTimeLabel(s.checkout)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-outline-success font-mono px-2.5 py-1">
                                                {formatDuration(s.full_day)}
                                            </span>
                                        </td>
                                        <td className="font-mono text-gray-500">{formatDuration(s.grace_period)}</td>
                                        <td className="font-mono text-gray-500">{formatDuration(s.half_day)}</td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEdit(s)} title="Edit">
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => del(s)} title="Delete">
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-6 text-white-dark">
                                        No shift policies found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Add/Edit Modal ─── */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-white-dark hover:text-dark">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {editing?.id ? 'Edit Shift' : 'Add New Shift'}
                                    </div>
                                    <div className="p-5 space-y-5">
                                        {/* Shift Type */}
                                        <div>
                                            <label className="font-semibold text-sm mb-1 block">
                                                Shift Type <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                className={`form-input ${errors.shift_type ? 'border-danger' : ''}`}
                                                placeholder="e.g., Morning, General, Night"
                                                value={editing?.shift_type || ''}
                                                onChange={(e) => {
                                                    setEditing((p) => (p ? { ...p, shift_type: e.target.value } : p));
                                                    setErrors((prev) => ({ ...prev, shift_type: '' }));
                                                }}
                                            />
                                            {errors.shift_type && <p className="text-danger text-xs mt-1">{errors.shift_type}</p>}
                                        </div>

                                        {/* Check-in & Check-out */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="font-semibold text-sm mb-1 block">
                                                    Check-in Time <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className={`form-select font-mono ${errors.checkin ? 'border-danger' : ''}`}
                                                    value={toHHMM(editing?.checkin || '09:00')}
                                                    onChange={(e) => {
                                                        setEditing((p) => (p ? { ...p, checkin: `${e.target.value}:00` } : p));
                                                        setErrors((prev) => ({ ...prev, checkin: '', checkout: '' }));
                                                    }}
                                                >
                                                    {TIME_OPTIONS.map((t) => (
                                                        <option key={`ci-${t}`} value={t}>
                                                            {formatTimeLabel(t)}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.checkin && <p className="text-danger text-xs mt-1">{errors.checkin}</p>}
                                            </div>
                                            <div>
                                                <label className="font-semibold text-sm mb-1 block">
                                                    Check-out Time <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className={`form-select font-mono ${errors.checkout ? 'border-danger' : ''}`}
                                                    value={toHHMM(editing?.checkout || '18:00')}
                                                    onChange={(e) => {
                                                        setEditing((p) => (p ? { ...p, checkout: `${e.target.value}:00` } : p));
                                                        setErrors((prev) => ({ ...prev, checkout: '' }));
                                                    }}
                                                >
                                                    {TIME_OPTIONS.map((t) => (
                                                        <option key={`co-${t}`} value={t}>
                                                            {formatTimeLabel(t)}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.checkout && <p className="text-danger text-xs mt-1">{errors.checkout}</p>}
                                            </div>
                                        </div>

                                        {/* Auto-calculated Total Hours (read-only display) */}
                                        <div className="bg-gray-50 dark:bg-[#1a2941] rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Shift Hours (auto-calculated)</p>
                                                    <p className="text-lg font-bold text-success">{formatDuration(computedTotal)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Half Day — editable dropdown */}
                                        <div>
                                            <label className="font-semibold text-sm mb-1 block">
                                                Half Day Hours <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select font-mono ${errors.half_day ? 'border-danger' : ''}`}
                                                value={toHHMM(editing?.half_day || '04:00')}
                                                onChange={(e) => {
                                                    setEditing((p) => (p ? { ...p, half_day: `${e.target.value}:00` } : p));
                                                    setErrors((prev) => ({ ...prev, half_day: '' }));
                                                }}
                                            >
                                                {(() => {
                                                    const totalMins = timeToMinutes(computedTotal);
                                                    const opts: string[] = [];
                                                    for (let m = 15; m < totalMins; m += 15) {
                                                        const hh = Math.floor(m / 60);
                                                        const mm = m % 60;
                                                        opts.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
                                                    }
                                                    return opts.map((t) => (
                                                        <option key={`hd-${t}`} value={t}>
                                                            {formatDuration(`${t}:00`)}
                                                        </option>
                                                    ));
                                                })()}
                                            </select>
                                            {errors.half_day && <p className="text-danger text-xs mt-1">{errors.half_day}</p>}
                                            <p className="text-xs text-gray-400 mt-1">Must be less than total shift hours ({formatDuration(computedTotal)})</p>
                                        </div>

                                        {/* Grace Period */}
                                        <div>
                                            <label className="font-semibold text-sm mb-1 block">
                                                Grace Period <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className={`form-select font-mono ${errors.grace_period ? 'border-danger' : ''}`}
                                                value={toHHMM(editing?.grace_period || '00:15')}
                                                onChange={(e) => {
                                                    setEditing((p) => (p ? { ...p, grace_period: `${e.target.value}:00` } : p));
                                                    setErrors((prev) => ({ ...prev, grace_period: '' }));
                                                }}
                                            >
                                                {GRACE_OPTIONS.map((t) => (
                                                    <option key={`gp-${t}`} value={t}>
                                                        {formatDuration(`${t}:00`)}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.grace_period && <p className="text-danger text-xs mt-1">{errors.grace_period}</p>}
                                            <p className="text-xs text-gray-400 mt-1">Allowed late check-in buffer time</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                Cancel
                                            </button>
                                            <button type="button" className="btn btn-primary" onClick={save}>
                                                {editing?.id ? 'Update Shift' : 'Create Shift'}
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
    );
};

export default AdminShift;
