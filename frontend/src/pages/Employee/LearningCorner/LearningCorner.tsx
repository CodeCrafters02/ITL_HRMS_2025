import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';
import IconEye from '../../../components/Icon/IconEye';
import IconMaximize from '../../../components/Icon/IconMaximize';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconArrowForward from '../../../components/Icon/IconArrowForward';
import IconFolder from '../../../components/Icon/IconFolder';
import IconDownload from '../../../components/Icon/IconDownload';
import { LearningMediaItem, LearningResource, fetchLearningResources } from './api';
import { authFetch } from '../../../utils/authFetch';

type ResourceFilter = 'all' | 'image' | 'video' | 'document';
type ViewMode = 'card' | 'table';

const buildAssetUrl = (value?: string | null) => {
    if (!value) return null;
    return value.startsWith('http') ? value : value;
};

const resourceHasMediaType = (r: LearningResource, t: ResourceFilter): boolean => {
    if (t === 'all') return true;
    const list = r.media ?? [];
    if (list.some((m) => m.media_type === t)) return true;
    if (t === 'image') return !!buildAssetUrl(r.image);
    if (t === 'video') return !!buildAssetUrl(r.video);
    if (t === 'document') return !!buildAssetUrl(r.document);
    return false;
};

const mediaList = (r: LearningResource): LearningMediaItem[] => r.media ?? [];

const imageUrlsFromResource = (resource: LearningResource): string[] =>
    mediaList(resource)
        .filter((x) => x.media_type === 'image')
        .map((x) => x.url);

type DetailFolder = 'images' | 'videos' | 'documents';

const pickDefaultDetailFolder = (resource: LearningResource): DetailFolder => {
    const m = mediaList(resource);
    if (m.some((x) => x.media_type === 'image')) return 'images';
    if (m.some((x) => x.media_type === 'video')) return 'videos';
    if (m.some((x) => x.media_type === 'document')) return 'documents';
    return 'images';
};

type ImageGalleryPreview = {
    title: string;
    urls: string[];
    index: number;
};

const buildDownloadFilename = (title: string, imageUrl: string) => {
    const extFromUrl = imageUrl.split('?')[0].split('.').pop();
    const ext = extFromUrl && extFromUrl.length <= 5 ? extFromUrl : 'jpg';
    const safeTitle = title.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_') || 'learning_image';
    return `${safeTitle}.${ext}`;
};

const detailMediaKey = (folder: DetailFolder, it: LearningMediaItem) => `${folder}:${it.id ?? it.url}`;

const LearningCorner = () => {
    const dispatch = useDispatch();
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ResourceFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [selectedItem, setSelectedItem] = useState<LearningResource | null>(null);
    const [detailFolder, setDetailFolder] = useState<DetailFolder>('images');
    const [imageGallery, setImageGallery] = useState<ImageGalleryPreview | null>(null);
    const [detailSelectedKeys, setDetailSelectedKeys] = useState<string[]>([]);
    const [detailDownloadBusy, setDetailDownloadBusy] = useState(false);
    const [detailPickMode, setDetailPickMode] = useState(false);

    const openResourceDetail = useCallback((resource: LearningResource) => {
        setSelectedItem(resource);
        setDetailFolder(pickDefaultDetailFolder(resource));
        setDetailSelectedKeys([]);
        setDetailPickMode(false);
    }, []);

    useEffect(() => {
        if (!selectedItem) {
            setDetailSelectedKeys([]);
            setDetailPickMode(false);
        }
    }, [selectedItem]);

    const downloadLearningMediaItems = useCallback(async (items: LearningMediaItem[], resourceTitle: string) => {
        if (items.length === 0) return;
        setDetailDownloadBusy(true);
        setError(null);
        try {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const response = await authFetch(it.url);
                if (!response.ok) throw new Error('download failed');
                const blob = await response.blob();
                const objectUrl = window.URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = objectUrl;
                const raw = (it.filename && it.filename.trim()) || buildDownloadFilename(resourceTitle, it.url);
                anchor.download = raw.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').substring(0, 180) || 'download';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                window.URL.revokeObjectURL(objectUrl);
                if (i < items.length - 1) await new Promise((r) => setTimeout(r, 280));
            }
        } catch {
            setError('Download failed or was blocked. Allow multiple downloads for this site if prompted, then try again.');
        } finally {
            setDetailDownloadBusy(false);
        }
    }, []);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const handleImageDownload = useCallback(async () => {
        if (!imageGallery?.urls.length) return;
        const url = imageGallery.urls[imageGallery.index];
        if (!url) return;
        try {
            const response = await authFetch(url);
            if (!response.ok) {
                throw new Error('Image download failed');
            }
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = buildDownloadFilename(imageGallery.title, url);
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(objectUrl);
        } catch {
            setError('Failed to download image. Please try again.');
        }
    }, [imageGallery]);

    const loadResources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLearningResources({
                page,
                page_size: pageSize,
                search: search.trim(),
                type: filter,
            });
            setResources(data.results);
            setTotalCount(data.count);
            setTotalPages(data.total_pages);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load learning resources';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, filter]);

    useEffect(() => {
        dispatch(setPageTitle('Learning Corner'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadResources();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadResources]);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const imageCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'image')).length, [resources]);
    const videoCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'video')).length, [resources]);
    const documentCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'document')).length, [resources]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Learning Platform</h1>
                        <p className="mt-1 text-white/80">Explore curated resources, videos, and documents from your company knowledge base.</p>
                    </div>
                    {/* <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={loadResources}>
                        Refresh
                    </button> */}
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Total Resources</p>
                    <p className="text-2xl font-bold mt-2">{totalCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Images</p>
                    <p className="text-2xl font-bold mt-2 text-info">{imageCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Videos</p>
                    <p className="text-2xl font-bold mt-2 text-success">{videoCount}</p>
                </div>
                <div className="panel">
                    <p className="text-white-dark text-xs uppercase tracking-wide">Documents</p>
                    <p className="text-2xl font-bold mt-2 text-primary">{documentCount}</p>
                </div>
            </div>

            <div className="panel">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <input
                                type="text"
                                className="form-input pl-10"
                                placeholder="Search by title or description..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="h-4 w-4" />
                            </span>
                        </div>
                    </div>

                    <select
                        className="form-select"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value as ResourceFilter);
                            setPage(1);
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                        <option value="document">Documents</option>
                    </select>

                    <div className="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('card')}
                            aria-label="Card view"
                        >
                            <IconLayoutGrid className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm p-2 ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                            aria-label="Table view"
                        >
                            <IconListCheck className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {totalCount > 0 && (
                <div className="panel">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-white-dark">
                            Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                            <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                            <span className="text-primary font-semibold">{totalCount}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-white-dark">Per page</label>
                            <select
                                className="form-select w-20 text-xs"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button type="button" className="btn btn-sm btn-outline-primary px-2.5" onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? <li key={`dots-${idx}`} className="px-2 text-white-dark">...</li> : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ),
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="panel text-center py-12 text-white-dark">Loading learning resources...</div>
            ) : resources.length === 0 ? (
                <div className="panel text-center py-12 text-white-dark">No resources found for your current filters.</div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {resources.map((resource) => {
                        const m = mediaList(resource);
                        const imgItems = m.filter((x) => x.media_type === 'image');
                        const vidItems = m.filter((x) => x.media_type === 'video');
                        const docItems = m.filter((x) => x.media_type === 'document');
                        return (
                            <div key={resource.id} className="panel border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-base font-bold">{resource.title}</h3>
                                    <button type="button" className="btn btn-sm btn-outline-primary p-2" onClick={() => openResourceDetail(resource)}>
                                        <IconEye className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-white-dark min-h-[40px]">{resource.description || 'No description provided.'}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {imgItems.length > 0 && (
                                        <span className="badge bg-info-light text-info">{imgItems.length === 1 ? 'Image' : `${imgItems.length} Images`}</span>
                                    )}
                                    {vidItems.length > 0 && (
                                        <span className="badge bg-success-light text-success">{vidItems.length === 1 ? 'Video' : `${vidItems.length} Videos`}</span>
                                    )}
                                    {docItems.length > 0 && (
                                        <span className="badge bg-primary-light text-primary">{docItems.length === 1 ? 'Document' : `${docItems.length} Documents`}</span>
                                    )}
                                    {resource.links && resource.links.length > 0 && (
                                        <span className="badge bg-warning-light text-warning">{resource.links.length === 1 ? 'Link' : `${resource.links.length} Links`}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="panel p-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Assets</th>
                                    <th className="text-center">Preview</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map((resource) => {
                                    const m = mediaList(resource);
                                    const ni = m.filter((x) => x.media_type === 'image').length;
                                    const nv = m.filter((x) => x.media_type === 'video').length;
                                    const nd = m.filter((x) => x.media_type === 'document').length;
                                    const nl = resource.links?.length ?? 0;
                                    const hasAny = ni + nv + nd + nl > 0;
                                    return (
                                        <tr key={resource.id}>
                                            <td className="font-semibold">{resource.title}</td>
                                            <td className="max-w-[360px] truncate text-white-dark">{resource.description || '-'}</td>
                                            <td>
                                                <div className="flex flex-wrap gap-2">
                                                    {ni > 0 && <span className="badge bg-info-light text-info">{ni === 1 ? 'Image' : `${ni} img`}</span>}
                                                    {nv > 0 && <span className="badge bg-success-light text-success">{nv === 1 ? 'Video' : `${nv} vid`}</span>}
                                                    {nd > 0 && <span className="badge bg-primary-light text-primary">{nd === 1 ? 'Doc' : `${nd} docs`}</span>}
                                                    {nl > 0 && <span className="badge bg-warning-light text-warning">{nl === 1 ? 'Link' : `${nl} links`}</span>}
                                                    {!hasAny && <span className="text-white-dark text-xs">No assets</span>}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button type="button" className="btn btn-sm btn-outline-primary p-2" onClick={() => openResourceDetail(resource)}>
                                                    <IconEye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedItem &&
                createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelectedItem(null)}>
                    <div className="panel w-full max-w-3xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold">{selectedItem.title}</h3>
                                <p className="text-white-dark mt-1">{selectedItem.description || 'No description provided.'}</p>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSelectedItem(null)}>
                                Close
                            </button>
                        </div>

                        {(() => {
                            const m = mediaList(selectedItem);
                            const imgItems = m.filter((x) => x.media_type === 'image');
                            const vidItems = m.filter((x) => x.media_type === 'video');
                            const docItems = m.filter((x) => x.media_type === 'document');
                            const renderFolderDownloadPanel = (items: LearningMediaItem[]) => {
                                if (items.length === 0) return null;
                                const keys = items.map((it) => detailMediaKey(detailFolder, it));
                                const selectedItems = items.filter((it) => detailSelectedKeys.includes(detailMediaKey(detailFolder, it)));
                                const n = items.length;
                                const kindWord =
                                    detailFolder === 'images' ? (n === 1 ? 'photo' : 'photos') : detailFolder === 'videos' ? (n === 1 ? 'video' : 'videos') : n === 1 ? 'file' : 'files';
                                const chosenWord =
                                    detailFolder === 'images' ? 'photos' : detailFolder === 'videos' ? 'videos' : 'files';
                                return (
                                    <div className="mb-4 rounded-xl border border-white-light dark:border-[#1b2e4b] bg-[#f8fafc] dark:bg-[#0b1324] px-4 py-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-dark dark:text-white-light m-0 text-sm">Downloads</p>
                                                <p className="text-xs text-white-dark mt-1.5 m-0 leading-relaxed">
                                                    {detailPickMode
                                                        ? 'Tap any item below to add or remove it from your download list.'
                                                        : 'Save everything in this folder at once, or switch to picking only the files you need.'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[220px]">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm inline-flex items-center justify-center gap-2"
                                                    disabled={detailDownloadBusy}
                                                    onClick={() => downloadLearningMediaItems(items, selectedItem.title)}
                                                >
                                                    <IconDownload className="h-4 w-4 shrink-0" />
                                                    Download all {n} {kindWord}
                                                </button>
                                                {!detailPickMode ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => setDetailPickMode(true)}
                                                    >
                                                        Choose specific files…
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm inline-flex items-center justify-center gap-2"
                                                            disabled={detailDownloadBusy || selectedItems.length === 0}
                                                            onClick={() => downloadLearningMediaItems(selectedItems, selectedItem.title)}
                                                        >
                                                            <IconDownload className="h-4 w-4 shrink-0" />
                                                            Download {selectedItems.length} chosen {chosenWord}
                                                        </button>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-0.5">
                                                            <button
                                                                type="button"
                                                                className="text-primary hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
                                                                onClick={() => setDetailSelectedKeys([...keys])}
                                                            >
                                                                Select all
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="text-primary hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
                                                                onClick={() => setDetailSelectedKeys([])}
                                                            >
                                                                Clear
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="text-white-dark hover:text-danger font-semibold bg-transparent border-0 p-0 cursor-pointer sm:ml-auto"
                                                                onClick={() => {
                                                                    setDetailPickMode(false);
                                                                    setDetailSelectedKeys([]);
                                                                }}
                                                            >
                                                                Cancel choosing
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };

                            const folderBtn = (id: DetailFolder, label: string, count: number) => (
                                <button
                                    type="button"
                                    key={id}
                                    disabled={count === 0}
                                    onClick={() => {
                                        if (count > 0) {
                                            setDetailFolder(id);
                                            setDetailSelectedKeys([]);
                                            setDetailPickMode(false);
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition ${
                                        count === 0
                                            ? 'opacity-40 cursor-not-allowed border-white-light dark:border-[#1b2e4b]'
                                            : detailFolder === id
                                              ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                                              : 'border-white-light dark:border-[#1b2e4b] hover:border-primary/50'
                                    }`}
                                >
                                    <IconFolder className="w-8 h-8 shrink-0 text-primary" />
                                    <span className="font-semibold text-sm">{label}</span>
                                    <span className="text-xs text-white-dark">{count} file{count === 1 ? '' : 's'}</span>
                                </button>
                            );
                            return (
                                <>
                                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {folderBtn('images', 'Images', imgItems.length)}
                                        {folderBtn('videos', 'Videos', vidItems.length)}
                                        {folderBtn('documents', 'Documents', docItems.length)}
                                    </div>

                                    <div className="mt-5 min-h-[120px]">
                                        {detailFolder === 'images' && (
                                            <div>
                                                {imgItems.length === 0 ? (
                                                    <p className="text-sm text-white-dark">No images in this folder.</p>
                                                ) : (
                                                    <>
                                                        {renderFolderDownloadPanel(imgItems)}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {imgItems.map((it) => {
                                                                const rowKey = detailMediaKey('images', it);
                                                                const checked = detailSelectedKeys.includes(rowKey);
                                                                const openGallery = () => {
                                                                    const urls = imageUrlsFromResource(selectedItem);
                                                                    const idx = urls.indexOf(it.url);
                                                                    setImageGallery({
                                                                        title: selectedItem.title,
                                                                        urls,
                                                                        index: idx >= 0 ? idx : 0,
                                                                    });
                                                                };
                                                                return (
                                                                    <div
                                                                        key={it.id ?? it.url}
                                                                        className={`rounded-lg border-2 overflow-hidden bg-black/5 transition ${
                                                                            detailPickMode
                                                                                ? checked
                                                                                    ? 'border-primary ring-1 ring-primary/40 cursor-pointer'
                                                                                    : 'border-white-light dark:border-[#1b2e4b] cursor-pointer hover:border-primary/50'
                                                                                : 'border-white-light dark:border-[#1b2e4b]'
                                                                        }`}
                                                                        onClick={() => {
                                                                            if (!detailPickMode) return;
                                                                            setDetailSelectedKeys((prev) =>
                                                                                prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...new Set([...prev, rowKey])]
                                                                            );
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (!detailPickMode || (e.key !== 'Enter' && e.key !== ' ')) return;
                                                                            e.preventDefault();
                                                                            setDetailSelectedKeys((prev) =>
                                                                                prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...new Set([...prev, rowKey])]
                                                                            );
                                                                        }}
                                                                        role={detailPickMode ? 'button' : undefined}
                                                                        tabIndex={detailPickMode ? 0 : undefined}
                                                                    >
                                                                        {!detailPickMode ? (
                                                                            <button type="button" className="block w-full text-left" onClick={openGallery}>
                                                                                <img src={it.url} alt={it.filename} className="w-full max-h-[240px] object-contain" />
                                                                                <span className="block text-xs text-white-dark truncate px-2 py-1">{it.filename || 'Image'}</span>
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <div className="relative">
                                                                                    <img src={it.url} alt="" className="w-full max-h-[240px] object-contain pointer-events-none" />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="absolute top-2 right-2 btn btn-sm btn-outline-primary p-2 rounded-md bg-[#0e1726]/90 shadow-md"
                                                                                        aria-label="Open expanded preview"
                                                                                        title="Open expanded preview"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            openGallery();
                                                                                        }}
                                                                                    >
                                                                                        <IconMaximize className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs border-t border-white-light/80 dark:border-[#1b2e4b]">
                                                                                    <span className="text-white-dark truncate">{it.filename || 'Image'}</span>
                                                                                    <span className={checked ? 'text-primary font-semibold shrink-0' : 'text-white-dark shrink-0'}>
                                                                                        {checked ? 'Included' : 'Tap to add'}
                                                                                    </span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {detailFolder === 'videos' && (
                                            <div>
                                                {vidItems.length === 0 ? (
                                                    <p className="text-sm text-white-dark">No videos in this folder.</p>
                                                ) : (
                                                    <>
                                                        {renderFolderDownloadPanel(vidItems)}
                                                        <div className="space-y-4">
                                                            {vidItems.map((it) => {
                                                                const rowKey = detailMediaKey('videos', it);
                                                                const checked = detailSelectedKeys.includes(rowKey);
                                                                const toggleRow = () =>
                                                                    setDetailSelectedKeys((prev) =>
                                                                        prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...new Set([...prev, rowKey])]
                                                                    );
                                                                return (
                                                                    <div
                                                                        key={it.id ?? it.url}
                                                                        className={`rounded-lg border-2 p-3 bg-black/5 transition ${
                                                                            detailPickMode
                                                                                ? checked
                                                                                    ? 'border-primary ring-1 ring-primary/40'
                                                                                    : 'border-white-light dark:border-[#1b2e4b]'
                                                                                : 'border-white-light dark:border-[#1b2e4b]'
                                                                        }`}
                                                                    >
                                                                        <div className={`flex gap-3 ${detailPickMode ? 'flex-col sm:flex-row' : ''}`}>
                                                                            {detailPickMode && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={toggleRow}
                                                                                    className={`shrink-0 self-start rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                                                                                        checked
                                                                                            ? 'bg-primary text-white border-primary'
                                                                                            : 'bg-white dark:bg-[#0e1726] border-white-light dark:border-[#1b2e4b] text-dark dark:text-white-dark hover:border-primary/60'
                                                                                    }`}
                                                                                >
                                                                                    {checked ? '✓ Added to download' : '+ Add to download'}
                                                                                </button>
                                                                            )}
                                                                            <div className="flex-1 min-w-0 space-y-2">
                                                                                <video src={it.url} controls className="w-full max-h-[320px] rounded-lg border border-white-light dark:border-[#1b2e4b] bg-black" />
                                                                                <a href={it.url} target="_blank" rel="noreferrer" className="text-success text-sm hover:underline inline-block">
                                                                                    Open in new tab ({it.filename || 'video'})
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {detailFolder === 'documents' && (
                                            <div className="panel bg-[#f8f9fa] dark:bg-[#060818]">
                                                {docItems.length === 0 ? (
                                                    <p className="text-sm text-white-dark">No documents in this folder.</p>
                                                ) : (
                                                    <>
                                                        {renderFolderDownloadPanel(docItems)}
                                                        <ul className="space-y-3 text-sm list-none p-0 m-0">
                                                            {docItems.map((it) => {
                                                                const rowKey = detailMediaKey('documents', it);
                                                                const checked = detailSelectedKeys.includes(rowKey);
                                                                return (
                                                                    <li
                                                                        key={it.id ?? it.url}
                                                                        className={`flex items-center gap-3 rounded-md border-2 px-3 py-2 transition ${
                                                                            detailPickMode
                                                                                ? checked
                                                                                    ? 'border-primary bg-primary/5 cursor-pointer'
                                                                                    : 'border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726] cursor-pointer hover:border-primary/50'
                                                                                : 'border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]'
                                                                        }`}
                                                                        onClick={() => {
                                                                            if (!detailPickMode) return;
                                                                            setDetailSelectedKeys((prev) =>
                                                                                prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...new Set([...prev, rowKey])]
                                                                            );
                                                                        }}
                                                                        role={detailPickMode ? 'button' : undefined}
                                                                        tabIndex={detailPickMode ? 0 : undefined}
                                                                        onKeyDown={(e) => {
                                                                            if (!detailPickMode || (e.key !== 'Enter' && e.key !== ' ')) return;
                                                                            e.preventDefault();
                                                                            setDetailSelectedKeys((prev) =>
                                                                                prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...new Set([...prev, rowKey])]
                                                                            );
                                                                        }}
                                                                    >
                                                                        {detailPickMode && (
                                                                            <span
                                                                                className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                                                                                    checked ? 'bg-primary text-white' : 'bg-white-light dark:bg-dark text-white-dark'
                                                                                }`}
                                                                            >
                                                                                {checked ? 'On' : 'Off'}
                                                                            </span>
                                                                        )}
                                                                        <a
                                                                            href={it.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary hover:underline truncate flex-1 min-w-0"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            {it.filename || 'Open file'}
                                                                        </a>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {m.length === 0 && (
                                        <p className="mt-4 text-sm text-white-dark">No uploaded files for this resource.</p>
                                    )}

                                    {selectedItem.links && selectedItem.links.length > 0 && (
                                        <div className="mt-5 panel bg-warning-light/20 dark:bg-warning/10 border-warning/20">
                                            <h4 className="font-semibold mb-3">External links</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedItem.links.map((link, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-sm btn-outline-warning bg-white dark:bg-[#060818]"
                                                    >
                                                        {link.title || 'Visit link'}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>,
                    document.body
                )}

            {imageGallery &&
                imageGallery.urls.length > 0 &&
                createPortal(
                    <div className="fixed inset-0 z-[10000] bg-black/70 p-4 flex items-center justify-center" onClick={() => setImageGallery(null)}>
                    <div className="panel w-full max-w-4xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold">{imageGallery.title}</h3>
                                {imageGallery.urls.length > 1 && (
                                    <p className="text-xs text-white-dark mt-1">
                                        Image {imageGallery.index + 1} of {imageGallery.urls.length}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" className="btn btn-sm btn-primary" onClick={handleImageDownload}>
                                    Download image
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setImageGallery(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 relative flex items-center justify-center min-h-[200px]">
                            {imageGallery.urls.length > 1 && (
                                <button
                                    type="button"
                                    className="absolute left-1 sm:left-2 top-1/2 z-10 -translate-y-1/2 btn btn-outline-primary p-2.5 rounded-full bg-[#0e1726]/90 border-white-light shadow-lg"
                                    aria-label="Previous image"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImageGallery((prev) => {
                                            if (!prev || prev.urls.length < 2) return prev;
                                            const nextIndex = (prev.index - 1 + prev.urls.length) % prev.urls.length;
                                            return { ...prev, index: nextIndex };
                                        });
                                    }}
                                >
                                    <IconArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <img
                                src={imageGallery.urls[imageGallery.index]}
                                alt={`${imageGallery.title} (${imageGallery.index + 1})`}
                                className="w-full max-h-[72vh] object-contain rounded-lg border border-white-light dark:border-[#1b2e4b]"
                            />
                            {imageGallery.urls.length > 1 && (
                                <button
                                    type="button"
                                    className="absolute right-1 sm:right-2 top-1/2 z-10 -translate-y-1/2 btn btn-outline-primary p-2.5 rounded-full bg-[#0e1726]/90 border-white-light shadow-lg"
                                    aria-label="Next image"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImageGallery((prev) => {
                                            if (!prev || prev.urls.length < 2) return prev;
                                            const nextIndex = (prev.index + 1) % prev.urls.length;
                                            return { ...prev, index: nextIndex };
                                        });
                                    }}
                                >
                                    <IconArrowForward className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                    document.body
                )}
        </div>
    );
};

export default LearningCorner;
