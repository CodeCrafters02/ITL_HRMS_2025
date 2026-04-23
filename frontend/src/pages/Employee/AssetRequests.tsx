import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { authFetch } from '../../utils/authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const authJsonHeaders = (): HeadersInit => ({ 'Content-Type': 'application/json' });

const parseList = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || res.statusText);
    if (Array.isArray(data)) return { results: data, count: data.length };
    return { results: data.results || [], count: data.count ?? 0 };
};

const EmployeeAssetRequests = () => {
    const dispatch = useDispatch();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [remarks, setRemarks] = useState('');
    const [relatedFixedId, setRelatedFixedId] = useState('');
    const [relatedSupplyId, setRelatedSupplyId] = useState('');
    const [image, setImage] = useState<File | null>(null);

    const myName = useMemo(() => {
        const first = (localStorage.getItem('first_name') || '').trim();
        const last = (localStorage.getItem('last_name') || '').trim();
        const fallback = localStorage.getItem('username') || 'Employee';
        const display = `${first} ${last}`.trim() || fallback;
        return display.charAt(0).toUpperCase() + display.slice(1);
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Asset Requests'));
    }, [dispatch]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/asset-requests/`);
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            const res = await authFetch(url.toString(), { headers: authJsonHeaders() });
            const data = await parseList(res);
            setRows(data.results);
            setTotalCount(data.count);
            setTotalPages(Math.max(1, Math.ceil((data.count || 0) / pageSize)));
        } catch (e: any) {
            setRows([]);
            setTotalCount(0);
            setTotalPages(1);
            Swal.fire('Error', e?.message || 'Could not load requests', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        load();
    }, [load]);

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

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!remarks.trim() && !relatedFixedId && !relatedSupplyId) {
            Swal.fire('Add details', 'Please describe the request and/or select an ID.', 'warning');
            return;
        }
        const fd = new FormData();
        fd.append('approval_status', 'pending');
        if (remarks.trim()) fd.append('remarks', remarks.trim());
        if (relatedFixedId) fd.append('related_fixed_asset', relatedFixedId);
        if (relatedSupplyId) fd.append('related_supply_item', relatedSupplyId);
        if (image) fd.append('image', image);

        try {
            const res = await authFetch(`${API_BASE_URL}/app/asset-requests/`, {
                method: 'POST',
                body: fd,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Could not submit');
            setRemarks('');
            setRelatedFixedId('');
            setRelatedSupplyId('');
            setImage(null);
            setIsRequestModalOpen(false);
            setPage(1);
            Swal.fire('Submitted', 'Your request was sent to admin for approval.', 'success');
            load();
        } catch (err: any) {
            Swal.fire('Error', err?.message || 'Submit failed', 'error');
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] p-6 rounded-2xl shadow-xl text-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Asset Requests</h1>
                        <p className="text-white/80 mt-1 text-sm">Raise a request for a variable item or report a core asset issue.</p>
                        <p className="text-white/60 mt-2 text-xs">Signed in as: {myName}</p>
                    </div>
                    <button type="button" className="btn btn-primary w-full md:w-auto" onClick={() => setIsRequestModalOpen(true)}>
                        New Request
                    </button>
                </div>
            </div>

            <div className="panel">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">My requests</h2>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => load()} disabled={loading}>
                        {loading ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
                {totalCount > 0 && (
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                )}
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th>Core asset</th>
                                <th>Variable item</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-6 text-gray-500">No requests yet.</td></tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.id}>
                                        <td><span className="badge badge-outline-primary">{r.approval_status}</span></td>
                                        <td className="max-w-[420px] truncate" title={r.remarks || ''}>{r.remarks || '—'}</td>
                                        <td>{r.related_fixed_asset ?? '—'}</td>
                                        <td>{r.related_supply_item ?? '—'}</td>
                                        <td className="text-sm text-gray-600 dark:text-gray-400">{(r.created_at || '').slice(0, 10) || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isRequestModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center" onClick={() => setIsRequestModalOpen(false)}>
                    <div className="panel w-full max-w-3xl max-h-[92vh] overflow-auto dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-bold">New request</h3>
                                <p className="text-white-dark mt-1 text-sm">Raise a request for a variable item or report a core asset issue.</p>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setIsRequestModalOpen(false)}>
                                Close
                            </button>
                        </div>
                        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium mb-1">Remarks / Notes</label>
                                <textarea className="form-textarea" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Laptop screen flickering / Need new mouse for onboarding" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Core asset ID (optional)</label>
                                <input className="form-input" value={relatedFixedId} onChange={(e) => setRelatedFixedId(e.target.value)} placeholder="FixedAsset id" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Variable item ID (optional)</label>
                                <input className="form-input" value={relatedSupplyId} onChange={(e) => setRelatedSupplyId(e.target.value)} placeholder="SupplyItem id" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Image (optional)</label>
                                <input type="file" accept="image/*" className="form-input" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-2">
                                <button type="button" className="btn btn-outline-danger" onClick={() => setIsRequestModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">Submit for approval</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeAssetRequests;

