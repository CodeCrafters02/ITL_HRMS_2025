import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
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

import Button from '../../../components/Common/Button';
import PageHeader from '../../../components/Common/PageHeader';
import DataTable, { Column } from '../../../components/Common/DataTable';
import CardGrid from '../../../components/Common/CardGrid';
import StatCard, { StatGrid } from '../../../components/Common/StatCard';
import IconOpenBook from '../../../components/Icon/IconOpenBook';
import IconVideo from '../../../components/Icon/IconVideo';
import IconFile from '../../../components/Icon/IconFile';
import { buttonClasses } from '../../../components/Common/Button';
import Modal from '../../../components/Common/Modal';
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
    const detailPickSelectAllRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const el = detailPickSelectAllRef.current;
        if (!detailPickMode || !selectedItem) {
            if (el) el.indeterminate = false;
            return;
        }
        const m = mediaList(selectedItem);
        const items =
            detailFolder === 'images'
                ? m.filter((x) => x.media_type === 'image')
                : detailFolder === 'videos'
                  ? m.filter((x) => x.media_type === 'video')
                  : m.filter((x) => x.media_type === 'document');
        const keys = items.map((it) => detailMediaKey(detailFolder, it));
        if (!el || keys.length === 0) {
            if (el) el.indeterminate = false;
            return;
        }
        const n = keys.filter((k) => detailSelectedKeys.includes(k)).length;
        el.indeterminate = n > 0 && n < keys.length;
    }, [detailPickMode, selectedItem, detailFolder, detailSelectedKeys]);

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


    const imageCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'image')).length, [resources]);
    const videoCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'video')).length, [resources]);
    const documentCount = useMemo(() => resources.filter((r) => resourceHasMediaType(r, 'document')).length, [resources]);

    const filterControls = (
        <select className="form-select h-10 w-44 rounded-xl" value={filter} onChange={(e) => { setFilter(e.target.value as ResourceFilter); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
        </select>
    );

    const viewSwitcher = (
        <div className="flex items-center gap-1.5">
            <Button size="sm" variant={viewMode === 'card' ? 'primary' : 'outline'} onClick={() => setViewMode('card')} aria-label="Card view"><IconLayoutGrid /></Button>
            <Button size="sm" variant={viewMode === 'table' ? 'primary' : 'outline'} onClick={() => setViewMode('table')} aria-label="Table view"><IconListCheck /></Button>
        </div>
    );

    const columns: Column<LearningResource>[] = [
        { key: 'title', title: 'Title', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'description', title: 'Description', hideBelow: 'md', render: (v) => <span className="block max-w-[360px] truncate text-white-dark">{v || '-'}</span> },
        {
            key: 'assets', title: 'Assets',
            render: (_v, resource) => {
                const m = mediaList(resource);
                const ni = m.filter((x) => x.media_type === 'image').length;
                const nv = m.filter((x) => x.media_type === 'video').length;
                const nd = m.filter((x) => x.media_type === 'document').length;
                const hasLinks = !!(resource.links && resource.links.length > 0);
                const hasAny = ni + nv + nd > 0 || hasLinks;
                return (
                    <div className="flex flex-wrap gap-2">
                        {ni > 0 && <span className="badge bg-info-light text-info">{ni === 1 ? 'Image' : `${ni} img`}</span>}
                        {nv > 0 && <span className="badge bg-success-light text-success">{nv === 1 ? 'Video' : `${nv} vid`}</span>}
                        {nd > 0 && <span className="badge bg-primary-light text-primary">{nd === 1 ? 'Doc' : `${nd} docs`}</span>}
                        {hasLinks && <span className="badge bg-warning-light text-warning">{resource.links!.length} Link(s)</span>}
                        {!hasAny && <span className="text-xs text-white-dark">No assets</span>}
                    </div>
                );
            },
        },
        { key: 'preview', title: 'Preview', align: 'center', render: (_v, resource) => <Button variant="outline" size="sm" className="!p-2" onClick={() => openResourceDetail(resource)}><IconEye className="h-4 w-4" /></Button> },
    ];

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Learning Platform"
                subtitle="Explore curated resources, videos, and documents from your company knowledge base."
                variant="purple"
            />

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <StatGrid cols={4} className="!mb-0">
                <StatCard label="Total Resources" value={totalCount} loading={loading} tone="primary" icon={<IconOpenBook />} />
                <StatCard label="Images" value={imageCount} loading={loading} tone="info" icon={<IconEye />} hint="on this page" />
                <StatCard label="Videos" value={videoCount} loading={loading} tone="success" icon={<IconVideo />} hint="on this page" />
                <StatCard label="Documents" value={documentCount} loading={loading} tone="purple" icon={<IconFile />} hint="on this page" />
            </StatGrid>

            {viewMode === 'table' ? (
                <DataTable
                    columns={columns}
                    data={resources}
                    loading={loading}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[6, 10, 20, 50]}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    onRefresh={loadResources}
                    searchPlaceholder="Search by title or description..."
                    emptyMessage="No resources found for your current filters"
                    entityLabel="resources"
                    filters={filterControls}
                    actionButton={viewSwitcher}
                />
            ) : (
                <CardGrid
                    items={resources}
                    loading={loading}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[6, 10, 20, 50]}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    onRefresh={loadResources}
                    searchPlaceholder="Search by title or description..."
                    emptyMessage="No resources found for your current filters"
                    entityLabel="resources"
                    filters={filterControls}
                    actions={viewSwitcher}
                    renderCard={(resource) => {
                        const m = mediaList(resource);
                        const imgItems = m.filter((x) => x.media_type === 'image');
                        const vidItems = m.filter((x) => x.media_type === 'video');
                        const docItems = m.filter((x) => x.media_type === 'document');
                        return (
                            <div className="panel border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-base font-bold">{resource.title}</h3>
                                    <Button variant="outline" size="sm" className="!p-2" type="button"  onClick={() => openResourceDetail(resource)}>
                                        <IconEye className="w-4 h-4" />
                                    </Button>
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
                                    {resource.links && resource.links.length > 0 && <span className="badge bg-warning-light text-warning">{resource.links.length} Link(s)</span>}
                                </div>
                            </div>
                        );
                    }}
                />
            )}


            {selectedItem && (
                <Modal open onClose={() => setSelectedItem(null)} title={selectedItem.title} subtitle={selectedItem.description || 'No description provided.'} size="3xl">
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
                                                        ? 'Use the checkboxes (and Select all) to choose files, or tap images where shown.'
                                                        : 'Save everything in this folder at once, or switch to picking only the files you need.'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[220px]">
                                                <Button size="sm"
                                                    type="button"
                                                    
                                                    disabled={detailDownloadBusy}
                                                    onClick={() => downloadLearningMediaItems(items, selectedItem.title)}
                                                >
                                                    <IconDownload className="h-4 w-4 shrink-0" />
                                                    Download all {n} {kindWord}
                                                </Button>
                                                {!detailPickMode ? (
                                                    <Button variant="outline" size="sm"
                                                        type="button"
                                                        
                                                        onClick={() => setDetailPickMode(true)}
                                                    >
                                                        Choose specific files…
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button size="sm"
                                                            type="button"
                                                            
                                                            disabled={detailDownloadBusy || selectedItems.length === 0}
                                                            onClick={() => downloadLearningMediaItems(selectedItems, selectedItem.title)}
                                                        >
                                                            <IconDownload className="h-4 w-4 shrink-0" />
                                                            Download {selectedItems.length} chosen {chosenWord}
                                                        </Button>
                                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs pt-0.5">
                                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    ref={detailPickSelectAllRef}
                                                                    type="checkbox"
                                                                    className="form-checkbox"
                                                                    checked={items.length > 0 && selectedItems.length === items.length}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setDetailSelectedKeys([...keys]);
                                                                        else setDetailSelectedKeys([]);
                                                                    }}
                                                                />
                                                                <span className="font-medium text-dark dark:text-white-light">Select all</span>
                                                            </label>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <button
                                                                    type="button"
                                                                    className="text-primary hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
                                                                    onClick={() => setDetailSelectedKeys([])}
                                                                >
                                                                    Clear
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="text-white-dark hover:text-danger font-semibold bg-transparent border-0 p-0 cursor-pointer"
                                                                    onClick={() => {
                                                                        setDetailPickMode(false);
                                                                        setDetailSelectedKeys([]);
                                                                    }}
                                                                >
                                                                    Cancel choosing
                                                                </button>
                                                            </div>
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
                                                                                    <Button variant="outline" size="sm" className="absolute top-2 right-2 !p-2 rounded-md bg-[#0e1726]/90"
                                                                                        type="button"
                                                                                        
                                                                                        aria-label="Open expanded preview"
                                                                                        title="Open expanded preview"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            openGallery();
                                                                                        }}
                                                                                    >
                                                                                        <IconMaximize className="w-4 h-4" />
                                                                                    </Button>
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
                                                                                <a
                                                                                    href={it.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className={`text-success text-sm hover:underline inline-block ${detailPickMode ? 'cursor-pointer' : ''}`}
                                                                                    title={
                                                                                        detailPickMode
                                                                                            ? 'Click to toggle selection. Right-click to open in a new tab.'
                                                                                            : undefined
                                                                                    }
                                                                                    onClick={(e) => {
                                                                                        if (!detailPickMode) return;
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        toggleRow();
                                                                                    }}
                                                                                >
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
                                                                        className={`flex items-center gap-3 rounded-md border px-3 py-2 transition ${
                                                                            detailPickMode && checked
                                                                                ? 'border-primary bg-primary/5'
                                                                                : 'border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]'
                                                                        }`}
                                                                    >
                                                                        {detailPickMode && (
                                                                            <input
                                                                                type="checkbox"
                                                                                className="form-checkbox shrink-0"
                                                                                checked={checked}
                                                                                onChange={(e) => {
                                                                                    setDetailSelectedKeys((prev) =>
                                                                                        e.target.checked
                                                                                            ? [...new Set([...prev, rowKey])]
                                                                                            : prev.filter((k) => k !== rowKey)
                                                                                    );
                                                                                }}
                                                                            />
                                                                        )}
                                                                        <a
                                                                            href={it.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className={`text-primary hover:underline truncate flex-1 min-w-0 ${detailPickMode ? 'cursor-pointer' : ''}`}
                                                                            title={
                                                                                detailPickMode
                                                                                    ? 'Click to toggle selection. Right-click the link to open in a new tab.'
                                                                                    : undefined
                                                                            }
                                                                            onClick={(e) => {
                                                                                if (!detailPickMode) return;
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setDetailSelectedKeys((prev) =>
                                                                                    prev.includes(rowKey)
                                                                                        ? prev.filter((k) => k !== rowKey)
                                                                                        : [...new Set([...prev, rowKey])]
                                                                                );
                                                                            }}
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
                                        <p className="mt-4 text-sm text-white-dark">No uploaded files for this resource. Use external links below if available.</p>
                                    )}
                                </>
                            );
                        })()}

                        {selectedItem.links && selectedItem.links.length > 0 && (
                            <div className="mt-5 panel bg-warning-light/20 dark:bg-warning/10 border-warning/20">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                                    External Resources
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {selectedItem.links.map((link, idx) => (
                                        <a 
                                            key={idx} 
                                            href={link.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className={buttonClasses('outline', 'sm')}
                                        >
                                            {link.title || 'Visit Link'}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                </Modal>
            )}

            {imageGallery && imageGallery.urls.length > 0 && (
                <Modal
                    open
                    onClose={() => setImageGallery(null)}
                    title={imageGallery.title}
                    subtitle={imageGallery.urls.length > 1 ? `Image ${imageGallery.index + 1} of ${imageGallery.urls.length}` : undefined}
                    size="4xl"
                    footer={
                        <Button size="sm" type="button" onClick={handleImageDownload}>
                            Download image
                        </Button>
                    }
                >
                        <div className="mt-4 relative flex items-center justify-center min-h-[200px]">
                            {imageGallery.urls.length > 1 && (
                                <Button variant="outline" className="absolute left-1 sm:left-2 top-1/2 z-10 -translate-y-1/2 !p-2.5 rounded-full bg-[#0e1726]/90 border-white-light"
                                    type="button"
                                    
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
                                </Button>
                            )}
                            <img
                                src={imageGallery.urls[imageGallery.index]}
                                alt={`${imageGallery.title} (${imageGallery.index + 1})`}
                                className="w-full max-h-[72vh] object-contain rounded-lg border border-white-light dark:border-[#1b2e4b]"
                            />
                            {imageGallery.urls.length > 1 && (
                                <Button variant="outline" className="absolute right-1 sm:right-2 top-1/2 z-10 -translate-y-1/2 !p-2.5 rounded-full bg-[#0e1726]/90 border-white-light"
                                    type="button"
                                    
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
                                </Button>
                            )}
                        </div>
                </Modal>
            )}
        </div>
    );
};

export default LearningCorner;
