import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import IconX from '../../components/Icon/IconX';
import IconTxtFile from '../../components/Icon/IconTxtFile';
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/letter-templates/`;

type LetterTemplateRecord = {
    id: number;
    title: string;
    content: string;
    email_content?: string | null;
    created_at?: string;
};

const AdminLetterTemplates = () => {
    const dispatch = useDispatch();
    const [templates, setTemplates] = useState<LetterTemplateRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ title: '', content: '', email_content: '' });

    useEffect(() => {
        dispatch(setPageTitle('Letter Templates'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchTemplates();
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

    const fetchTemplates = async () => {
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
                    setTemplates(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
                } else {
                    setTemplates(data);
                    setTotalCount(Array.isArray(data) ? data.length : 0);
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error('Error fetching letter templates', e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', content: '', email_content: '' });
        setEditMode(false);
        setEditId(null);
    };

    const openAdd = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEdit = (tpl: LetterTemplateRecord) => {
        setFormData({ title: tpl.title, content: tpl.content, email_content: tpl.email_content || '' });
        setEditMode(true);
        setEditId(tpl.id);
        setIsModalOpen(true);
    };

    const save = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            Swal.fire({ title: 'Error!', text: 'Title and content are required.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            return;
        }
        try {
            const url = editMode ? `${API_URL}${editId}/` : API_URL;
            const method = editMode ? 'PATCH' : 'POST';
            const payload = {
                title: formData.title.trim(),
                content: formData.content,
                email_content: formData.email_content,
            };
            const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
            if (res.ok) {
                Swal.fire({ title: editMode ? 'Updated!' : 'Added!', text: 'Template saved successfully.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                setIsModalOpen(false);
                resetForm();
                fetchTemplates();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to save template.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to save template.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const del = async (tpl: LetterTemplateRecord) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete template "${tpl.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
            padding: '2em',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_URL}${tpl.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok || res.status === 204) {
                Swal.fire({ title: 'Deleted!', text: 'Template has been deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                fetchTemplates();
            } else {
                const err = await res.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete template.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete template.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const columns: Column<LetterTemplateRecord>[] = [
        {
            key: 'id',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _row, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'title',
            title: 'Template Title',
            sortable: true,
            render: (_val, row) => <span className="font-semibold text-gray-800 dark:text-white-light">{row.title}</span>,
        },
        {
            key: 'created_at',
            title: 'Created At',
            sortable: true,
            render: (_val, row) => (
                <span className="text-gray-500 dark:text-gray-400">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => openEdit(row)}
                        title="Edit Template"
                    >
                        <IconPencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                        onClick={() => del(row)}
                        title="Delete Template"
                    >
                        <IconTrashLines className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Letter Templates"
                subtitle="Create, configure, and standardize official templates for offers, promotions, and relieving documentation."
                icon={<IconTxtFile />}
                badge="HR Documentation"
                variant="purple"
                actions={
                    <button type="button" className="btn btn-primary gap-2 shadow-lg shadow-primary/20 backdrop-blur-sm" onClick={openAdd}>
                        <IconPlus className="w-4 h-4" /> Add Template
                    </button>
                }
            />

            <DataTable
                columns={columns}
                data={templates}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(val) => { setSearch(val); setPage(1); }}
                searchPlaceholder="Search letter templates..."
                onRefresh={fetchTemplates}
                actionButton={
                    <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
                        <IconPlus className="w-4 h-4" /> Add Template
                    </button>
                }
            />

            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-2xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                        {editMode ? 'Edit Template' : 'Add New Template'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={save}>
                                            <div className="mb-5">
                                                <label htmlFor="title" className="font-semibold mb-1 block">Title *</label>
                                                <input
                                                    id="title"
                                                    type="text"
                                                    className="form-input"
                                                    required
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="mb-5">
                                                <label htmlFor="content" className="font-semibold mb-1 block">Letter Content *</label>
                                                <textarea
                                                    id="content"
                                                    className="form-textarea min-h-[220px]"
                                                    required
                                                    value={formData.content}
                                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                                />
                                            </div>
                                            <div className="mb-5">
                                                <label htmlFor="email_content" className="font-semibold mb-1 block">Email Content</label>
                                                <textarea
                                                    id="email_content"
                                                    className="form-textarea min-h-[120px]"
                                                    value={formData.email_content}
                                                    onChange={(e) => setFormData({ ...formData, email_content: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex justify-end items-center gap-3 mt-8">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsModalOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary">
                                                    {editMode ? 'Update' : 'Create'}
                                                </button>
                                            </div>
                                        </form>
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

export default AdminLetterTemplates;

