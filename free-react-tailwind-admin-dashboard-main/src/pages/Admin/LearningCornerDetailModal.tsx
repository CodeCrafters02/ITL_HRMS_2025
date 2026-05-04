import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import IconFolder from '../../components/Icon/IconFolder';
import IconMaximize from '../../components/Icon/IconMaximize';
import IconArrowLeft from '../../components/Icon/IconArrowLeft';
import IconArrowForward from '../../components/Icon/IconArrowForward';

export type LearningCornerPreviewMedia = {
    id: number | null;
    url: string;
    media_type: 'image' | 'video' | 'document';
    filename: string;
};

export type LearningCornerPreviewResource = {
    id: number;
    title: string;
    description?: string | null;
    links?: { title: string; url: string }[] | null;
    media?: LearningCornerPreviewMedia[];
};

export type LearningCornerLinkRow = { title: string; url: string };

/** Drops empty URL rows (e.g. accidental "Add link") and only keeps safe http(s) URLs. */
export function sanitizeLearningCornerLinks(links: LearningCornerLinkRow[] | null | undefined): LearningCornerLinkRow[] {
    if (!Array.isArray(links)) return [];
    const out: LearningCornerLinkRow[] = [];
    for (const row of links) {
        const raw = (row?.url ?? '').trim();
        if (!raw) continue;
        let url = raw;
        if (!/^https?:\/\//i.test(url)) {
            if (/^[a-z]+:/i.test(url)) continue;
            url = `https://${url}`;
        }
        try {
            const u = new URL(url);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        } catch {
            continue;
        }
        out.push({ title: (row?.title ?? '').trim(), url });
    }
    return out;
}

type DetailFolder = 'images' | 'videos' | 'documents';

type ImageGalleryPreview = {
    title: string;
    urls: string[];
    index: number;
};

const mediaList = (r: LearningCornerPreviewResource) => r.media ?? [];

const pickDefaultDetailFolder = (resource: LearningCornerPreviewResource): DetailFolder => {
    const m = mediaList(resource);
    if (m.some((x) => x.media_type === 'image')) return 'images';
    if (m.some((x) => x.media_type === 'video')) return 'videos';
    if (m.some((x) => x.media_type === 'document')) return 'documents';
    return 'images';
};

const imageUrlsFromResource = (resource: LearningCornerPreviewResource): string[] =>
    mediaList(resource)
        .filter((x) => x.media_type === 'image')
        .map((x) => x.url);

type Props = {
    resource: LearningCornerPreviewResource | null;
    onClose: () => void;
};

export default function LearningCornerDetailModal({ resource, onClose }: Props) {
    const [detailFolder, setDetailFolder] = useState<DetailFolder>('images');
    const [imageGallery, setImageGallery] = useState<ImageGalleryPreview | null>(null);

    useEffect(() => {
        if (!resource) {
            setImageGallery(null);
            return;
        }
        setDetailFolder(pickDefaultDetailFolder(resource));
    }, [resource?.id]);

    if (!resource) return null;

    const m = mediaList(resource);
    const imgItems = m.filter((x) => x.media_type === 'image');
    const vidItems = m.filter((x) => x.media_type === 'video');
    const docItems = m.filter((x) => x.media_type === 'document');

    const folderBtn = (id: DetailFolder, label: string, count: number) => (
        <button
            type="button"
            key={id}
            disabled={count === 0}
            onClick={() => {
                if (count > 0) setDetailFolder(id);
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
            <span className="text-xs text-white-dark">
                {count} file{count === 1 ? '' : 's'}
            </span>
        </button>
    );

    const detailBody = (
        <div className="panel w-full max-w-3xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold">{resource.title}</h3>
                    <p className="text-white-dark mt-1">{resource.description || 'No description provided.'}</p>
                </div>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={onClose}>
                    Close
                </button>
            </div>

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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {imgItems.map((it) => {
                                    const openGallery = () => {
                                        const urls = imageUrlsFromResource(resource);
                                        const idx = urls.indexOf(it.url);
                                        setImageGallery({
                                            title: resource.title,
                                            urls,
                                            index: idx >= 0 ? idx : 0,
                                        });
                                    };
                                    return (
                                        <div
                                            key={it.id ?? it.url}
                                            className="rounded-lg border-2 overflow-hidden bg-black/5 border-white-light dark:border-[#1b2e4b]"
                                        >
                                            <div className="relative">
                                                <button type="button" className="block w-full text-left" onClick={openGallery}>
                                                    <img src={it.url} alt={it.filename} className="w-full max-h-[240px] object-contain" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="absolute top-2 right-2 btn btn-sm btn-outline-primary p-2 rounded-md bg-[#0e1726]/90 shadow-md"
                                                    aria-label="Open expanded preview"
                                                    title="Expanded preview"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openGallery();
                                                    }}
                                                >
                                                    <IconMaximize className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <span className="block text-xs text-white-dark truncate px-2 py-1">{it.filename || 'Image'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {detailFolder === 'videos' && (
                    <div>
                        {vidItems.length === 0 ? (
                            <p className="text-sm text-white-dark">No videos in this folder.</p>
                        ) : (
                            <div className="space-y-4">
                                {vidItems.map((it) => (
                                    <div
                                        key={it.id ?? it.url}
                                        className="rounded-lg border-2 p-3 bg-black/5 border-white-light dark:border-[#1b2e4b]"
                                    >
                                        <video src={it.url} controls className="w-full max-h-[320px] rounded-lg border border-white-light dark:border-[#1b2e4b] bg-black" />
                                        <a
                                            href={it.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-success text-sm hover:underline inline-block mt-2"
                                        >
                                            Open in new tab ({it.filename || 'video'})
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {detailFolder === 'documents' && (
                    <div className="panel bg-[#f8f9fa] dark:bg-[#060818]">
                        {docItems.length === 0 ? (
                            <p className="text-sm text-white-dark">No documents in this folder.</p>
                        ) : (
                            <ul className="space-y-3 text-sm list-none p-0 m-0">
                                {docItems.map((it) => (
                                    <li
                                        key={it.id ?? it.url}
                                        className="flex items-center gap-3 rounded-md border px-3 py-2 border-white-light dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]"
                                    >
                                        <a href={it.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate flex-1 min-w-0">
                                            {it.filename || 'Open file'}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {m.length === 0 && (
                <p className="mt-4 text-sm text-white-dark">No uploaded files for this resource. Use external links below if available.</p>
            )}

            {(() => {
                const externalLinks = sanitizeLearningCornerLinks(resource.links);
                if (externalLinks.length === 0) return null;
                return (
                    <div className="mt-5 panel bg-warning-light/20 dark:bg-warning/10 border-warning/20">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-warning"></span>
                            External Resources
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {externalLinks.map((link, idx) => (
                                <a
                                    key={`${link.url}-${idx}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="btn btn-sm btn-outline-warning bg-white dark:bg-[#060818] shadow-sm hover:scale-105 transition-transform"
                                >
                                    {link.title?.trim() || link.url}
                                </a>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/60 p-4 flex items-center justify-center" onClick={onClose}>
                    {detailBody}
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
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setImageGallery(null)}>
                                    Close
                                </button>
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
        </>
    );
}
