import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconPencil from '../../components/Icon/IconPencil';
import IconX from '../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/employee/employeereference/`;

type EmployeeReference = {
    id: number;
    employee: number;
    employee_name?: string;
    employee_id?: string;
    employee_email?: string;
    employee_designation?: string;
    employee_department?: string;
    name: string;
    designation: string;
    contact_number: string;
    email: string;
    resume?: string | null;
    status: 'Pending' | 'Approved' | 'Rejected';
    admin_comment?: string | null;
    submitted_at: string;
    updated_at: string;
};

const AdminEmployeeReferences = () => {
    const dispatch = useDispatch();
    const [rows, setRows] = useState<EmployeeReference[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedRef, setSelectedRef] = useState<EmployeeReference | null>(null);
    const [editStatus, setEditStatus] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
    const [adminComment, setAdminComment] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Employee References'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchReferences();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const resolveUrl = (value?: string | null) => {
        if (!value) return null;
        return value.startsWith('http') ? value : `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
    };

    const fetchReferences = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());
            if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);

            const res = await fetch(url.toString(), { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setRows(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setRows(data);
                    setTotalCount(Array.isArray(data) ? data.length : 0);
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error('Error fetching employee references', e);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}${id}/`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSelectedRef(data);
                setEditStatus(data.status);
                setAdminComment(data.admin_comment || '');
                setEditModalOpen(true);
            }
        } catch (e) {
            console.error('Error loading employee reference', e);
        }
    };

    const saveReview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRef) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}${selectedRef.id}/review/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    status: editStatus,
                    admin_comment: adminComment,
                }),
            });
            if (res.ok) {
                Swal.fire({ title: 'Updated!', text: 'Reference review updated successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setEditModalOpen(false);
                setSelectedRef(null);
                fetchReferences();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to update reference.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to update reference.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#6366f1] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee References</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Review employee referrals from people referred by employees in your company.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search references..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="form-select w-40"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as any);
                            setPage(1);
                        }}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Employee</th>
                                <th>Reference Name</th>
                                <th>Designation</th>
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Resume</th>
                                <th>Status</th>
                                <th>Admin Comment</th>
                                <th>Submitted</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading references...</span>
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                rows.map((ref, idx) => (
                                    <tr key={ref.id}>
                                        <td>{(page - 1) * pageSize + idx + 1}</td>
                                        <td>
                                            <div className="font-semibold">{ref.employee_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{ref.employee_id || '-'}</div>
                                        </td>
                                        <td className="font-semibold">{ref.name}</td>
                                        <td className="text-gray-500">{ref.designation}</td>
                                        <td className="text-gray-500">{ref.email}</td>
                                        <td className="text-gray-500">{ref.contact_number}</td>
                                        <td>
                                            {resolveUrl(ref.resume) ? (
                                                <a className="text-primary underline" href={resolveUrl(ref.resume)!} target="_blank" rel="noreferrer">
                                                    View Resume
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    ref.status === 'Approved'
                                                        ? 'badge-outline-success'
                                                        : ref.status === 'Rejected'
                                                          ? 'badge-outline-danger'
                                                          : 'badge-outline-warning'
                                                }`}
                                            >
                                                {ref.status}
                                            </span>
                                        </td>
                                        <td className="text-gray-500 max-w-[220px] truncate">{ref.admin_comment || '-'}</td>
                                        <td className="text-gray-500">{new Date(ref.submitted_at).toLocaleDateString()}</td>
                                        <td className="text-center">
                                            <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEditModal(ref.id)} title="Review">
                                                <IconPencil className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="text-center py-5 text-gray-400">No references found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalCount > 0 && (
                    <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                                Showing <span className="text-primary">{(page - 1) * pageSize + 1}</span> to <span className="text-primary">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-primary">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Per page:</span>
                                <select
                                    className="form-select w-20 text-sm font-semibold py-1"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        <ul className="inline-flex items-center space-x-1 font-semibold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <li key={p}>
                                    <button
                                        type="button"
                                        className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <Transition appear show={editModalOpen} as={Fragment}>
                <Dialog as="div" open={editModalOpen} onClose={() => setEditModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setEditModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Review Employee Reference
                                    </div>
                                    <div className="p-5">
                                        {selectedRef && (
                                            <form onSubmit={saveReview} className="space-y-5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div><label className="font-semibold mb-1 block">Employee</label><input className="form-input" value={selectedRef.employee_name || ''} disabled /></div>
                                                    <div><label className="font-semibold mb-1 block">Reference Name</label><input className="form-input" value={selectedRef.name} disabled /></div>
                                                    <div><label className="font-semibold mb-1 block">Designation</label><input className="form-input" value={selectedRef.designation} disabled /></div>
                                                    <div><label className="font-semibold mb-1 block">Contact</label><input className="form-input" value={selectedRef.contact_number} disabled /></div>
                                                    <div><label className="font-semibold mb-1 block">Email</label><input className="form-input" value={selectedRef.email} disabled /></div>
                                                    <div>
                                                        <label className="font-semibold mb-1 block">Resume</label>
                                                        {resolveUrl(selectedRef.resume) ? (
                                                            <a className="text-primary underline" href={resolveUrl(selectedRef.resume)!} target="_blank" rel="noreferrer">
                                                                View Resume
                                                            </a>
                                                        ) : (
                                                            <div className="text-gray-400 text-sm">No resume</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="font-semibold mb-1 block">Status</label>
                                                    <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} disabled={saving}>
                                                        <option value="Pending">Pending</option>
                                                        <option value="Approved">Approved</option>
                                                        <option value="Rejected">Rejected</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="font-semibold mb-1 block">Admin Comment</label>
                                                    <textarea className="form-textarea min-h-[120px]" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} disabled={saving} />
                                                </div>

                                                <div className="flex justify-end items-center gap-3 mt-8">
                                                    <button type="button" className="btn btn-outline-danger" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                                        {saving ? 'Saving...' : 'Save Review'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
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

export default AdminEmployeeReferences;

