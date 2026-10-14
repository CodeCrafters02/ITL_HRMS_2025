import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSearch from '../../components/Icon/IconSearch';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconEye from '../../components/Icon/IconEye';
import IconX from '../../components/Icon/IconX';
import IconOpenBook from '../../components/Icon/IconOpenBook';
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import LearningCornerDetailModal, { sanitizeLearningCornerLinks } from './LearningCornerDetailModal';

import Modal from '../../components/Common/Modal';
import Button from '../../components/Common/Button';
import CardGrid from '../../components/Common/CardGrid';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/learning-corner/`;

type LearningCornerMediaItem = {
    id: number | null;
    url: string;
    media_type: 'image' | 'video' | 'document';
    filename: string;
};

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
    links?: { title: string; url: string }[] | null;
    media?: LearningCornerMediaItem[];
};

type FilterType = 'all' | 'image' | 'video' | 'document';

const itemHasMediaType = (item: LearningCornerItem, ft: FilterType): boolean => {
    if (ft === 'all') return true;
    const media = item.media ?? [];
    if (media.some((m) => m.media_type === ft)) return true;
    if (ft === 'image') return !!(item.image_url || item.image);
    if (ft === 'video') return !!(item.video_url || item.video);
    if (ft === 'document') return !!(item.document_url || item.document);
    return false;
};
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
    const [editingItem, setEditingItem] = useState<LearningCornerItem | null>(null);
    const [previewItem, setPreviewItem] = useState<LearningCornerItem | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        links: [] as { title: string; url: string }[],
    });
    const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('Learning Corner'));
    }, [dispatch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchItems();
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, currentPage, itemsPerPage, filterType, sortType]);

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
            if (filterType !== 'all') url.searchParams.append('media_type', filterType);
            url.searchParams.append('sort', sortType);

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

    const filteredItems = items; // filtering and sorting are done by the backend

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    const resetForm = () => {
        setFormData({ title: '', description: '', links: [] });
        setPendingMediaFiles([]);
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
            links: sanitizeLearningCornerLinks(item.links),
        });
        setPendingMediaFiles([]);
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
            payload.append('links', JSON.stringify(sanitizeLearningCornerLinks(formData.links)));
            pendingMediaFiles.forEach((file) => {
                payload.append('media_files', file);
            });

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

    const handleDeleteMedia = async (resourceId: number, mediaId: number) => {
        const result = await Swal.fire({
            title: 'Remove file?',
            text: 'This file will be permanently removed from this resource.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Remove',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;
        try {
            const response = await fetch(`${API_URL}${resourceId}/media/${mediaId}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (response.ok || response.status === 204) {
                await fetchItems();
                setEditingItem((prev) => {
                    if (!prev || prev.id !== resourceId) return prev;
                    return { ...prev, media: (prev.media || []).filter((m) => m.id !== mediaId) };
                });
                Swal.fire({ title: 'Removed', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
            } else {
                Swal.fire({ title: 'Error', text: 'Could not remove file.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
            }
        } catch {
            Swal.fire({ title: 'Error', text: 'Could not remove file.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const getBadges = (item: LearningCornerItem) => {
        const badges: string[] = [];
        const media = item.media ?? [];
        const ni = media.filter((m) => m.media_type === 'image').length;
        const nv = media.filter((m) => m.media_type === 'video').length;
        const nd = media.filter((m) => m.media_type === 'document').length;
        if (ni) badges.push(ni === 1 ? 'Image' : `${ni} Images`);
        if (nv) badges.push(nv === 1 ? 'Video' : `${nv} Videos`);
        if (nd) badges.push(nd === 1 ? 'Document' : `${nd} Documents`);
        const linkCount = sanitizeLearningCornerLinks(item.links).length;
        if (linkCount > 0) badges.push(`${linkCount} Link(s)`);
        return badges;
    };

    const columns: Column<LearningCornerItem>[] = [
        {
            key: 'title',
            title: 'Title',
            sortable: true,
            render: (_val, item: LearningCornerItem) => (
                <span className="font-semibold text-gray-800 dark:text-white-light">{item.title}</span>
            ),
        },
        {
            key: 'description',
            title: 'Description',
            render: (_val, item: LearningCornerItem) => (
                <p className="text-gray-500 dark:text-gray-400 max-w-sm truncate text-xs">{item.description || '-'}</p>
            ),
        },
        {
            key: 'assets',
            title: 'Assets',
            render: (_val, item: LearningCornerItem) => (
                <div className="flex flex-wrap gap-1.5">
                    {getBadges(item).length ? (
                        getBadges(item).map((badge) => (
                            <span key={badge} className="badge badge-outline-primary text-[11px] py-0.5">
                                {badge}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400 text-xs">No assets</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, item: LearningCornerItem) => (
                <div className="flex items-center justify-center gap-2">
                    <button type="button" className="text-info hover:opacity-80" onClick={() => setPreviewItem(item)} title="Preview">
                        <IconEye className="w-4 h-4" />
                    </button>
                    <button type="button" className="text-primary hover:opacity-80" onClick={() => openEditModal(item)} title="Edit">
                        <IconPencil className="w-4 h-4" />
                    </button>
                    <button type="button" className="text-danger hover:opacity-80" onClick={() => handleDelete(item)} title="Delete">
                        <IconTrashLines className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    const filterControls = (
        <div className="flex flex-wrap items-center gap-2">
            <select className="form-select w-36 text-xs" value={filterType} onChange={(e) => { setFilterType(e.target.value as FilterType); setCurrentPage(1); }}>
                <option value="all">All Types</option>
                <option value="image">Images Only</option>
                <option value="video">Videos Only</option>
                <option value="document">Documents Only</option>
            </select>
            <select className="form-select w-32 text-xs" value={sortType} onChange={(e) => { setSortType(e.target.value as SortType); setCurrentPage(1); }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A-Z</option>
            </select>
            <select className="form-select w-28 text-xs" value={viewType} onChange={(e) => setViewType(e.target.value as ViewType)}>
                <option value="card">Card View</option>
                <option value="table">Table View</option>
            </select>
        </div>
    );

    return (
        <div>
            <PageHeader
                title="Learning Corner"
                subtitle="Curate multimedia educational libraries, professional training materials, and company learning resources."
                icon={<IconOpenBook />}
                badge="Learning & Development"
                variant="purple"
                actions={
                    <Button type="button"  onClick={() => openCreateModal()}>
                        <IconPlus className="w-4 h-4" /> Add Material
                    </Button>
                }
            />

            {viewType === 'table' ? (
                <DataTable
                    columns={columns}
                    data={filteredItems}
                    loading={loading}
                    page={currentPage}
                    pageSize={itemsPerPage}
                    totalCount={totalCount}
                    onPageChange={(p) => setCurrentPage(p)}
                    onPageSizeChange={(sz) => {
                        setItemsPerPage(sz);
                        setCurrentPage(1);
                    }}
                    searchValue={search}
                    onSearchChange={(val) => {
                        setSearch(val);
                        setCurrentPage(1);
                    }}
                    searchPlaceholder="Search learning resources..."
                    onRefresh={fetchItems}
                    filters={filterControls}
                    actionButton={
                        <Button type="button"  onClick={openCreateModal}>
                            <IconPlus /> Add Resource
                        </Button>
                    }
                />
            ) : (
                <>
                    <CardGrid
                        items={filteredItems}
                        loading={loading}
                        page={currentPage}
                        pageSize={itemsPerPage}
                        totalCount={totalCount}
                        pageSizeOptions={[6, 12, 24]}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(sz) => { setItemsPerPage(sz); setCurrentPage(1); }}
                        searchValue={search}
                        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
                        searchPlaceholder="Search learning resources..."
                        emptyMessage="No learning resources found"
                        entityLabel="resources"
                        cols={3}
                        onRefresh={fetchItems}
                        actions={
                            <Button type="button" onClick={openCreateModal}><IconPlus /> Add Resource</Button>
                        }
                        filters={
                            <>
{filterControls}
                            </>
                        }
                        renderCard={(item) => (
                                <div className="panel overflow-hidden border-0 shadow-md">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold">{item.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-3">{item.description || 'No description available.'}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" className="text-info hover:text-info-dark" onClick={() => setPreviewItem(item)}>
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
                                </div>

                            )}
                    />

                </>
            )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Learning Resource' : 'Add Learning Resource'} size="3xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="font-semibold mb-1 block">Title</label>
                        <input className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="font-semibold mb-1 block">Description</label>
                        <textarea className="form-textarea min-h-[120px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div>
                        <label className="font-semibold mb-1 block">Files (images, videos, documents)</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select multiple files. Type is detected from the file extension.</p>
                        {editingItem && (editingItem.media?.length ?? 0) > 0 && (
                            <ul className="mb-3 space-y-2 text-sm border border-[#ebedf2] dark:border-[#1b2e4b] rounded-md p-3 bg-gray-50 dark:bg-[#0e1726]">
                                {(editingItem.media || []).map((m) => (
                                    <li key={m.id ?? m.url} className="flex items-center justify-between gap-2">
                                        <span className="truncate">
                                            <span className="font-semibold capitalize">{m.media_type}:</span>{' '}
                                            <a href={m.url} target="_blank" rel="noreferrer" className="text-primary underline">
                                                {m.filename || 'Open'}
                                            </a>
                                        </span>
                                        {m.id != null && (
                                            <button
                                                type="button"
                                                className="text-danger shrink-0"
                                                onClick={() => handleDeleteMedia(editingItem.id, m.id as number)}
                                            >
                                                <IconTrashLines className="w-4 h-4" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                            className="form-input"
                            onChange={(e) => {
                                const list = e.target.files ? Array.from(e.target.files) : [];
                                setPendingMediaFiles((prev) => [...prev, ...list]);
                                e.target.value = '';
                            }}
                        />
                        {pendingMediaFiles.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs">
                                {pendingMediaFiles.map((f, i) => (
                                    <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                                        <span className="truncate">{f.name}</span>
                                        <button
                                            type="button"
                                            className="text-danger"
                                            onClick={() => setPendingMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-[#ebedf2] dark:border-[#1b2e4b] pt-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <label className="font-bold text-primary uppercase text-xs tracking-wider">External Links</label>
                            <Button variant="outline" size="xs" 
                                type="button" 
                                
                                onClick={() => setFormData({ ...formData, links: [...formData.links, { title: '', url: '' }] })}
                            >
                                <IconPlus className="w-3 h-3" /> Add Link
                            </Button>
                        </div>

                        {formData.links.length === 0 ? (
                            <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-white-dark italic">No external links added yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.links.map((link, idx) => (
                                    <div key={idx} className="flex gap-2 items-start animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                                            <input 
                                                className="form-input text-xs" 
                                                placeholder="Link Title (e.g. Documentation)" 
                                                value={link.title} 
                                                onChange={(e) => {
                                                    const newLinks = [...formData.links];
                                                    newLinks[idx].title = e.target.value;
                                                    setFormData({ ...formData, links: newLinks });
                                                }}
                                            />
                                            <input 
                                                className="form-input text-xs" 
                                                placeholder="URL (e.g. https://example.com)" 
                                                value={link.url} 
                                                onChange={(e) => {
                                                    const newLinks = [...formData.links];
                                                    newLinks[idx].url = e.target.value;
                                                    setFormData({ ...formData, links: newLinks });
                                                }}
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            className="text-danger hover:text-red-700 p-2"
                                            onClick={() => {
                                                const newLinks = formData.links.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, links: newLinks });
                                            }}
                                        >
                                            <IconTrashLines className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                        <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit"  disabled={saving}>
                            {saving ? 'Saving...' : editingItem ? 'Update Resource' : 'Create Resource'}
                        </Button>
                    </div>
                </form>

            </Modal>

            <LearningCornerDetailModal resource={previewItem} onClose={() => setPreviewItem(null)} />
        </div>
    );
};

export default AdminLearningCorner;
