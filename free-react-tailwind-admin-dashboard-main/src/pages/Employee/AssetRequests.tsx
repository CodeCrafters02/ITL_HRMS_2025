import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { authFetch } from '../../utils/authFetch';

import Button from '../../components/Common/Button';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
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
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

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
            url.searchParams.set('kind', activeTab);
            if (search.trim()) url.searchParams.set('search', search.trim());
            if (statusFilter) url.searchParams.set('approval_status', statusFilter);
            const res = await authFetch(url.toString(), { headers: authJsonHeaders() });
            const data = await parseList(res);
            setRows(data.results);
            setTotalCount(data.count);
        } catch (e: any) {
            setRows([]);
            setTotalCount(0);
            Swal.fire('Error', e?.message || 'Could not load requests', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, activeTab, search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

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

    const statusBadge = (status: string) => (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : status === 'rejected' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
            }`}
        >
            {status}
        </span>
    );

    // A unified order arrives as several rows sharing a batch_id; show it as one expandable line.
    const groups = useMemo(() => {
        const out: any[] = [];
        const seen = new Set<string>();
        rows.forEach((item) => {
            if (item.batch_id) {
                if (seen.has(item.batch_id)) return;
                seen.add(item.batch_id);
                const items = rows.filter((x) => x.batch_id === item.batch_id);
                out.push({ gid: `b-${item.batch_id}`, kind: 'batch', id: item.batch_id, items, created_at: item.created_at });
            } else {
                out.push({ gid: `r-${item.id}`, kind: 'single', row: item, created_at: item.created_at });
            }
        });
        return out;
    }, [rows]);

    const isOpen = (g: any) => (g.kind === 'batch' ? expandedBatches.includes(g.id) : expandedRows.includes(g.row.id));
    const toggleGroup = (g: any) => (g.kind === 'batch' ? toggleBatch(g.id) : toggleRow(g.row.id));
    const overall = (g: any) => (g.items.every((i: any) => i.approval_status === 'approved') ? 'approved' : g.items.every((i: any) => i.approval_status === 'rejected') ? 'rejected' : 'pending');

    const columns: Column<any>[] = [
        {
            key: 'order',
            title: 'Order / Type',
            render: (_v, g) => (
                <div className="flex items-center gap-2.5">
                    <span className={`rounded-md bg-slate-100 p-1 text-slate-500 transition-transform ${isOpen(g) ? 'rotate-180' : ''}`}>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                    {g.kind === 'batch' ? (
                        <div>
                            <p className="text-xs font-bold text-brand">Unified order</p>
                            <p className="font-mono text-[10px] text-slate-400">{g.id}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-bold text-slate-900">{g.row.related_fixed_asset ? 'Fixed asset request' : 'Supply request'}</p>
                            <p className="text-[10px] font-bold uppercase text-brand">{g.row.item_name}</p>
                        </div>
                    )}
                </div>
            ),
        },
        { key: 'items', title: 'Items', align: 'center', render: (_v, g) => (g.kind === 'batch' ? `${g.items.length} items` : g.row.requested_quantity || 1) },
        { key: 'status', title: 'Status', align: 'center', render: (_v, g) => statusBadge(g.kind === 'batch' ? overall(g) : g.row.approval_status) },
        { key: 'note', title: 'Note', hideBelow: 'md', render: (_v, g) => <span className="line-clamp-1 max-w-[220px] text-xs italic text-slate-500">{(g.kind === 'batch' ? g.items[0]?.remarks : g.row.remarks) || '—'}</span> },
        { key: 'created_at', title: 'Created', align: 'right', render: (_v, g) => <span className="text-xs text-slate-400">{new Date(g.created_at).toLocaleDateString()}</span> },
    ];

    const renderDetails = (g: any) => {
        if (!isOpen(g)) return null;
        if (g.kind === 'batch') {
            const total = g.items.reduce((acc: number, cur: any) => acc + (cur.item_price || 0) * (cur.requested_quantity || 1), 0);
            return (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left">Item</th>
                                <th className="px-3 py-2 text-center">Unit price</th>
                                <th className="px-3 py-2 text-center">Qty</th>
                                <th className="px-3 py-2 text-center">Subtotal</th>
                                <th className="px-3 py-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {g.items.map((it: any) => (
                                <tr key={it.id}>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100">{it.item_image && <img src={it.item_image} className="h-full w-full object-cover" />}</div>
                                            <div>
                                                <p className="font-bold uppercase leading-tight text-slate-800">{it.item_name}</p>
                                                <p className="text-[10px] italic text-slate-400">{it.remarks || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-500">₹{(it.item_price || 0).toLocaleString()}</td>
                                    <td className="px-3 py-2 text-center font-bold text-brand">x{it.requested_quantity}</td>
                                    <td className="px-3 py-2 text-center font-bold text-emerald-600">₹{((it.item_price || 0) * (it.requested_quantity || 1)).toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right">{statusBadge(it.approval_status)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-emerald-50/60">
                            <tr>
                                <td colSpan={3} className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-400">
                                    Combined order total
                                </td>
                                <td className="px-3 py-2 text-center font-extrabold text-emerald-600">₹{total.toLocaleString()}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            );
        }
        const row = g.row;
        return (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Approval details</p>
                {row.approval_status === 'approved' && row.related_fixed_asset && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-brand/15 bg-brand/5 p-3">
                            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-brand">Admin action</p>
                            <p className="text-xs font-bold uppercase italic text-brand-dark">{row.admin_action_type || 'General approval'}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Employee payment</p>
                            <p className="text-xs font-bold uppercase italic text-emerald-700">{Number(row.employee_payment_amount) > 0 ? `₹${Number(row.employee_payment_amount).toLocaleString()}` : 'NIL (covered by company)'}</p>
                        </div>
                    </div>
                )}
                {row.approval_status === 'rejected' && (
                    <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                        <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-rose-500">Reason for rejection</p>
                        <p className="text-xs italic text-rose-700">{row.remarks || 'No specific reason provided.'}</p>
                    </div>
                )}
                {!row.admin_action_type && row.approval_status === 'approved' && !row.related_fixed_asset && <p className="text-xs italic text-slate-400">No additional details for this supply request.</p>}
                {row.approval_status === 'pending' && <p className="text-xs italic text-slate-400">This request is waiting for administrator review.</p>}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Asset Requests"
                subtitle="Raise a request for a variable item or report a core asset issue."
                actions={
                    <Button onClick={() => setIsRequestModalOpen(true)}>New Request</Button>
                }
            />

            <div role="tablist" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm">
                {([['core', 'Core assets (fixed)'], ['supply', 'Supply items (variable)']] as const).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === key}
                        onClick={() => {
                            setActiveTab(key);
                            setPage(1);
                        }}
                        className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${
                            activeTab === key ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-md shadow-brand/25' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={groups}
                rowKey={(g) => g.gid}
                loading={loading}
                page={page}
                pageSize={pageSize}
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
                searchPlaceholder="Search my requests..."
                onRefresh={load}
                entityLabel="requests"
                emptyMessage={`No ${activeTab === 'core' ? 'core asset' : 'supply item'} requests found`}
                onRowClick={toggleGroup}
                renderSubRow={renderDetails}
                filters={
                    <select
                        className="form-select h-10 w-44 rounded-xl text-xs"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                }
            />

            <Modal
                open={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                dismissible={false}
                size="4xl"
                title={requestType === 'supply' ? 'Supply Catalog' : requestType === 'core' ? 'Core Asset Request' : 'Choose Request Type'}
                subtitle={requestType ? 'Fill in the details below' : 'Select the type of asset you want to request'}
            >
                <div>
                        {!requestType ? (
                            /* Selection Stage */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-10">
                                <button 
                                    onClick={() => setRequestType('core')}
                                    className="group panel border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 transition-all p-10 flex flex-col items-center text-center gap-4 bg-gray-50/50 dark:bg-gray-900/50"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
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
                                    <Button variant="secondary" onClick={() => setRequestType(null)}>Back</Button>
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
                                                    className={`panel cursor-pointer group transition-all relative overflow-hidden border-2 ${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-transparent hover:border-brand-200'} ${item.available_quantity === 0 ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
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
                                                                <span className="text-[10px] font-black text-brand-600">₹{Number(item.unit_price || 0).toLocaleString()}</span>
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
                                                            <Button variant="outline" size="sm" fullWidth onClick={(e) => { e.stopPropagation(); addToCart(item); }}>
                                                                Add to Basket
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center justify-between w-full bg-brand-50 dark:bg-brand-900/20 rounded-lg p-1 animate__animated animate__fadeIn">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, -1); }}
                                                                    className="w-7 h-7 flex items-center justify-center font-black text-brand-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all shadow-sm"
                                                                >-</button>
                                                                <span className="text-xs font-black italic text-brand-700">{inCart.quantity}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, 1); }}
                                                                    className="w-7 h-7 flex items-center justify-center font-black text-brand-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all shadow-sm"
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
                                                            <span className="text-[9px] font-black text-brand-600 italic">@ ₹{item.price.toLocaleString()}</span>
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
                                            <Button className="w-full md:w-auto !px-10 !py-3 font-black italic h-full" 
                                                onClick={submit} 
                                                disabled={loading}>
                                                {loading ? 'Sending...' : 'Place Request'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Core Asset Stage */
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black uppercase text-brand-600 mb-2 block tracking-widest">Select Assigned Asset (Optional)</label>
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
                                        <label className="text-xs font-black uppercase text-brand-600 mb-2 block tracking-widest">Upload Photo (Optional)</label>
                                        <input type="file" accept="image/*" className="form-input" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-brand-600 mb-2 block tracking-widest">Describe Issue or Request</label>
                                    <textarea 
                                        className="form-textarea" 
                                        rows={4} 
                                        value={remarks} 
                                        onChange={(e) => setRemarks(e.target.value)} 
                                        placeholder="Please provide details about the asset or what you need." 
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <Button type="button" variant="secondary" onClick={() => setRequestType(null)}>Back</Button>
                                    <Button className="!px-10 !py-3 font-black italic shadow-brand-500/20" type="submit">Submit Request</Button>
                                </div>
                            </form>
                        )}
                </div>
            </Modal>
        </div>
    );
};

export default EmployeeAssetRequests;

