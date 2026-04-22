import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
};

const authJsonHeaders = (): HeadersInit => ({ ...authHeaders(), 'Content-Type': 'application/json' });

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

    const load = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/asset-requests/`);
            url.searchParams.set('page_size', '50');
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const data = await parseList(res);
            setRows(data.results);
        } catch (e: any) {
            setRows([]);
            Swal.fire('Error', e?.message || 'Could not load requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

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
            const res = await fetch(`${API_BASE_URL}/app/asset-requests/`, {
                method: 'POST',
                headers: authHeaders(),
                body: fd,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Could not submit');
            setRemarks('');
            setRelatedFixedId('');
            setRelatedSupplyId('');
            setImage(null);
            Swal.fire('Submitted', 'Your request was sent to admin for approval.', 'success');
            load();
        } catch (err: any) {
            Swal.fire('Error', err?.message || 'Submit failed', 'error');
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] p-6 rounded-2xl shadow-xl text-white">
                <h1 className="text-2xl font-extrabold tracking-tight">Asset Requests</h1>
                <p className="text-white/80 mt-1 text-sm">Raise a request for a variable item or report a core asset issue.</p>
                <p className="text-white/60 mt-2 text-xs">Signed in as: {myName}</p>
            </div>

            <div className="panel">
                <h2 className="text-lg font-bold mb-3">New request</h2>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="md:col-span-3 flex justify-end">
                        <button type="submit" className="btn btn-primary">Submit for approval</button>
                    </div>
                </form>
            </div>

            <div className="panel">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">My requests</h2>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading}>
                        {loading ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
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
        </div>
    );
};

export default EmployeeAssetRequests;

