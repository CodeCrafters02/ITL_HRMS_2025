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

const AdminShift = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<ShiftPolicy[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ShiftPolicy | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Shift'));
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
            const resp = await fetch(API_URL, { headers: headers() });
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

    const openAdd = () => {
        setEditing({
            id: 0,
            shift_type: '',
            checkin: '09:00:00',
            checkout: '18:00:00',
            grace_period: '00:10:00',
            half_day: '04:00:00',
            full_day: '08:00:00',
        });
        setModalOpen(true);
    };

    const openEdit = (s: ShiftPolicy) => {
        setEditing({ ...s });
        setModalOpen(true);
    };

    const save = async () => {
        if (!editing) return;
        const payload = {
            shift_type: (editing.shift_type || '').trim(),
            checkin: editing.checkin,
            checkout: editing.checkout,
            grace_period: editing.grace_period,
            half_day: editing.half_day,
            full_day: editing.full_day,
        };
        if (!payload.shift_type) {
            Swal.fire('Required', 'Shift type is required.', 'warning');
            return;
        }
        try {
            const isEdit = !!editing.id;
            const resp = await fetch(isEdit ? `${API_URL}${editing.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: headers(),
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to save');
            setModalOpen(false);
            setEditing(null);
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (s: ShiftPolicy) => {
        const ok = await Swal.fire({ title: `Delete "${s.shift_type}"?`, showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${s.id}/`, { method: 'DELETE', headers: headers() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const countLabel = useMemo(() => `${items.length} total`, [items.length]);

    return (
        <div className="panel">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-xl font-bold">Shift Policies</div>
                    <div className="text-sm text-white-dark">{countLabel}</div>
                </div>
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
                            <th>Checkin</th>
                            <th>Checkout</th>
                            <th>Grace</th>
                            <th>Half day</th>
                            <th>Full day</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-6 text-white-dark">
                                    Loading...
                                </td>
                            </tr>
                        ) : items.length ? (
                            items.map((s, idx) => (
                                <tr key={s.id}>
                                    <td>{idx + 1}</td>
                                    <td className="font-semibold">{s.shift_type}</td>
                                    <td className="font-mono">{s.checkin}</td>
                                    <td className="font-mono">{s.checkout}</td>
                                    <td className="font-mono">{s.grace_period}</td>
                                    <td className="font-mono">{s.half_day}</td>
                                    <td className="font-mono">{s.full_day}</td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button type="button" className="text-primary" onClick={() => openEdit(s)} title="Edit">
                                                <IconPencil className="w-5 h-5" />
                                            </button>
                                            <button type="button" className="text-danger" onClick={() => del(s)} title="Delete">
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

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-2xl text-black dark:text-white-dark">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-white-dark hover:text-dark">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {editing?.id ? 'Edit Shift' : 'Add Shift'}
                                    </div>
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="font-semibold">Shift Type</label>
                                            <input className="form-input" value={editing?.shift_type || ''} onChange={(e) => setEditing((p) => (p ? { ...p, shift_type: e.target.value } : p))} />
                                        </div>
                                        {(['checkin', 'checkout', 'grace_period', 'half_day', 'full_day'] as const).map((k) => (
                                            <div key={k}>
                                                <label className="font-semibold">{k.replace('_', ' ')}</label>
                                                <input
                                                    className="form-input font-mono"
                                                    value={(editing as any)?.[k] || '00:00:00'}
                                                    onChange={(e) => setEditing((p) => (p ? ({ ...p, [k]: e.target.value } as any) : p))}
                                                />
                                            </div>
                                        ))}
                                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
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
    );
};

export default AdminShift;

