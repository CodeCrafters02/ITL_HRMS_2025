import { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import DataTable, { Column } from '../../components/Common/DataTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/policies/`;

type Policy = {
    id: number;
    name: string;
    document?: string | null;
    is_active: boolean;
    created_at?: string;
};

const AdminCompanyPolicies = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Policy | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Company Policies'));
    }, [dispatch]);

    const tokenHeader = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = {};
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const resolveUrl = (u?: string | null) => {
        if (!u) return null;
        if (String(u).startsWith('http')) return u;
        return `${API_BASE_URL}${u}`;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (search.trim()) url.searchParams.append('search', search.trim());
            if (filter !== 'all') url.searchParams.append('is_active', filter === 'active' ? 'true' : 'false');
            const resp = await fetch(url.toString(), { headers: tokenHeader() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load policies');
            const arr = Array.isArray(data) ? data : data?.results || [];
            setItems(arr);
            setTotalCount(Array.isArray(data) ? arr.length : data?.count ?? arr.length);
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(fetchAll, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filter, page, pageSize]);

    const openAdd = () => {
        setEditing({ id: 0, name: '', is_active: true, document: null });
        setFile(null);
        setModalOpen(true);
    };
    const openEdit = (p: Policy) => {
        setEditing({ ...p });
        setFile(null);
        setModalOpen(true);
    };

    const save = async () => {
        if (!editing) return;
        const name = (editing.name || '').trim();
        if (!name) {
            Swal.fire('Required', 'Policy name is required.', 'warning');
            return;
        }
        try {
            const isEdit = !!editing.id;
            const fd = new FormData();
            fd.append('name', name);
            fd.append('is_active', String(!!editing.is_active));
            if (file) fd.append('document', file);

            const resp = await fetch(isEdit ? `${API_URL}${editing.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: tokenHeader() as any,
                body: fd,
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to save');
            setModalOpen(false);
            setEditing(null);
            setFile(null);
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save', 'error');
        }
    };

    const del = async (p: Policy) => {
        const ok = await Swal.fire({ title: `Delete "${p.name}"?`, showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${p.id}/`, { method: 'DELETE', headers: tokenHeader() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const columns: Column<Policy>[] = [
        { key: 'index', title: '#', width: '60px', render: (_v, _r, i) => i + 1 },
        { key: 'name', title: 'Name', render: (v) => <span className="font-semibold">{v}</span> },
        {
            key: 'document', title: 'Document',
            render: (v) => (v ? <a className="text-primary underline" href={resolveUrl(v) || '#'} target="_blank" rel="noreferrer">Download</a> : <span className="text-white-dark">-</span>),
        },
        { key: 'is_active', title: 'Status', render: (v) => <span className={`badge ${v ? 'badge-outline-success' : 'badge-outline-danger'}`}>{v ? 'Active' : 'Inactive'}</span> },
        {
            key: 'actions', title: 'Actions', align: 'center', width: '120px',
            render: (_v, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button type="button" className="p-1.5 rounded-lg text-primary hover:text-white hover:bg-primary transition-colors" onClick={() => openEdit(row)} title="Edit"><IconPencil className="w-4 h-4" /></button>
                    <button type="button" className="p-1.5 rounded-lg text-danger hover:text-white hover:bg-danger transition-colors" onClick={() => del(row)} title="Delete"><IconTrashLines className="w-4 h-4" /></button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <div className="bg-gradient-to-r from-[#4c0519] to-[#e11d48] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Company Policies</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Upload policy documents and control visibility.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={fetchAll}
                searchPlaceholder="Search policies..."
                emptyMessage="No policies found"
                filters={
                    <select className="form-select h-10 rounded-xl w-40" value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}>
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                }
                actionButton={<button type="button" className="btn btn-primary gap-2" onClick={openAdd}><IconPlus /> Add Policy</button>}
            />

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
                                        {editing?.id ? 'Edit Policy' : 'Add Policy'}
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div>
                                            <label className="font-semibold">Policy Name</label>
                                            <input className="form-input" value={editing?.name || ''} onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))} />
                                        </div>
                                        <div>
                                            <label className="font-semibold">Active</label>
                                            <select className="form-select" value={editing?.is_active ? 'true' : 'false'} onChange={(e) => setEditing((p) => (p ? { ...p, is_active: e.target.value === 'true' } : p))}>
                                                <option value="true">Yes</option>
                                                <option value="false">No</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-semibold">Document (optional)</label>
                                            <input
                                                ref={fileRef}
                                                type="file"
                                                className="form-input"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            />
                                            {editing?.document && !file && (
                                                <div className="text-xs text-white-dark mt-1">
                                                    Current: <span className="underline">{String(editing.document).split('/').pop()}</span>
                                                </div>
                                            )}
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
    );
};

export default AdminCompanyPolicies;

