import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import IconEye from '../../components/Icon/IconEye';
import IconClock from '../../components/Icon/IconClock';
import IconDownload from '../../components/Icon/IconDownload';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconTxtFile from '../../components/Icon/IconTxtFile';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/policies/`;
const ACCEPT = '.pdf,.doc,.docx,.txt';

type PolicyVersion = {
    id: number;
    version: string;
    published_at: string;
    change_note?: string;
    uploaded_by_name?: string | null;
    file_name?: string | null;
    created_at?: string;
};

type Policy = {
    id: number;
    name: string;
    document?: string | null;
    is_active: boolean;
    version?: string;
    published_at?: string;
    versions?: PolicyVersion[];
    created_at?: string;
};

type Preview = { kind: 'pdf' | 'text' | 'docx' | 'none'; blob?: Blob; url?: string; text?: string };

const today = () => new Date().toLocaleDateString('en-CA');
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const fmtTime = (d?: string) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }) : '');
const fmtPublished = (v?: { published_at?: string; created_at?: string }) => [fmtDate(v?.published_at), fmtTime(v?.created_at)].filter(Boolean).join(', ');
const nextVersion =(v?: string) => {
    const [major = 1, minor = 0] = (v || '1.0').split('.').map((n) => parseInt(n, 10) || 0);
    return minor >= 3 ? `${major + 1}.0` : `${major}.${minor + 1}`;
};

const tokenHeader = (): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
};

const AdminCompanyPolicies = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Policy | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploadOnly, setUploadOnly] = useState(false);
    const [publishedAt, setPublishedAt] = useState(today());
    const [note, setNote] = useState('');
    const [historyOf, setHistoryOf] = useState<Policy | null>(null);
    const [viewing, setViewing] = useState<{ policy: Policy; versionId?: number } | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const docxRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Company Policies'));
    }, [dispatch]);

    const viewingVersion = viewing?.policy.versions?.find((v) => v.id === viewing.versionId);
    const viewingFileName = viewingVersion?.file_name || String(viewing?.policy.document || '').split('/').pop() || 'policy';

    useEffect(() => {
        if (!viewing) return;
        let cancelled = false;
        let url: string | undefined;
        setPreview(null);
        setPreviewError(null);
        if (docxRef.current) docxRef.current.innerHTML = '';
        (async () => {
            try {
                const resp = await fetch(`${API_URL}${viewing.policy.id}/file/${viewing.versionId ? `?version=${viewing.versionId}` : ''}`, { headers: tokenHeader() });
                if (!resp.ok) throw new Error((await resp.json().catch(() => ({})))?.detail || 'Failed to load document');
                const blob = await resp.blob();
                if (cancelled) return;
                const ext = viewingFileName.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') {
                    url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    setPreview({ kind: 'pdf', blob, url });
                } else if (ext === 'txt') {
                    setPreview({ kind: 'text', blob, text: await blob.text() });
                } else if (ext === 'docx') {
                    const { renderAsync } = await import('docx-preview');
                    if (cancelled || !docxRef.current) return;
                    await renderAsync(blob, docxRef.current, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: false });
                    setPreview({ kind: 'docx', blob });
                } else {
                    setPreview({ kind: 'none', blob });
                }
            } catch (e: any) {
                if (!cancelled) setPreviewError(e?.message || 'Failed to load document');
            }
        })();
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewing]);

    const downloadPreview = () => {
        if (!preview?.blob) return;
        const url = URL.createObjectURL(preview.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewingFileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const openView = (policy: Policy, versionId?: number) => {
        setHistoryOf(null);
        setViewing({ policy, versionId: versionId ?? policy.versions?.[0]?.id });
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const url = new URL(API_URL);
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (search.trim()) url.searchParams.append('search', search.trim());
            if (filter === 'active') url.searchParams.append('is_active', 'true');
            if (filter === 'inactive') url.searchParams.append('is_active', 'false');

            const resp = await fetch(url.toString(), { headers: tokenHeader() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load policies');
            if (data.results) {
                setItems(data.results);
                setTotalCount(data.count ?? 0);
            } else {
                const arr = Array.isArray(data) ? data : [];
                setItems(arr);
                setTotalCount(arr.length);
            }
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAll();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, search, filter]);

    const resetUpload = () => {
        setFile(null);
        setPublishedAt(today());
        setNote('');
    };
    const openModal = (p: Policy, upload = false) => {
        setEditing({ ...p });
        setUploadOnly(upload);
        resetUpload();
        setModalOpen(true);
    };
    const openAdd = () => openModal({ id: 0, name: '', is_active: true, document: null });
    const openEdit = (p: Policy) => openModal(p);
    const openUpload = (p: Policy) => openModal(p, true);

    const save = async () => {
        if (!editing) return;
        const name = (editing.name || '').trim();
        if (!name) {
            Swal.fire('Required', 'Policy name is required.', 'warning');
            return;
        }
        const isEdit = !!editing.id;
        if ((!isEdit || uploadOnly) && !file) {
            Swal.fire('Required', 'Please upload the policy document.', 'warning');
            return;
        }
        try {
            const fd = new FormData();
            fd.append('name', name);
            fd.append('is_active', String(!!editing.is_active));
            if (file) {
                fd.append('document', file);
                fd.append('published_at', publishedAt || today());
                fd.append('change_note', note.trim());
            }

            const resp = await fetch(isEdit ? `${API_URL}${editing.id}/` : API_URL, {
                method: isEdit ? 'PUT' : 'POST',
                headers: tokenHeader() as any,
                body: fd,
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || (Object.values(data || {}).flat()[0] as string) || 'Failed to save');
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
        {
            key: 'id',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _p, idx) => <span className="font-semibold text-gray-500">{(idx ?? 0) + 1}</span>,
        },
        {
            key: 'name',
            title: 'Policy Name',
            sortable: true,
            render: (_val, p) => <span className="font-semibold text-gray-800 dark:text-white-light">{p.name}</span>,
        },
        {
            key: 'version',
            title: 'Version',
            sortable: true,
            align: 'center',
            width: '100px',
            render: (_val, p) => (
                <span className="badge bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full">
                    v{p.version || '1.0'}
                </span>
            ),
        },
        {
            key: 'published_at',
            title: 'Published',
            sortable: true,
            render: (_val, p) => (
                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {fmtPublished({ published_at: p.published_at, created_at: p.versions?.[0]?.created_at })}
                </span>
            ),
        },
        {
            key: 'document',
            title: 'Document',
            align: 'center',
            width: '100px',
            render: (_val, p) => (
                p.document ? (
                    <button type="button" className="text-primary hover:underline font-semibold inline-flex items-center gap-1" onClick={() => openView(p)}>
                        <IconEye className="w-4 h-4" /> View
                    </button>
                ) : (
                    <span className="text-gray-400">-</span>
                )
            ),
        },
        {
            key: 'is_active',
            title: 'Status',
            sortable: true,
            align: 'center',
            width: '100px',
            render: (_val, p) => (
                <span className={`badge ${p.is_active ? 'badge-outline-success text-success bg-success/10' : 'badge-outline-danger text-danger bg-danger/10'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '140px',
            render: (_val, p) => (
                <div className="flex items-center justify-center gap-2">
                    <button type="button" className="p-1.5 rounded-lg text-info hover:bg-info/10 transition-colors" onClick={() => setHistoryOf(p)} title="Version history">
                        <IconClock className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-1.5 rounded-lg text-success hover:bg-success/10 transition-colors" onClick={() => openUpload(p)} title={`Upload new version (v${nextVersion(p.version)})`}>
                        <IconDownload className="w-4 h-4 rotate-180" />
                    </button>
                    <IconButton tone="primary" type="button"  onClick={() => openEdit(p)} title="Edit">
                        <IconPencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton tone="danger" type="button"  onClick={() => del(p)} title="Delete">
                        <IconTrashLines className="w-4 h-4" />
                    </IconButton>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Gradient Banner Header */}
            <PageHeader
                icon={<IconTxtFile />}
                title="Company Policies"
                subtitle="Upload policy documents and control visibility."
                variant="rose"
            />

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                }}
                onRefresh={fetchAll}
                searchValue={search}
                onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                }}
                searchPlaceholder="Search policies by name or version..."
                filters={
                    <select
                        className="form-select text-xs py-1.5 px-3 rounded-lg border-[#cbd5e1] dark:border-[#1e293b] dark:bg-[#121e32] focus:border-brand focus:ring-1 focus:ring-brand font-semibold"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value as any);
                            setPage(1);
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                }
                actionButton={
                    <Button type="button"  onClick={openAdd}>
                        <IconPlus className="w-4 h-4" /> Add Policy
                    </Button>
                }
            />

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={<>{uploadOnly ? `Upload New Version — ${editing?.name}` : editing?.id ? 'Edit Policy' : 'Add Policy'}</>} size="xl">
                <div className="space-y-4">
                                                        {!uploadOnly && (
                                                            <>
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
                                                            </>
                                                        )}
                                                        <div>
                                                            <label className="font-semibold">{uploadOnly ? 'Document' : editing?.id ? 'Upload New Version (optional)' : 'Document'}</label>
                                                            <input
                                                                ref={fileRef}
                                                                type="file"
                                                                accept={ACCEPT}
                                                                className="form-input"
                                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                            />
                                                            <div className="text-xs text-white-dark mt-1">PDF, Word (.doc/.docx) or text (.txt)</div>
                                                            {editing?.document && !file && (
                                                                <div className="text-xs text-white-dark mt-1">
                                                                    Current: <span className="underline">{String(editing.document).split('/').pop()}</span> (v{editing.version || '1.0'}, published {fmtPublished({ published_at: editing.published_at, created_at: editing.versions?.[0]?.created_at })})
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(file || uploadOnly) && (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="font-semibold">Version</label>
                                                                        <input className="form-input" value={`v${editing?.id ? nextVersion(editing.version) : '1.0'}`} disabled readOnly />
                                                                    </div>
                                                                    <div>
                                                                        <label className="font-semibold">Publish Date</label>
                                                                        <input type="date" className="form-input" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="font-semibold">Change Note (optional)</label>
                                                                    <input className="form-input" maxLength={500} placeholder="What changed in this version?" value={note} onChange={(e) => setNote(e.target.value)} />
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="flex justify-end gap-3 pt-2">
                                                            <Button variant="outline-danger" type="button"  onClick={() => setModalOpen(false)}>
                                                                Cancel
                                                            </Button>
                                                            <Button type="button"  onClick={save}>
                                                                Save
                                                            </Button>
                                                        </div>

                </div>
            </Modal>

            <Modal open={!!historyOf} onClose={() => setHistoryOf(null)} title={<>Version History — {historyOf?.name}</>} size="3xl">
                <div className="table-responsive">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Version</th>
                                                                <th>Published</th>
                                                                <th>File</th>
                                                                <th>Uploaded By</th>
                                                                <th>Note</th>
                                                                <th className="text-center">View</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {historyOf?.versions?.length ? (
                                                                historyOf.versions.map((v, i) => (
                                                                    <tr key={v.id}>
                                                                        <td className="whitespace-nowrap">
                                                                            <span className={`badge ${i === 0 ? 'badge-outline-success' : 'badge-outline-secondary'}`}>v{v.version}</span>
                                                                            {i === 0 && <span className="text-xs text-success ltr:ml-2 rtl:mr-2">Current</span>}
                                                                        </td>
                                                                        <td className="whitespace-nowrap">{fmtPublished(v)}</td>
                                                                        <td className="break-all">{v.file_name || '-'}</td>
                                                                        <td>{v.uploaded_by_name || '-'}</td>
                                                                        <td>{v.change_note || '-'}</td>
                                                                        <td className="text-center">
                                                                            <button type="button" className="text-primary" onClick={() => openView(historyOf, v.id)} title="View">
                                                                                <IconEye className="w-5 h-5" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={6} className="text-center py-6 text-white-dark">
                                                                        No versions uploaded.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>

                </div>
            </Modal>

            <Modal open={!!viewing} onClose={() => setViewing(null)} title={<>{!!viewing?.policy.versions?.length && (
                                        <select
                                            className="form-select w-auto"
                                            value={viewing.versionId ?? ''}
                                            onChange={(e) => setViewing({ policy: viewing.policy, versionId: Number(e.target.value) })}
                                        >
                                            {viewing.policy.versions.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    v{v.version} — {fmtPublished(v)}
                                                </option>
                                            ))}
                                        </select>
                                    )}</>} icon={<IconDownload />} size="5xl">
                <div className="h-[75vh] overflow-auto bg-white dark:bg-[#0e1726]">
                                                    {previewError ? (
                                                        <div className="p-10 text-center text-danger">{previewError}</div>
                                                    ) : !preview ? (
                                                        <div className="p-10 text-center text-white-dark">Loading document...</div>
                                                    ) : preview.kind === 'pdf' ? (
                                                        <iframe title={viewingFileName} src={preview.url} className="w-full h-full border-0" />
                                                    ) : preview.kind === 'text' ? (
                                                        <pre className="p-5 whitespace-pre-wrap break-words text-sm font-mono">{preview.text}</pre>
                                                    ) : preview.kind === 'none' ? (
                                                        <div className="p-10 text-center text-white-dark">
                                                            Preview is not available for this file type ({viewingFileName}). Use Download to open it.
                                                        </div>
                                                    ) : null}
                                                    <div ref={docxRef} className={preview?.kind === 'docx' && !previewError ? '' : 'hidden'} />
                                                </div>
            </Modal>
        </div>
    );
};

export default AdminCompanyPolicies;

