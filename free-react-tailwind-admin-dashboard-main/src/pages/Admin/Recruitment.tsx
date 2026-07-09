import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { Dialog, Transition } from '@headlessui/react';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSearch from '../../components/Icon/IconSearch';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import IconX from '../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/recruitment/`;

type RecruitmentRecord = {
    id: number;
    reference_id?: string;
    name: string;
    email: string;
    job_title: string;
    salary?: string | number | null;
    status: 'waiting' | 'selected' | 'rejected';
    application_date?: string | null;
    interview_date?: string | null;
    appointment_date?: string | null;
    guardian_name?: string | null;
};

const AdminRecruitment = () => {
    const dispatch = useDispatch();
    const [rows, setRows] = useState<RecruitmentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState<'waiting' | 'selected' | 'rejected'>('waiting');

    useEffect(() => {
        dispatch(setPageTitle('Recruitment'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchRecruitments();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, pageSize]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    const fetchRecruitments = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

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
            console.error('Error fetching recruitment', e);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (r: RecruitmentRecord) => {
        setEditId(r.id);
        setEditStatus(r.status);
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editId) return;
        try {
            const res = await fetch(`${API_URL}${editId}/`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ status: editStatus }),
            });
            if (res.ok) {
                Swal.fire({ title: 'Updated!', text: 'Recruitment updated successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsEditOpen(false);
                setEditId(null);
                fetchRecruitments();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to update recruitment.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to update recruitment.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleDelete = async (r: RecruitmentRecord) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete candidate "${r.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_URL}${r.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok || res.status === 204) {
                Swal.fire({ title: 'Deleted!', text: 'Recruitment has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                fetchRecruitments();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete recruitment.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete recruitment.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#f59e0b] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Recruitment</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Track candidates and update their status.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        className="form-input pr-10 w-72"
                        placeholder="Search candidates..."
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
            </div>

            <div className="panel p-0 border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ref ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Job Title</th>
                                <th>Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-5">
                                        <span className="animate-pulse text-gray-400">Loading recruitment...</span>
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                rows.map((r, index) => (
                                    <tr key={r.id}>
                                        <td>{(page - 1) * pageSize + index + 1}</td>
                                        <td className="font-mono">{r.reference_id || '-'}</td>
                                        <td className="font-semibold">{r.name}</td>
                                        <td className="text-gray-500">{r.email}</td>
                                        <td className="text-gray-500">{r.job_title}</td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    r.status === 'selected' ? 'badge-outline-success' : r.status === 'rejected' ? 'badge-outline-danger' : 'badge-outline-warning'
                                                }`}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" className="text-primary hover:text-blue-700" onClick={() => openEdit(r)} title="Edit status">
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger hover:text-red-700" onClick={() => handleDelete(r)} title="Delete">
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-5 text-gray-400">No recruitment records found.</td>
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
                            {(() => {
                                const pages: (number | string)[] = [];
                                if (totalPages <= 3) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    if (page <= 2) {
                                        pages.push(1, 2, 3, 'right-ellipsis', totalPages);
                                    } else if (page >= totalPages - 1) {
                                        pages.push(1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages);
                                    } else {
                                        pages.push(1, 'left-ellipsis', page, 'right-ellipsis', totalPages);
                                    }
                                }
                                return pages.map((p, idx) => {
                                    if (p === 'left-ellipsis' || p === 'right-ellipsis') {
                                        const jumpPage = p === 'left-ellipsis' ? Math.max(1, page - 3) : Math.min(totalPages, page + 3);
                                        return (
                                            <li key={`${p}-${idx}`}>
                                                <button
                                                    type="button"
                                                    title={p === 'left-ellipsis' ? "Previous 3 pages" : "Next 3 pages"}
                                                    className="flex justify-center font-semibold px-3 py-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer"
                                                    onClick={() => setPage(jumpPage)}
                                                >
                                                    ...
                                                </button>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={p}>
                                            <button
                                                type="button"
                                                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${page === p ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]' : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'}`}
                                                onClick={() => setPage(p as number)}
                                            >
                                                {p}
                                            </button>
                                        </li>
                                    );
                                });
                            })()}
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

            <Transition appear show={isEditOpen} as={Fragment}>
                <Dialog as="div" open={isEditOpen} onClose={() => setIsEditOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-md text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setIsEditOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        Update Status
                                    </div>
                                    <div className="p-5">
                                        <div className="mb-5">
                                            <label className="font-semibold mb-1 block">Status</label>
                                            <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                                                <option value="waiting">waiting</option>
                                                <option value="selected">selected</option>
                                                <option value="rejected">rejected</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end items-center gap-3 mt-8">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setIsEditOpen(false)}>
                                                Cancel
                                            </button>
                                            <button type="button" className="btn btn-primary" onClick={saveEdit}>
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

export default AdminRecruitment;

