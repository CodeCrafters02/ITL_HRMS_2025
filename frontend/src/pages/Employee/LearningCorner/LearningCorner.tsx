import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconLayoutGrid from '../../../components/Icon/IconLayoutGrid';
import IconListCheck from '../../../components/Icon/IconListCheck';
import IconEye from '../../../components/Icon/IconEye';
import { LearningResource, fetchLearningResources } from './api';

type ResourceFilter = 'all' | 'image' | 'video' | 'document';
type ViewMode = 'card' | 'table';

const buildAssetUrl = (value?: string | null) => {
    if (!value) return null;
    return value.startsWith('http') ? value : value;
};

const LearningCorner = () => {
    const dispatch = useDispatch();
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ResourceFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [selectedItem, setSelectedItem] = useState<LearningResource | null>(null);

    const loadResources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLearningResources();
            setResources(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load learning resources';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Learning Corner'));
    }, [dispatch]);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    const filteredResources = useMemo(() => {
        const lowered = search.trim().toLowerCase();
        return resources.filter((resource) => {
            const imageUrl = buildAssetUrl(resource.image);
            const videoUrl = buildAssetUrl(resource.video);
            const documentUrl = buildAssetUrl(resource.document);

            const typeMatch =
                filter === 'all' ||
                (filter === 'image' && !!imageUrl) ||
                (filter === 'video' && !!videoUrl) ||
                (filter === 'document' && !!documentUrl);

            const searchMatch =
                !lowered ||
                resource.title.toLowerCase().includes(lowered) ||
                (resource.description || '').toLowerCase().includes(lowered);

            return typeMatch && searchMatch;
        });
    }, [resources, filter, search]);

    const imageCount = useMemo(() => resources.filter((r) => !!buildAssetUrl(r.image)).length, [resources]);
    const videoCount = useMemo(() => resources.filter((r) => !!buildAssetUrl(r.video)).length, [resources]);
    const documentCount = useMemo(() => resources.filter((r) => !!buildAssetUrl(r.document)).length, [resources]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Learning Platform</h1>
                        <p className="mt-1 text-white/80">Explore curated resources, videos, and documents from your company knowledge base.</p>
                    </div>
                    <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={loadResources}>
                        Refresh
                    </button>
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
                    <p className="text-2xl font-bold mt-2">{resources.length}</p>
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
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="h-4 w-4" />
                            </span>
                        </div>
                    </div>

                    <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value as ResourceFilter)}>
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

            {loading ? (
                <div className="panel text-center py-12 text-white-dark">Loading learning resources...</div>
            ) : filteredResources.length === 0 ? (
                <div className="panel text-center py-12 text-white-dark">No resources found for your current filters.</div>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredResources.map((resource) => {
                        const imageUrl = buildAssetUrl(resource.image);
                        const videoUrl = buildAssetUrl(resource.video);
                        const documentUrl = buildAssetUrl(resource.document);
                        return (
                            <div key={resource.id} className="panel border border-white-light dark:border-[#1b2e4b]">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-base font-bold">{resource.title}</h3>
                                    <button type="button" className="btn btn-sm btn-outline-primary p-2" onClick={() => setSelectedItem(resource)}>
                                        <IconEye className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-white-dark min-h-[40px]">{resource.description || 'No description provided.'}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {imageUrl && <span className="badge bg-info-light text-info">Image</span>}
                                    {videoUrl && <span className="badge bg-success-light text-success">Video</span>}
                                    {documentUrl && <span className="badge bg-primary-light text-primary">Document</span>}
                                </div>
                                <div className="mt-4 space-y-1 text-sm">
                                    {imageUrl && (
                                        <a href={imageUrl} target="_blank" rel="noreferrer" className="text-info hover:underline block">
                                            Open image
                                        </a>
                                    )}
                                    {videoUrl && (
                                        <a href={videoUrl} target="_blank" rel="noreferrer" className="text-success hover:underline block">
                                            Open video
                                        </a>
                                    )}
                                    {documentUrl && (
                                        <a href={documentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block">
                                            Open document
                                        </a>
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
                                {filteredResources.map((resource) => {
                                    const imageUrl = buildAssetUrl(resource.image);
                                    const videoUrl = buildAssetUrl(resource.video);
                                    const documentUrl = buildAssetUrl(resource.document);
                                    return (
                                        <tr key={resource.id}>
                                            <td className="font-semibold">{resource.title}</td>
                                            <td className="max-w-[360px] truncate text-white-dark">{resource.description || '-'}</td>
                                            <td>
                                                <div className="flex flex-wrap gap-2">
                                                    {imageUrl && <span className="badge bg-info-light text-info">Image</span>}
                                                    {videoUrl && <span className="badge bg-success-light text-success">Video</span>}
                                                    {documentUrl && <span className="badge bg-primary-light text-primary">Document</span>}
                                                    {!imageUrl && !videoUrl && !documentUrl && <span className="text-white-dark text-xs">No assets</span>}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <button type="button" className="btn btn-sm btn-outline-primary p-2" onClick={() => setSelectedItem(resource)}>
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

            {selectedItem && (
                <div className="fixed inset-0 z-[1000] bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelectedItem(null)}>
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

                        {buildAssetUrl(selectedItem.image) && (
                            <div className="mt-5">
                                <h4 className="font-semibold mb-2">Image</h4>
                                <img src={buildAssetUrl(selectedItem.image) || ''} alt={selectedItem.title} className="w-full max-h-[360px] object-contain rounded-lg border border-white-light dark:border-[#1b2e4b]" />
                            </div>
                        )}

                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="panel bg-[#f8f9fa] dark:bg-[#060818]">
                                <h4 className="font-semibold mb-2">Video</h4>
                                {buildAssetUrl(selectedItem.video) ? (
                                    <a href={buildAssetUrl(selectedItem.video) || '#'} target="_blank" rel="noreferrer" className="text-success hover:underline">
                                        Open video resource
                                    </a>
                                ) : (
                                    <p className="text-white-dark text-sm">No video attached.</p>
                                )}
                            </div>
                            <div className="panel bg-[#f8f9fa] dark:bg-[#060818]">
                                <h4 className="font-semibold mb-2">Document</h4>
                                {buildAssetUrl(selectedItem.document) ? (
                                    <a href={buildAssetUrl(selectedItem.document) || '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        Open document
                                    </a>
                                ) : (
                                    <p className="text-white-dark text-sm">No document attached.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningCorner;
