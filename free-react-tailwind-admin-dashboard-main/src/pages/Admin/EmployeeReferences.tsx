import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPencil from '../../components/Icon/IconPencil';
import IconX from '../../components/Icon/IconX';
import DataTable, { Column } from '../../components/Common/DataTable';

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

    const columns: Column<EmployeeReference>[] = [
        {
            key: 'id',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _row, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'employee',
            title: 'Employee',
            sortable: true,
            render: (_val, ref) => (
                <div>
                    <div className="font-semibold text-gray-800 dark:text-white-light">{ref.employee_name || '-'}</div>
                    <div className="text-xs text-gray-500">{ref.employee_id || '-'}</div>
                </div>
            ),
        },
        {
            key: 'name',
            title: 'Reference Name',
            sortable: true,
            render: (_val, ref) => <span className="font-semibold text-gray-800 dark:text-white-light">{ref.name}</span>,
        },
        {
            key: 'designation',
            title: 'Designation',
            sortable: true,
            render: (_val, ref) => <span className="text-gray-600 dark:text-gray-300">{ref.designation}</span>,
        },
        {
            key: 'email',
            title: 'Email',
            render: (_val, ref) => <span className="text-gray-600 dark:text-gray-300">{ref.email}</span>,
        },
        {
            key: 'contact_number',
            title: 'Contact',
            render: (_val, ref) => <span className="text-gray-600 dark:text-gray-300">{ref.contact_number}</span>,
        },
        {
            key: 'resume',
            title: 'Resume',
            render: (_val, ref) => (
                resolveUrl(ref.resume) ? (
                    <a className="text-[#0062E0] hover:underline font-semibold" href={resolveUrl(ref.resume)!} target="_blank" rel="noreferrer">
                        View Resume
                    </a>
                ) : (
                    <span className="text-gray-400">-</span>
                )
            ),
        },
        {
            key: 'status',
            title: 'Status',
            sortable: true,
            render: (_val, ref) => (
                <span
                    className={`badge ${
                        ref.status === 'Approved'
                            ? 'badge-outline-success text-success bg-success/10'
                            : ref.status === 'Rejected'
                              ? 'badge-outline-danger text-danger bg-danger/10'
                              : 'badge-outline-warning text-warning bg-warning/10'
                    }`}
                >
                    {ref.status}
                </span>
            ),
        },
        {
            key: 'admin_comment',
            title: 'Admin Comment',
            render: (_val, ref) => <span className="text-gray-500 max-w-[200px] truncate block" title={ref.admin_comment || ''}>{ref.admin_comment || '-'}</span>,
        },
        {
            key: 'submitted_at',
            title: 'Submitted',
            sortable: true,
            render: (_val, ref) => <span className="text-gray-500">{new Date(ref.submitted_at).toLocaleDateString()}</span>,
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '100px',
            render: (_val, ref) => (
                <button
                    type="button"
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => openEditModal(ref.id)}
                    title="Review Referral"
                >
                    <IconPencil className="w-4 h-4" />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0e1726] to-[#6366f1] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Employee References</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Review employee referrals from people referred by employees in your company.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(val) => { setSearch(val); setPage(1); }}
                searchPlaceholder="Search references by candidate, employee, email..."
                onRefresh={fetchReferences}
                filters={
                    <select
                        className="form-select text-xs py-1.5 px-3 rounded-lg border-[#cbd5e1] dark:border-[#1e293b] dark:bg-[#121e32] focus:border-[#0062E0] focus:ring-1 focus:ring-[#0062E0] font-semibold"
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
                }
            />

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

