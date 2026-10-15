import { useCallback, useEffect, useRef, useState } from 'react';
import PdfCanvasViewer from '../../../components/Common/PdfCanvasViewer';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconDownload from '../../../components/Icon/IconDownload';
import IconFile from '../../../components/Icon/IconFile';
import PageHeader from '../../../components/Common/PageHeader';
import IconEye from '../../../components/Icon/IconEye';
import Modal from '../../../components/Common/Modal';
import { CompanyPolicy, fetchCompanyPolicies, fetchPolicyFile } from './api';

import Button from '../../../components/Common/Button';
import CardGrid from '../../../components/Common/CardGrid';
const CompanyPolicyPage = () => {
    const dispatch = useDispatch();
    const [policies, setPolicies] = useState<CompanyPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(6);
    const [totalCount, setTotalCount] = useState(0);

    const [viewing, setViewing] = useState<CompanyPolicy | null>(null);
    const [preview, setPreview] = useState<{ kind: 'pdf' | 'text' | 'docx' | 'none'; blob: Blob; url?: string; text?: string } | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const docxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!viewing) return;
        let cancelled = false;
        let url: string | undefined;
        setPreview(null);
        setPreviewError(null);
        if (docxRef.current) docxRef.current.innerHTML = '';
        (async () => {
            try {
                const blob = await fetchPolicyFile(viewing.id);
                if (cancelled) return;
                const ext = (viewing.file_name || '').split('.').pop()?.toLowerCase();
                if (ext === 'pdf') {
                    url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    setPreview({ kind: 'pdf', blob, url });
                } else if (ext === 'txt') {
                    setPreview({ kind: 'text', blob, text: await blob.text() });
                } else if (ext === 'docx') {
                    const { renderAsync } = await import('docx-preview');
                    // wait a tick so the modal body (and the ref) is mounted
                    await new Promise((r) => setTimeout(r, 50));
                    if (cancelled || !docxRef.current) return;
                    await renderAsync(blob, docxRef.current, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: false });
                    setPreview({ kind: 'docx', blob });
                } else {
                    setPreview({ kind: 'none', blob });
                }
            } catch (e) {
                if (!cancelled) setPreviewError(e instanceof Error ? e.message : 'Failed to load document');
            }
        })();
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [viewing]);

    const downloadPreview = () => {
        if (!preview?.blob || !viewing) return;
        const url = URL.createObjectURL(preview.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewing.file_name || `${viewing.name}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const loadPolicies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCompanyPolicies({
                page,
                page_size: pageSize,
                search: search.trim(),
            });
            setPolicies(data.results);
            setTotalCount(data.count);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load company policies';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);

    useEffect(() => {
        dispatch(setPageTitle('Company Policies'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadPolicies();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadPolicies]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Company Policies"
                subtitle="Review, search, and download official organizational policies, employee guidelines, and compliance handbooks."
                icon={<IconFile />}
                badge="Governance & Policies"
            />

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

            <CardGrid
                items={policies}
                rowKey={(policy) => policy.id}
                loading={loading}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={[6, 12, 24]}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                }}
                searchPlaceholder="Search policies..."
                onRefresh={loadPolicies}
                entityLabel="policies"
                emptyMessage="No policies found"
                emptyIcon={<IconFile className="h-10 w-10" />}
                cols={3}
                renderCard={(policy) => (
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                <IconFile className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="break-words text-sm font-bold text-slate-900">{policy.name}</h3>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-extrabold text-brand">v{policy.version || '1.0'}</span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                        Published {policy.published_at ? new Date(policy.published_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {policy.document ? (
                                <>
                                    <Button variant="outline" leftIcon={<IconEye />} onClick={() => setViewing(policy)}>
                                        View
                                    </Button>
                                    <a href={policy.document} target="_blank" rel="noreferrer" download className="block">
                                        <Button variant="secondary" fullWidth leftIcon={<IconDownload />} tabIndex={-1}>
                                            Download
                                        </Button>
                                    </a>
                                </>
                            ) : (
                                <p className="col-span-2 text-sm font-medium text-amber-600">Document not available</p>
                            )}
                        </div>
                    </div>
                )}
            />

            <Modal
                open={!!viewing}
                onClose={() => setViewing(null)}
                size="5xl"
                icon={<IconFile />}
                title={viewing?.name}
                subtitle={viewing ? `Version ${viewing.version || '1.0'} · Published ${viewing.published_at ? new Date(viewing.published_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} · Latest version` : undefined}
                bodyClassName="!p-0"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setViewing(null)}>
                            Close
                        </Button>
                        <Button leftIcon={<IconDownload />} onClick={downloadPreview} disabled={!preview?.blob}>
                            Download
                        </Button>
                    </>
                }
            >
                <div className="h-[70vh] overflow-auto bg-white">
                    {previewError ? (
                        <div className="p-10 text-center text-sm font-semibold text-rose-600">{previewError}</div>
                    ) : !preview && viewing?.file_name?.toLowerCase().endsWith('.docx') ? null : !preview ? (
                        <div className="p-10 text-center text-sm text-slate-400">Loading document...</div>
                    ) : preview.kind === 'pdf' ? (
                        <PdfCanvasViewer blob={preview.blob} />
                    ) : preview.kind === 'text' ? (
                        <pre className="whitespace-pre-wrap break-words p-5 font-mono text-sm">{preview.text}</pre>
                    ) : preview.kind === 'none' ? (
                        <div className="p-10 text-center text-sm text-slate-500">Preview is not available for this file type ({viewing?.file_name}). Use Download to open it.</div>
                    ) : null}
                    {!preview && !previewError && viewing?.file_name?.toLowerCase().endsWith('.docx') && <div className="p-10 text-center text-sm text-slate-400">Loading document...</div>}
                    <div ref={docxRef} className={preview?.kind === 'docx' && !previewError ? '' : 'hidden'} />
                </div>
            </Modal>
        </div>
    );
};

export default CompanyPolicyPage;
