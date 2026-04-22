import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/leaves/`;

type Leave = {
    id: number;
    leave_name: string;
    count: number;
    is_paid: boolean;
};

const AdminLeaveCount = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Leave>>({ leave_name: '', count: 0, is_paid: false });

    useEffect(() => {
        dispatch(setPageTitle('Leave Count'));
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
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load');
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
        setForm({ leave_name: '', count: 0, is_paid: false });
        setModalOpen(true);
    };
    const openEdit = (l: Leave) => {
        setForm({ ...l });
        setModalOpen(true);
    };

    const save = async () => {
        try {
            const payload = {
                leave_name: (form.leave_name || '').trim(),
                count: Number(form.count || 0),
                is_paid: !!form.is_paid,
            };
            if (!payload.leave_name) {
                Swal.fire('Required', 'Leave name is required.', 'warning');
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
            Swal.fire('Success', isEdit ? 'Leave updated.' : 'Leave added.', 'success');
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (l: Leave) => {
        const ok = await Swal.fire({ title: `Delete "${l.leave_name}"?`, showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${l.id}/`, { method: 'DELETE', headers: headers() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <div className="bg-gradient-to-r from-[#022c22] to-[#10b981] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Leave Count</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Configure leave types and counts.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            </div>

            <div className="panel">
                <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                    <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                        <IconPlus /> Add Leave
                    </button>
                </div>

            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Leave Name</th>
                            <th>Count</th>
                            <th>Paid</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-white-dark">
                                    Loading...
                                </td>
                            </tr>
                        ) : items.length ? (
                            items.map((l, idx) => (
                                <tr key={l.id}>
                                    <td>{idx + 1}</td>
                                    <td className="font-semibold">{l.leave_name}</td>
                                    <td>{l.count}</td>
                                    <td>{l.is_paid ? 'Yes' : 'No'}</td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button type="button" className="text-primary" onClick={() => openEdit(l)} title="Edit">
                                                <IconPencil className="w-5 h-5" />
                                            </button>
                                            <button type="button" className="text-danger" onClick={() => del(l)} title="Delete">
                                                <IconTrashLines className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-white-dark">
                                    No leaves configured.
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg text-black dark:text-white-dark">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-white-dark hover:text-dark">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {form.id ? 'Edit Leave' : 'Add Leave'}
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div>
                                            <label className="font-semibold">Leave Name</label>
                                            <input className="form-input" value={form.leave_name || ''} onChange={(e) => setForm({ ...form, leave_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="font-semibold">Count</label>
                                            <input className="form-input" type="number" min={0} value={Number(form.count || 0)} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="font-semibold">Paid?</label>
                                            <select className="form-select" value={form.is_paid ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_paid: e.target.value === 'true' })}>
                                                <option value="true">Yes</option>
                                                <option value="false">No</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
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

export default AdminLeaveCount;

