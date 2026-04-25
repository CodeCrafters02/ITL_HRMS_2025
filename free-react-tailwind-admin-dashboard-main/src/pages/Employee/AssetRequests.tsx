import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
    const [requestedQuantity, setRequestedQuantity] = useState(1);
    const [image, setImage] = useState<File | null>(null);

    const [requestType, setRequestType] = useState<'core' | 'supply' | null>(null);
    const [supplyItems, setSupplyItems] = useState<any[]>([]);
    const [supplySearch, setSupplySearch] = useState('');
    const [supplyLoading, setSupplyLoading] = useState(false);

    const [cart, setCart] = useState<{ id: number; item_name: string; quantity: number; max: number; max_per_order: number; image: string; category: string; price: number }[]>([]);

    const [expandedBatches, setExpandedBatches] = useState<string[]>([]);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [myAssets, setMyAssets] = useState<any[]>([]);
    const [myAssetsLoading, setMyAssetsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'core' | 'supply'>('core');

    const toggleBatch = (bid: string) => {
        setExpandedBatches((prev) => (prev.includes(bid) ? prev.filter((b) => b !== bid) : [...prev, bid]));
    };
    const toggleRow = (rid: number) => {
        setExpandedRows((prev) => (prev.includes(rid) ? prev.filter((r) => r !== rid) : [...prev, rid]));
    };

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
        
        if (requestType === 'core') {
            if (!remarks.trim() && !relatedFixedId) {
                Swal.fire('Add details', 'Please describe the request or enter an Asset ID.', 'warning');
                return;
            }
            const fd = new FormData();
            fd.append('approval_status', 'pending');
            if (remarks.trim()) fd.append('remarks', remarks.trim());
            if (relatedFixedId) fd.append('related_fixed_asset', relatedFixedId);
            if (image) fd.append('image', image);
            await sendRequest(fd);
        } else if (requestType === 'supply') {
            if (cart.length === 0) {
                Swal.fire('Cart Empty', 'Please add at least one item to your basket.', 'warning');
                return;
            }
            
            setLoading(true);
            try {
                const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
                for (const item of cart) {
                    const fd = new FormData();
                    fd.append('approval_status', 'pending');
                    fd.append('batch_id', batchId);
                    fd.append('related_supply_item', String(item.id));
                    fd.append('requested_quantity', String(item.quantity));
                    if (remarks.trim()) fd.append('remarks', `[Part of Batch] ${remarks.trim()}`);
                    const res = await authFetch(`${API_BASE_URL}/app/asset-requests/`, {
                        method: 'POST',
                        body: fd,
                    });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data?.detail || `Failed to request ${item.item_name}`);
                    }
                }
                Swal.fire('Success', `Successfully requested ${cart.length} items.`, 'success');
                finishSubmit();
            } catch (err: any) {
                Swal.fire('Partial Success / Error', err.message, 'error');
                load();
            } finally {
                setLoading(false);
            }
        }
    };

    const sendRequest = async (fd: FormData) => {
        try {
            const res = await authFetch(`${API_BASE_URL}/app/asset-requests/`, {
                method: 'POST',
                body: fd,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Could not submit');
            Swal.fire('Submitted', 'Your request was sent to admin for approval.', 'success');
            finishSubmit();
        } catch (err: any) {
            Swal.fire('Error', err?.message || 'Submit failed', 'error');
        }
    };

    const fetchMyAssets = useCallback(async () => {
        setMyAssetsLoading(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/app/fixed-assets/`, { headers: authJsonHeaders() });
            const data = await parseList(res);
            setMyAssets(data.results);
        } catch (e: any) {
            console.error('Could not load your assets', e);
        } finally {
            setMyAssetsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (requestType === 'core') {
            fetchMyAssets();
        }
    }, [requestType, fetchMyAssets]);

    const finishSubmit = () => {
        setRemarks('');
        setRelatedFixedId('');
        setRelatedSupplyId('');
        setRequestedQuantity(1);
        setRequestType(null);
        setCart([]);
        setImage(null);
        setIsRequestModalOpen(false);
        setPage(1);
        load();
    };

    const addToCart = (item: any) => {
        if (item.available_quantity <= 0) {
            Swal.fire({ title: 'Out of Stock', text: `Sorry, ${item.item_name} is currently unavailable.`, icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            return;
        }
        setCart((prev) => {
            const exists = prev.find((i) => i.id === item.id);
            const limit = Math.min(item.available_quantity, item.max_per_order || 10);
            
            if (exists) {
                if (exists.quantity < limit) {
                    return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                } else {
                    Swal.fire({ 
                        title: 'Limit Reached', 
                        text: exists.quantity >= item.max_per_order ? `You can only request ${item.max_per_order} of this item per order.` : `Only ${item.available_quantity} units are available in stock.`, 
                        icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 
                    });
                    return prev;
                }
            }
            return [
                ...prev,
                {
                    id: item.id,
                    item_name: item.item_name,
                    quantity: 1,
                    max: item.available_quantity,
                    max_per_order: item.max_per_order || 10,
                    image: item.image,
                    category: item.sub_category,
                    price: Number(item.unit_price || 0),
                },
            ];
        });
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [cart]);

    const removeFromCart = (id: number) => {
        setCart((prev) => prev.filter((i) => i.id !== id));
    };

    const updateCartQty = (id: number, delta: number) => {
        setCart((prev) =>
            prev.map((i) => {
                if (i.id === id) {
                    const limit = Math.min(i.max, i.max_per_order);
                    if (delta > 0 && i.quantity >= limit) {
                        Swal.fire({ 
                            title: 'Limit Reached', 
                            text: i.quantity >= i.max_per_order ? `Maximum allowed is ${i.max_per_order} per order.` : `Only ${i.max} units available in stock.`, 
                            icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 
                        });
                        return i;
                    }
                    const next = Math.max(1, Math.min(limit, i.quantity + delta));
                    return { ...i, quantity: next };
                }
                return i;
            })
        );
    };

    const fetchSupplyItems = useCallback(async () => {
        setSupplyLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/supply-items/`);
            url.searchParams.set('page_size', '100');
            if (supplySearch) url.searchParams.set('search', supplySearch);
            const res = await authFetch(url.toString(), { headers: authJsonHeaders() });
            const data = await parseList(res);
            setSupplyItems(data.results);
        } catch {
            setSupplyItems([]);
        } finally {
            setSupplyLoading(false);
        }
    }, [supplySearch]);

    useEffect(() => {
        if (isRequestModalOpen && requestType === 'supply') {
            fetchSupplyItems();
        }
    }, [isRequestModalOpen, requestType, fetchSupplyItems]);

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

                <div className="flex items-center gap-6 mb-6 border-b dark:border-gray-800">
                    <button 
                        className={`pb-2.5 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative ${activeTab === 'core' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        onClick={() => { setActiveTab('core'); setPage(1); }}
                    >
                        Core Assets (Fixed)
                        {activeTab === 'core' && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>}
                    </button>
                    <button 
                        className={`pb-2.5 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative ${activeTab === 'supply' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        onClick={() => { setActiveTab('supply'); setPage(1); }}
                    >
                        Supply Items (Variable)
                        {activeTab === 'supply' && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>}
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
                                <th>Order / Type</th>
                                <th className="text-center">Items</th>
                                <th className="text-center">Overall Status</th>
                                <th>Note</th>
                                <th className="text-end">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-6 text-gray-500">No requests yet.</td></tr>
                            ) : (() => {
                                const filtered = rows.filter(row => {
                                     if (activeTab === 'core') return !!row.related_fixed_asset;
                                     if (activeTab === 'supply') return !!row.related_supply_item;
                                     return true;
                                 });
                                 if (filtered.length === 0) {
                                     return <tr><td colSpan={5} className="text-center py-6 text-gray-400 italic">No {activeTab === 'core' ? 'core asset' : 'supply item'} requests in this view.</td></tr>;
                                 }
                                const groups: any[] = [];
                                const seen = new Set();
                                filtered.forEach(item => {
                                    if (item.batch_id && !seen.has(item.batch_id)) {
                                        seen.add(item.batch_id);
                                        const items = filtered.filter(x => x.batch_id === item.batch_id);
                                        groups.push({ type: 'batch', id: item.batch_id, items, ...item });
                                    } else if (!item.batch_id) {
                                        groups.push({ type: 'single', data: item });
                                    }
                                });

                                return groups.map((g) => {
                                    if (g.type === 'single') {
                                        const row = g.data;
                                        const isRowExpanded = expandedRows.includes(row.id);
                                        return (
                                            <Fragment key={row.id}>
                                                <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors" onClick={() => toggleRow(row.id)}>
                                                    <td className="font-bold text-xs flex items-center gap-2">
                                                        <div className={`p-0.5 rounded bg-gray-100 text-gray-500 transition-transform ${isRowExpanded ? 'rotate-180' : ''}`}>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span>{row.related_fixed_asset ? 'Fixed Asset Request' : 'Supply Request'}</span>
                                                            <span className="text-[9px] font-black uppercase text-indigo-600 leading-none">{row.item_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center font-black">{row.requested_quantity || 1}</td>
                                                    <td className="text-center">
                                                        <span className={`badge uppercase text-[8px] font-black ${
                                                            row.approval_status === 'approved' ? 'badge-outline-success' : 
                                                            row.approval_status === 'rejected' ? 'badge-outline-danger' : 'badge-outline-warning'
                                                        }`}>{row.approval_status}</span>
                                                    </td>
                                                    <td className="text-[10px] italic text-gray-500 max-w-[200px] truncate">{row.remarks || '—'}</td>
                                                    <td className="text-end text-[10px] text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>
                                                </tr>
                                                {isRowExpanded && (
                                                    <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                                                        <td colSpan={5} className="p-3">
                                                            <div className="bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/30 rounded-lg p-3 shadow-sm flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase text-gray-400">Approval Details</span>
                                                                    <span className={`text-[10px] font-black uppercase ${row.approval_status === 'approved' ? 'text-green-500' : 'text-amber-500'}`}>{row.approval_status}</span>
                                                                </div>
                                                                
                                                                {row.approval_status === 'approved' && row.related_fixed_asset && (
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-2 rounded border border-indigo-100/50 dark:border-indigo-900/20">
                                                                            <p className="text-[8px] uppercase font-black text-indigo-400 mb-1 tracking-widest">Admin Action</p>
                                                                            <p className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 italic">{row.admin_action_type || 'General Approval'}</p>
                                                                        </div>
                                                                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100/50 dark:border-emerald-900/20">
                                                                            <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-widest">Employee Payment</p>
                                                                            <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 italic">
                                                                                {Number(row.employee_payment_amount) > 0 ? `₹${Number(row.employee_payment_amount).toLocaleString()}` : 'NIL (Covered by Company)'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {row.approval_status === 'rejected' && (
                                                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100/50 dark:border-red-900/20">
                                                                        <p className="text-[8px] uppercase font-black text-red-400 mb-1 tracking-widest">Reason for Rejection</p>
                                                                        <p className="text-xs font-medium text-red-700 dark:text-red-300 italic">{row.remarks || 'No specific reason provided.'}</p>
                                                                    </div>
                                                                )}

                                                                {!row.admin_action_type && row.approval_status === 'approved' && !row.related_fixed_asset && (
                                                                    <p className="text-[10px] text-gray-400 italic">No additional details for this supply request.</p>
                                                                )}
                                                                
                                                                {row.approval_status === 'pending' && (
                                                                    <p className="text-[10px] text-gray-400 italic">This request is waiting for administrator review.</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    }

                                    const isExpanded = expandedBatches.includes(g.id);
                                    const overallStatus = g.items.every((i: any) => i.approval_status === 'approved') ? 'approved' : 
                                                        g.items.every((i: any) => i.approval_status === 'rejected') ? 'rejected' : 'pending';

                                    return (
                                        <Fragment key={g.id}>
                                            <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors" onClick={() => toggleBatch(g.id)}>
                                                <td className="font-bold flex items-center gap-2">
                                                    <div className={`p-0.5 rounded bg-gray-100 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-tighter italic">Unified Order</span>
                                                        <span className="text-[8px] font-bold text-gray-400 font-mono tracking-tighter">{g.id}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center font-black text-xs text-gray-500 italic">{g.items.length} Items</td>
                                                <td className="text-center">
                                                    <span className={`badge uppercase text-[8px] font-black ${
                                                        overallStatus === 'approved' ? 'badge-outline-success bg-green-50' : 
                                                        overallStatus === 'rejected' ? 'badge-outline-danger bg-red-50' : 'badge-outline-warning bg-amber-50'
                                                    }`}>{overallStatus}</span>
                                                </td>
                                                <td className="text-[10px] italic text-gray-500 max-w-[200px] truncate">{g.items[0]?.remarks || '—'}</td>
                                                <td className="text-end text-[10px] text-gray-400">{new Date(g.created_at).toLocaleDateString()}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50/30 dark:bg-gray-800/10">
                                                    <td colSpan={5} className="p-4">
                                                        <div className="bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/30 rounded-xl overflow-hidden shadow-inner">
                                                            <table className="table-sm w-full">
                                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                                    <tr>
                                                                        <th className="text-[10px] uppercase font-black">Item</th>
                                                                        <th className="text-[10px] uppercase font-black text-center">Unit Price</th>
                                                                        <th className="text-[10px] uppercase font-black text-center">Qty</th>
                                                                        <th className="text-[10px] uppercase font-black text-center">Subtotal</th>
                                                                        <th className="text-end text-[10px] uppercase font-black pr-4">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {g.items.map((it: any) => (
                                                                        <tr key={it.id} className="border-b border-gray-50 dark:border-gray-800">
                                                                            <td className="py-2 flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded bg-gray-50 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                                                                    {it.item_image ? <img src={it.item_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[6px] font-black opacity-20 uppercase">No Img</div>}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-black uppercase leading-tight">{it.item_name}</p>
                                                                                    <p className="text-[8px] font-bold text-gray-400 italic leading-none">{it.remarks || '—'}</p>
                                                                                </div>
                                                                            </td>
                                                                            <td className="text-center text-[10px] font-bold text-gray-400 italic">₹{(it.item_price || 0).toLocaleString()}</td>
                                                                            <td className="text-center text-[10px] font-black text-indigo-600 italic">x{it.requested_quantity}</td>
                                                                            <td className="text-center text-[10px] font-black text-emerald-600 italic">₹{((it.item_price || 0) * (it.requested_quantity || 1)).toLocaleString()}</td>
                                                                            <td className="text-end pr-4">
                                                                                <span className={`text-[9px] font-black uppercase ${it.approval_status === 'approved' ? 'text-green-500' : it.approval_status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>
                                                                                    {it.approval_status}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot className="bg-emerald-50/50 dark:bg-emerald-900/5">
                                                                    <tr>
                                                                        <td colSpan={3} className="text-right py-2 pr-4 text-[9px] font-black uppercase text-gray-400 italic">Combined Order Total:</td>
                                                                        <td className="text-center py-2 text-xs font-black italic text-emerald-600 tracking-tighter">
                                                                            ₹{g.items.reduce((acc: number, cur: any) => acc + (cur.item_price || 0) * (cur.requested_quantity || 1), 0).toLocaleString()}
                                                                        </td>
                                                                        <td></td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {isRequestModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center" onClick={() => setIsRequestModalOpen(false)}>
                    <div className="panel w-full max-w-4xl max-h-[95vh] overflow-auto dark:bg-[#0e1726] shadow-2xl border-0" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                            <div>
                                <h3 className="text-2xl font-black text-indigo-600 italic uppercase tracking-tighter">
                                    {requestType === 'supply' ? 'Supply Catalog' : requestType === 'core' ? 'Core Asset Request' : 'Choose Request Type'}
                                </h3>
                                <p className="text-white-dark mt-1 text-xs font-bold uppercase tracking-widest opacity-60">
                                    {requestType ? 'Fill in the details below' : 'Select the type of asset you want to request'}
                                </p>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger font-black" onClick={() => setIsRequestModalOpen(false)}>
                                Close
                            </button>
                        </div>

                        {!requestType ? (
                            /* Selection Stage */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-10">
                                <button 
                                    onClick={() => setRequestType('core')}
                                    className="group panel border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-indigo-500 transition-all p-10 flex flex-col items-center text-center gap-4 bg-gray-50/50 dark:bg-gray-900/50"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black uppercase italic">Core Assets</h4>
                                        <p className="text-sm text-gray-500 font-medium">Laptops, Monitors, Phones, etc.<br/><span className="text-[10px] opacity-70 italic">(Report issues or request replacements)</span></p>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setRequestType('supply')}
                                    className="group panel border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-all p-10 flex flex-col items-center text-center gap-4 bg-gray-50/50 dark:bg-gray-900/50"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black uppercase italic">Supply Items</h4>
                                        <p className="text-sm text-gray-500 font-medium">Stationery, Cables, Peripherals, etc.<br/><span className="text-[10px] opacity-70 italic">(Request consumables from stock)</span></p>
                                    </div>
                                </button>
                            </div>
                        ) : requestType === 'supply' ? (
                            /* Supply Catalog Stage */
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <input 
                                        className="form-input flex-1" 
                                        placeholder="Search catalog..." 
                                        value={supplySearch}
                                        onChange={(e) => setSupplySearch(e.target.value)}
                                    />
                                    <button onClick={() => setRequestType(null)} className="btn btn-outline-dark uppercase font-black text-xs">Back</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {supplyLoading ? (
                                        <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase animate-pulse italic">Scanning Stock...</div>
                                    ) : supplyItems.length === 0 ? (
                                        <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase italic">No items found matching search</div>
                                    ) : (
                                        supplyItems.map(item => {
                                            const inCart = cart.find(c => c.id === item.id);
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    onClick={() => addToCart(item)}
                                                    className={`panel cursor-pointer group transition-all relative overflow-hidden border-2 ${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-transparent hover:border-indigo-200'} ${item.available_quantity === 0 ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                                                            {item.image ? (
                                                                <img src={item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}`} className="w-full h-full object-cover" alt={item.item_name} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-400 uppercase italic">No Pic</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-black text-gray-800 dark:text-white-light truncate text-sm uppercase">{item.item_name}</h5>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase italic truncate">{item.sub_category}</p>
                                                                <span className="text-[10px] font-black text-indigo-600">₹{Number(item.unit_price || 0).toLocaleString()}</span>
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {item.available_quantity > 0 ? (
                                                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">{item.available_quantity} In Stock</span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-tighter italic">Out of Stock</span>
                                                                )}
                                                                {item.max_per_order > 0 && (
                                                                    <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Limit: {item.max_per_order}</span>
                                                                )}
                                                            </div>
                                                        </div> {/* Close flex-1 */}
                                                    </div> {/* Close flex gap-3 */}

                                                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                                                        {!inCart ? (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                                                className="btn btn-sm btn-outline-indigo w-full py-1 text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white"
                                                            >
                                                                Add to Basket
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-between w-full bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-1 animate__animated animate__fadeIn">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, -1); }}
                                                                    className="w-7 h-7 flex items-center justify-center font-black text-indigo-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all shadow-sm"
                                                                >-</button>
                                                                <span className="text-xs font-black italic text-indigo-700">{inCart.quantity}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, 1); }}
                                                                    className="w-7 h-7 flex items-center justify-center font-black text-indigo-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all shadow-sm"
                                                                >+</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {cart.length > 0 && (
                                    <div className="panel border-t-4 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-xl animate__animated animate__slideInUp">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-black uppercase italic text-emerald-600 tracking-tighter">Your Shopping Basket ({cart.length})</h4>
                                            <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 uppercase hover:underline">Clear All</button>
                                        </div>
                                        <div className="space-y-2 max-h-[200px] overflow-auto pr-2">
                                            {cart.map(item => (
                                                <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-gray-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                                                        {item.image ? (
                                                            <img src={item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}`} className="w-full h-full object-cover" />
                                                        ) : <div className="w-full h-full flex items-center justify-center text-[8px] font-black opacity-30">NO IMG</div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h6 className="font-black uppercase text-[11px] truncate">{item.item_name}</h6>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{item.category}</p>
                                                            <span className="text-[9px] font-black text-indigo-600 italic">@ ₹{item.price.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                                            <button onClick={() => updateCartQty(item.id, -1)} className="w-5 h-5 flex items-center justify-center font-black hover:text-emerald-600 text-xs">-</button>
                                                            <span className="w-6 text-center text-[11px] font-black italic">{item.quantity}</span>
                                                            <button onClick={() => updateCartQty(item.id, 1)} className="w-5 h-5 flex items-center justify-center font-black hover:text-emerald-600 text-xs">+</button>
                                                        </div>
                                                        <div className="w-16 text-right">
                                                            <p className="text-[10px] font-black text-emerald-600 tracking-tighter">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                        </div>
                                                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 flex flex-col md:flex-row items-center gap-4 border-t border-emerald-100 dark:border-emerald-900/30 pt-4">
                                            <div className="flex-1 w-full flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-black uppercase text-emerald-600 mb-1 block">Checkout Note (Reason)</label>
                                                    <input 
                                                        className="form-input text-xs" 
                                                        value={remarks} 
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        placeholder="e.g. For project X development"
                                                    />
                                                </div>
                                                <div className="text-right border-l border-emerald-100 dark:border-emerald-900/30 pl-4 min-w-[120px]">
                                                    <p className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1 tracking-tighter">Grand Total</p>
                                                    <p className="text-xl font-black italic text-emerald-600 tracking-tighter leading-none">₹{cartTotal.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={submit} 
                                                disabled={loading}
                                                className="btn btn-primary w-full md:w-auto px-10 py-3 uppercase font-black italic tracking-widest shadow-xl shadow-emerald-500/20 h-full"
                                            >
                                                {loading ? 'Sending...' : 'Place Request'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Core Asset Stage */
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black uppercase text-indigo-600 mb-2 block tracking-widest">Select Assigned Asset (Optional)</label>
                                        <select 
                                            className="form-select" 
                                            value={relatedFixedId} 
                                            onChange={(e) => setRelatedFixedId(e.target.value)}
                                        >
                                            <option value="">— Choose Asset —</option>
                                            {myAssetsLoading ? (
                                                <option disabled>Loading your assets...</option>
                                            ) : myAssets.length === 0 ? (
                                                <option disabled>No core assets assigned to you</option>
                                            ) : (
                                                myAssets.map(fa => (
                                                    <option key={fa.id} value={fa.id}>
                                                        {fa.asset_tag} — {fa.model_brand} ({fa.category})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1 italic font-bold">Select the item you are reporting an issue for.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-indigo-600 mb-2 block tracking-widest">Upload Photo (Optional)</label>
                                        <input type="file" accept="image/*" className="form-input" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-indigo-600 mb-2 block tracking-widest">Describe Issue or Request</label>
                                    <textarea 
                                        className="form-textarea" 
                                        rows={4} 
                                        value={remarks} 
                                        onChange={(e) => setRemarks(e.target.value)} 
                                        placeholder="Please provide details about the asset or what you need." 
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setRequestType(null)} className="btn btn-outline-dark uppercase font-black text-xs px-10">Back</button>
                                    <button type="submit" className="btn btn-primary px-10 py-3 uppercase font-black italic tracking-widest shadow-lg shadow-indigo-500/20">Submit Request</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeAssetRequests;

