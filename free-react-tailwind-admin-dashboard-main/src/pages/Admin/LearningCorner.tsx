import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSearch from '../../components/Icon/IconSearch';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconEye from '../../components/Icon/IconEye';
import IconX from '../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/learning-corner/`;

type LearningCornerItem = {
    id: number;
    title: string;
    description?: string | null;
    image?: string | null;
    video?: string | null;
    document?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    document_url?: string | null;
};

type FilterType = 'all' | 'image' | 'video' | 'document';
type SortType = 'newest' | 'oldest' | 'az';
type ViewType = 'card' | 'table';

const AdminLearningCorner = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<LearningCornerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [sortType, setSortType] = useState<SortType>('newest');
    const [viewType, setViewType] = useState<ViewType>('card');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LearningCornerItem | null>(null);
    const [previewItem, setPreviewItem] = useState<LearningCornerItem | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });
    const [files, setFiles] = useState<{
        image: File | null;
        video: File | null;
        document: File | null;
    }>({
        image: null,
        video: null,
        document: null,
    });

    useEffect(() => {
        dispatch(setPageTitle('Learning Corner'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchItems();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, currentPage, itemsPerPage]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('page_size', itemsPerPage.toString());
            if (search.trim()) url.searchParams.append('search', search.trim());

            const response = await fetch(url.toString(), { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    setItems(data.results);
                    setTotalCount(data.count);
                    setTotalPages(Math.max(1, Math.ceil(data.count / itemsPerPage)));
                } else {
                    const nextItems = Array.isArray(data) ? data : [];
                    setItems(nextItems);
                    setTotalCount(nextItems.length);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching learning corner items:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        const result = items.filter((item) => {
            const matchesType =
                filterType === 'all' ||
                (filterType === 'image' && !!(item.image_url || item.image)) ||
                (filterType === 'video' && !!(item.video_url || item.video)) ||
                (filterType === 'document' && !!(item.document_url || item.document));

            return matchesType;
        });

        result.sort((a, b) => {
            if (sortType === 'az') return a.title.localeCompare(b.title);
            if (sortType === 'oldest') return a.id - b.id;
            return b.id - a.id;
        });

        return result;
    }, [items, filterType, sortType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    const resetForm = () => {
        setFormData({ title: '', description: '' });
        setFiles({ image: null, video: null, document: null });
        setEditingItem(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (item: LearningCornerItem) => {
        setEditingItem(item);
        setFormData({
            title: item.title || '',
            description: item.description || '',
        });
        setFiles({ image: null, video: null, document: null });
        setModalOpen(true);
    };

    const buildAssetUrl = (value?: string | null) => {
        if (!value) return null;
        return value.startsWith('http') ? value : `${API_BASE_URL}${value}`;
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('description', formData.description);
            if (files.image) payload.append('image', files.image);
            if (files.video) payload.append('video', files.video);
            if (files.document) payload.append('document', files.document);

            const response = await fetch(editingItem ? `${API_URL}${editingItem.id}/` : API_URL, {
                method: editingItem ? 'PATCH' : 'POST',
                headers: getHeaders(),
                body: payload,
            });

            if (response.ok) {
                Swal.fire({
                    title: editingItem ? 'Updated!' : 'Created!',
                    text: editingItem ? 'Learning resource updated successfully.' : 'Learning resource created successfully.',
                    icon: 'success',
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                resetForm();
                await fetchItems();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({
                    title: 'Error!',
                    text: err ? JSON.stringify(err) : 'Failed to save learning resource.',
                    icon: 'error',
                    customClass: { popup: 'sweet-alerts' },
                });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to save learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: LearningCornerItem) => {
        const result = await Swal.fire({
            title: 'Delete resource?',
            text: `Delete "${item.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${API_URL}${item.id}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.ok || response.status === 204) {
                Swal.fire({ title: 'Deleted!', text: 'Learning resource deleted.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
                await fetchItems();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire({ title: 'Error!', text: err ? JSON.stringify(err) : 'Failed to delete learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error!', text: 'Failed to delete learning resource.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const getBadges = (item: LearningCornerItem) => {
        const badges: string[] = [];
        if (item.image_url || item.image) badges.push('Image');
        if (item.video_url || item.video) badges.push('Video');
        if (item.document_url || item.document) badges.push('Document');
        return badges;
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Learning Corner</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Manage educational resources and training materials for your company.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input pr-10 w-72"
                            placeholder="Search learning resources..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <select className="form-select w-40" value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}>
                        <option value="all">All Types</option>
                        <option value="image">Images Only</option>
                        <option value="video">Videos Only</option>
                        <option value="document">Documents Only</option>
                    </select>
                    <select className="form-select w-36" value={sortType} onChange={(e) => setSortType(e.target.value as SortType)}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A-Z</option>
                    </select>
                    <select className="form-select w-32" value={viewType} onChange={(e) => setViewType(e.target.value as ViewType)}>
                        <option value="card">Card View</option>
                        <option value="table">Table View</option>
                    </select>
                </div>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <IconPlus /> Add Resource
                </button>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading learning resources...</span>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500">No learning resources found.</div>
            ) : viewType === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredItems.map((item) => {
                        const imageUrl = buildAssetUrl(item.image_url || item.image);
                        const videoUrl = buildAssetUrl(item.video_url || item.video);
                        const documentUrl = buildAssetUrl(item.document_url || item.document);
                        return (
                            <div key={item.id} className="panel overflow-hidden border-0 shadow-md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold">{item.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">{item.description || 'No description available.'}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" className="text-info hover:text-info-dark" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                        <button type="button" className="text-primary hover:text-primary-dark" onClick={() => openEditModal(item)}>
                                            <IconPencil className="w-5 h-5" />
                                        </button>
                                        <button type="button" className="text-danger hover:text-danger-dark" onClick={() => handleDelete(item)}>
                                            <IconTrashLines className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {getBadges(item).map((badge) => (
                                        <span key={badge} className="badge badge-outline-primary">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    {imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" className="text-primary underline block">View Image</a>}
                                    {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" className="text-primary underline block">View Video</a>}
                                    {documentUrl && <a href={documentUrl} target="_blank" rel="noreferrer" className="text-primary underline block">View Document</a>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="panel p-0 border-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Assets</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.title}</td>
                                        <td className="text-gray-500 max-w-[320px] truncate">{item.description || '-'}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-2">
                                                {getBadges(item).length ? getBadges(item).map((badge) => <span key={badge} className="badge badge-outline-primary">{badge}</span>) : <span className="text-gray-400">No assets</span>}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button type="button" className="text-info" onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}>
                                                    <IconEye className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-primary" onClick={() => openEditModal(item)}>
                                                    <IconPencil className="w-5 h-5" />
                                                </button>
                                                <button type="button" className="text-danger" onClick={() => handleDelete(item)}>
                                                    <IconTrashLines className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {totalCount > 0 && (
                <div className="flex justify-between items-center p-4 border-t border-[#e0e6ed] dark:border-[#1b2e4b] panel">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-sm text-gray-500 font-semibold dark:text-gray-400">
                        Showing <span className="text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="text-primary">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                        <span className="text-primary">{totalCount}</span> entries
                    </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Per page:</span>
                            <select
                                className="form-select w-20 text-sm font-semibold py-1"
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={6}>6</option>
                                <option value={12}>12</option>
                                <option value={24}>24</option>
                            </select>
                        </div>
                    </div>
                    <ul className="inline-flex items-center space-x-1 font-semibold">
                        <li>
                            <button
                                type="button"
                                className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            >
                                Prev
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="flex justify-center font-semibold px-3.5 py-2 rounded-full transition bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]"
                            >
                                {currentPage}
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-3xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] py-3 px-5">
                                        {editingItem ? 'Edit Learning Resource' : 'Add Learning Resource'}
                                    </div>
                                    <div className="p-5">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Title</label>
                                                <input className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Description</label>
                                                <textarea className="form-textarea min-h-[120px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="font-semibold mb-1 block">Image</label>
                                                    {editingItem && buildAssetUrl(editingItem.image_url || editingItem.image) && (
                                                        <a href={buildAssetUrl(editingItem.image_url || editingItem.image) || '#'} className="text-primary underline text-xs block mb-2" target="_blank" rel="noreferrer">
                                                            View current image
                                                        </a>
                                                    )}
                                                    <input type="file" accept="image/*" className="form-input" onChange={(e) => setFiles({ ...files, image: e.target.files?.[0] || null })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Video</label>
                                                    {editingItem && buildAssetUrl(editingItem.video_url || editingItem.video) && (
                                                        <a href={buildAssetUrl(editingItem.video_url || editingItem.video) || '#'} className="text-primary underline text-xs block mb-2" target="_blank" rel="noreferrer">
                                                            View current video
                                                        </a>
                                                    )}
                                                    <input type="file" accept="video/*" className="form-input" onChange={(e) => setFiles({ ...files, video: e.target.files?.[0] || null })} />
                                                </div>
                                                <div>
                                                    <label className="font-semibold mb-1 block">Document</label>
                                                    {editingItem && buildAssetUrl(editingItem.document_url || editingItem.document) && (
                                                        <a href={buildAssetUrl(editingItem.document_url || editingItem.document) || '#'} className="text-primary underline text-xs block mb-2" target="_blank" rel="noreferrer">
                                                            View current document
                                                        </a>
                                                    )}
                                                    <input type="file" className="form-input" onChange={(e) => setFiles({ ...files, document: e.target.files?.[0] || null })} />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-3">
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                                    {saving ? 'Saving...' : editingItem ? 'Update Resource' : 'Create Resource'}
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

            <Transition appear show={previewOpen} as={Fragment}>
                <Dialog as="div" open={previewOpen} onClose={() => setPreviewOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-4xl text-black dark:text-white-dark shadow-xl">
                                    <button type="button" onClick={() => setPreviewOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none">
                                        <IconX />
                                    </button>
                                    <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] py-3 px-5">Preview Resource</div>
                                    <div className="p-5">
                                        {previewItem && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-xl font-bold">{previewItem.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{previewItem.description || 'No description available.'}</p>
                                                </div>
                                                {buildAssetUrl(previewItem.image_url || previewItem.image) && (
                                                    <div>
                                                        <div className="font-semibold mb-2">Image</div>
                                                        <img src={buildAssetUrl(previewItem.image_url || previewItem.image) || ''} alt={previewItem.title} className="max-h-80 rounded-lg border border-[#e0e6ed]" />
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="font-semibold mb-1">Video</div>
                                                        {buildAssetUrl(previewItem.video_url || previewItem.video) ? (
                                                            <a className="text-primary underline" href={buildAssetUrl(previewItem.video_url || previewItem.video) || '#'} target="_blank" rel="noreferrer">
                                                                Open video
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">No video</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold mb-1">Document</div>
                                                        {buildAssetUrl(previewItem.document_url || previewItem.document) ? (
                                                            <a className="text-primary underline" href={buildAssetUrl(previewItem.document_url || previewItem.document) || '#'} target="_blank" rel="noreferrer">
                                                                Open document
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">No document</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
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

export default AdminLearningCorner;
