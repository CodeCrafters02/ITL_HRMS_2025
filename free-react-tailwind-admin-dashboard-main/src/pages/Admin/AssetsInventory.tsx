import { Fragment, useCallback, useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import { Dialog, Transition } from '@headlessui/react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconSearch from '../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type EmployeeOpt = { id: number; employee_id: string | null; first_name: string | null; last_name: string | null };

type DocParent = { kind: 'fixed' | 'supply' | 'request'; id: number; label: string };

const authJsonHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
};

const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
};

const parseList = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || res.statusText);
    if (Array.isArray(data)) return { results: data, count: data.length };
    return { results: data.results || [], count: data.count ?? 0 };
};

const empLabel = (e: EmployeeOpt) =>
    `${(e.first_name || '').trim()} ${(e.last_name || '').trim()}`.trim() || e.employee_id || `#${e.id}`;

const AdminAssetsInventory = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
    /** Full variable (SKU) catalog for linking core assets + dropdowns */
    const [supplyCatalog, setSupplyCatalog] = useState<{ id: number; item_code: string; item_name: string }[]>([]);

    // Fixed assets
    const [faList, setFaList] = useState<any[]>([]);
    const [faPage, setFaPage] = useState(1);
    const [faSearch, setFaSearch] = useState('');
    const [faTotal, setFaTotal] = useState(0);
    const [faLoading, setFaLoading] = useState(false);
    const [faModal, setFaModal] = useState(false);
    const [faEditId, setFaEditId] = useState<number | null>(null);
    const [expandedFa, setExpandedFa] = useState<number[]>([]);
    const [faForm, setFaForm] = useState({
        asset_tag: '',
        serial_number: '',
        category: 'laptop',
        model_brand: '',
        purchase_date: '',
        cost_price: '',
        assigned_to: '' as string | number,
        assignment_date: '',
        warranty_expiry: '',
        status: 'available',
        notes: '',
        variable_supply_item: '' as string | number,
    });

    // Supply
    const [siList, setSiList] = useState<any[]>([]);
    const [siPage, setSiPage] = useState(1);
    const [siSearch, setSiSearch] = useState('');
    const [siTotal, setSiTotal] = useState(0);
    const [siLoading, setSiLoading] = useState(false);
    const [siModal, setSiModal] = useState(false);
    const [siEditId, setSiEditId] = useState<number | null>(null);
    const [siForm, setSiForm] = useState({
        item_code: '',
        item_name: '',
        sub_category: 'peripherals',
        total_stock: 0,
        available_quantity: 0,
        reorder_level: 0,
        unit_price: '',
        last_restocked: '',
        vendor_details: '',
        unit_of_measure: 'pcs',
        max_per_order: 10,
        notes: '',
    });
    const [siImage, setSiImage] = useState<File | null>(null);

    // Requests
    const [arList, setArList] = useState<any[]>([]);
    const [arPage, setArPage] = useState(1);
    const [arSearch, setArSearch] = useState('');
    const [arTotal, setArTotal] = useState(0);
    const [arLoading, setArLoading] = useState(false);
    const [arStatusFilter, setArStatusFilter] = useState('pending');
    const [arModal, setArModal] = useState(false);
    const [arEditId, setArEditId] = useState<number | null>(null);
    const [arForm, setArForm] = useState({
        requested_by: '' as string | number,
        approval_status: 'pending',
        remarks: '',
        related_fixed_asset: '' as string | number,
        related_supply_item: '' as string | number,
    });
    const [arImage, setArImage] = useState<File | null>(null);
    const [approvalModal, setApprovalModal] = useState(false);
    const [approvalData, setApprovalData] = useState({
        batchId: '',
        admin_action_type: 'repair',
        employee_payment_amount: 0,
    });

    const [expandedBatches, setExpandedBatches] = useState<string[]>([]);

    const toggleBatch = (bid: string) => {
        setExpandedBatches((prev) => (prev.includes(bid) ? prev.filter((b) => b !== bid) : [...prev, bid]));
    };

    const processBatch = async (batchId: string, status: string, details?: any) => {
        // If approving any asset request, we might need extra details (payment/action type)
        if (status === 'approved' && !details) {
            const batch = arList.filter(x => x.batch_id === batchId || String(x.id) === batchId);
            const isCore = batch.some(x => x.related_fixed_asset);
            const supplySubtotal = batch.reduce((acc, cur) => acc + (cur.related_supply_item ? (cur.requested_quantity * (cur.item_price || 0)) : 0), 0);
            
            setApprovalData({
                batchId,
                admin_action_type: isCore ? 'repair' : 'other',
                employee_payment_amount: supplySubtotal, // Default to subtotal for supply items
            });
            setApprovalModal(true);
            return;
        }

        try {
            const body: any = { batch_id: batchId, status };
            if (details) {
                body.admin_action_type = details.admin_action_type;
                body.employee_payment_amount = details.employee_payment_amount;
            }

            const res = await fetch(`${API_BASE_URL}/app/asset-requests/batch-action/`, {
                method: 'POST',
                headers: authJsonHeaders(),
                body: JSON.stringify(body),
            });
            if (res.ok) {
                Swal.fire('Success', `Batch ${batchId} updated to ${status}.`, 'success');
                setApprovalModal(false);
                fetchRequests();
            } else {
                const data = await res.json();
                Swal.fire('Error', data.detail || 'Failed to update batch.', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'An unexpected error occurred.', 'error');
        }
    };

    // Documents
    const [docParent, setDocParent] = useState<DocParent | null>(null);
    const [docList, setDocList] = useState<any[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Assets & Inventory'));
    }, [dispatch]);

    const loadEmployees = useCallback(async () => {
        try {
            const url = new URL(`${API_BASE_URL}/app/employee/`);
            url.searchParams.set('page_size', '500');
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results } = await parseList(res);
            setEmployees(results as EmployeeOpt[]);
        } catch {
            setEmployees([]);
        }
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const loadSupplyCatalog = useCallback(async () => {
        try {
            const url = new URL(`${API_BASE_URL}/app/supply-items/`);
            url.searchParams.set('page_size', '500');
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results } = await parseList(res);
            setSupplyCatalog(
                (results as any[]).map((r) => ({ id: r.id, item_code: r.item_code, item_name: r.item_name }))
            );
        } catch {
            setSupplyCatalog([]);
        }
    }, []);

    useEffect(() => {
        loadSupplyCatalog();
    }, [loadSupplyCatalog]);

    const fetchFixed = useCallback(async () => {
        setFaLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/fixed-assets/`);
            url.searchParams.set('page', String(faPage));
            url.searchParams.set('page_size', '10');
            if (faSearch) url.searchParams.set('search', faSearch);
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results, count } = await parseList(res);
            setFaList(results);
            setFaTotal(count);
        } catch (e) {
            console.error(e);
            setFaList([]);
        } finally {
            setFaLoading(false);
        }
    }, [faPage, faSearch]);

    const fetchSupply = useCallback(async () => {
        setSiLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/supply-items/`);
            url.searchParams.set('page', String(siPage));
            url.searchParams.set('page_size', '10');
            if (siSearch) url.searchParams.set('search', siSearch);
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results, count } = await parseList(res);
            setSiList(results);
            setSiTotal(count);
        } catch (e) {
            console.error(e);
            setSiList([]);
        } finally {
            setSiLoading(false);
        }
    }, [siPage, siSearch]);

    const fetchRequests = useCallback(async () => {
        setArLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/asset-requests/`);
            url.searchParams.set('page', String(arPage));
            url.searchParams.set('page_size', '10');
            if (arSearch) url.searchParams.set('search', arSearch);
            if (arStatusFilter) url.searchParams.set('approval_status', arStatusFilter);
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results, count } = await parseList(res);
            setArList(results);
            setArTotal(count);
        } catch (e) {
            console.error(e);
            setArList([]);
        } finally {
            setArLoading(false);
        }
    }, [arPage, arSearch, arStatusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchFixed, 300);
        return () => clearTimeout(t);
    }, [fetchFixed]);

    useEffect(() => {
        const t = setTimeout(fetchSupply, 300);
        return () => clearTimeout(t);
    }, [fetchSupply]);

    useEffect(() => {
        const t = setTimeout(fetchRequests, 300);
        return () => clearTimeout(t);
    }, [fetchRequests]);

    const openDocs = async (p: DocParent) => {
        setDocParent(p);
        setDocTitle('');
        setDocFile(null);
        setDocLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/asset-documents/`);
            if (p.kind === 'fixed') url.searchParams.set('fixed_asset', String(p.id));
            if (p.kind === 'supply') url.searchParams.set('supply_item', String(p.id));
            if (p.kind === 'request') url.searchParams.set('asset_request', String(p.id));
            url.searchParams.set('page_size', '100');
            const res = await fetch(url.toString(), { headers: authJsonHeaders() });
            const { results } = await parseList(res);
            setDocList(results);
        } catch {
            setDocList([]);
        } finally {
            setDocLoading(false);
        }
    };

    const uploadDoc = async () => {
        if (!docParent || !docFile) {
            Swal.fire('Select a file', '', 'warning');
            return;
        }
        const fd = new FormData();
        fd.append('file', docFile);
        if (docTitle) fd.append('title', docTitle);
        if (docParent.kind === 'fixed') fd.append('fixed_asset', String(docParent.id));
        if (docParent.kind === 'supply') fd.append('supply_item', String(docParent.id));
        if (docParent.kind === 'request') fd.append('asset_request', String(docParent.id));
        try {
            const res = await fetch(`${API_BASE_URL}/app/asset-documents/`, {
                method: 'POST',
                headers: authHeaders(),
                body: fd,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || 'Upload failed');
            Swal.fire('Uploaded', '', 'success');
            setDocFile(null);
            setDocTitle('');
            await openDocs(docParent);
        } catch (e: any) {
            Swal.fire('Error', e.message || 'Upload failed', 'error');
        }
    };

    const deleteDoc = async (id: number) => {
        const c = await Swal.fire({ title: 'Delete document?', showCancelButton: true, icon: 'question' });
        if (!c.isConfirmed) return;
        try {
            const res = await fetch(`${API_BASE_URL}/app/asset-documents/${id}/`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error();
            if (docParent) await openDocs(docParent);
        } catch {
            Swal.fire('Error', 'Could not delete', 'error');
        }
    };

    const resetFa = () => {
        setFaEditId(null);
        setFaForm({
            asset_tag: '',
            serial_number: '',
            category: 'laptop',
            model_brand: '',
            purchase_date: '',
            cost_price: '',
            assigned_to: '',
            assignment_date: '',
            warranty_expiry: '',
            status: 'available',
            notes: '',
            variable_supply_item: '',
        });
    };

    const saveFa = async (e: React.FormEvent) => {
        e.preventDefault();
        const body: any = {
            asset_tag: faForm.asset_tag.trim(),
            serial_number: faForm.serial_number.trim() || null,
            category: faForm.category,
            model_brand: faForm.model_brand.trim() || null,
            purchase_date: faForm.purchase_date || null,
            cost_price: faForm.cost_price ? Number(faForm.cost_price) : null,
            assignment_date: faForm.assignment_date || null,
            warranty_expiry: faForm.warranty_expiry || null,
            status: faForm.status,
            notes: faForm.notes.trim() || null,
        };
        if (faForm.assigned_to === '' || faForm.assigned_to === null) body.assigned_to = null;
        else body.assigned_to = Number(faForm.assigned_to);
        if (faForm.variable_supply_item !== '' && faForm.variable_supply_item !== null) {
            body.variable_supply_item = Number(faForm.variable_supply_item);
        }
        try {
            const url = faEditId ? `${API_BASE_URL}/app/fixed-assets/${faEditId}/` : `${API_BASE_URL}/app/fixed-assets/`;
            const res = await fetch(url, {
                method: faEditId ? 'PATCH' : 'POST',
                headers: authJsonHeaders(),
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : JSON.stringify(data));
            Swal.fire('Saved', '', 'success');
            setFaModal(false);
            resetFa();
            fetchFixed();
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Save failed', 'error');
        }
    };

    const deleteFa = async (id: number) => {
        const c = await Swal.fire({ title: 'Delete this fixed asset?', showCancelButton: true, icon: 'warning' });
        if (!c.isConfirmed) return;
        const res = await fetch(`${API_BASE_URL}/app/fixed-assets/${id}/`, { method: 'DELETE', headers: authJsonHeaders() });
        if (res.ok) fetchFixed();
        else Swal.fire('Error', 'Could not delete', 'error');
    };

    const resetSi = () => {
        setSiEditId(null);
        setSiImage(null);
        setSiForm({
            item_code: '',
            item_name: '',
            sub_category: 'peripherals',
            total_stock: 0,
            available_quantity: 0,
            reorder_level: 0,
            max_per_order: 10,
            unit_price: '',
            last_restocked: '',
            vendor_details: '',
            unit_of_measure: 'pcs',
            notes: '',
        });
    };

    const saveSi = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = siEditId ? `${API_BASE_URL}/app/supply-items/${siEditId}/` : `${API_BASE_URL}/app/supply-items/`;
            let res: Response;
            if (siEditId && !siImage) {
                const body: any = {
                    item_code: siForm.item_code.trim(),
                    item_name: siForm.item_name.trim(),
                    sub_category: siForm.sub_category,
                    total_stock: Number(siForm.total_stock),
                    available_quantity: Number(siForm.available_quantity),
                    reorder_level: Number(siForm.reorder_level),
                    max_per_order: Number(siForm.max_per_order),
                    unit_price: siForm.unit_price ? Number(siForm.unit_price) : null,
                    last_restocked: siForm.last_restocked || null,
                    vendor_details: siForm.vendor_details.trim() || null,
                    unit_of_measure: siForm.unit_of_measure,
                    notes: siForm.notes.trim() || null,
                };
                res = await fetch(url, {
                    method: 'PATCH',
                    headers: authJsonHeaders(),
                    body: JSON.stringify(body),
                });
            } else {
                const fd = new FormData();
                fd.append('item_code', siForm.item_code.trim());
                fd.append('item_name', siForm.item_name.trim());
                fd.append('sub_category', siForm.sub_category);
                fd.append('total_stock', String(siForm.total_stock));
                fd.append('available_quantity', String(siForm.available_quantity));
                fd.append('reorder_level', String(siForm.reorder_level));
                if (siForm.unit_price) fd.append('unit_price', String(siForm.unit_price));
                if (siForm.last_restocked) fd.append('last_restocked', siForm.last_restocked);
                if (siForm.vendor_details) fd.append('vendor_details', siForm.vendor_details.trim());
                fd.append('unit_of_measure', siForm.unit_of_measure);
                fd.append('max_per_order', String(siForm.max_per_order));
                if (siForm.notes) fd.append('notes', siForm.notes.trim());
                if (siImage) fd.append('image', siImage);

                res = await fetch(url, {
                    method: siEditId ? 'PATCH' : 'POST',
                    headers: authHeaders(),
                    body: fd,
                });
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : JSON.stringify(data));
            Swal.fire('Saved', '', 'success');
            setSiModal(false);
            resetSi();
            fetchSupply();
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Save failed', 'error');
        }
    };

    const deleteSi = async (id: number) => {
        const c = await Swal.fire({ title: 'Delete this supply item?', showCancelButton: true, icon: 'warning' });
        if (!c.isConfirmed) return;
        const res = await fetch(`${API_BASE_URL}/app/supply-items/${id}/`, { method: 'DELETE', headers: authJsonHeaders() });
        if (res.ok) fetchSupply();
        else Swal.fire('Error', 'Could not delete', 'error');
    };

    const resetAr = () => {
        setArEditId(null);
        setArImage(null);
        setArForm({
            requested_by: '',
            approval_status: 'pending',
            remarks: '',
            related_fixed_asset: '',
            related_supply_item: '',
        });
    };

    const saveAr = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!arEditId && !arForm.requested_by) {
            Swal.fire('Select employee', '', 'warning');
            return;
        }
        try {
            const url = arEditId ? `${API_BASE_URL}/app/asset-requests/${arEditId}/` : `${API_BASE_URL}/app/asset-requests/`;
            let res: Response;
            if (arEditId && !arImage) {
                const body: Record<string, unknown> = {
                    approval_status: arForm.approval_status,
                    remarks: arForm.remarks || null,
                };
                if (arForm.related_fixed_asset === '' || arForm.related_fixed_asset === null) body.related_fixed_asset = null;
                else body.related_fixed_asset = Number(arForm.related_fixed_asset);
                if (arForm.related_supply_item === '' || arForm.related_supply_item === null) body.related_supply_item = null;
                else body.related_supply_item = Number(arForm.related_supply_item);
                res = await fetch(url, { method: 'PATCH', headers: authJsonHeaders(), body: JSON.stringify(body) });
            } else {
                const fd = new FormData();
                if (!arEditId) fd.append('requested_by', String(arForm.requested_by));
                fd.append('approval_status', arForm.approval_status);
                if (arForm.remarks) fd.append('remarks', arForm.remarks);
                if (arForm.related_fixed_asset) fd.append('related_fixed_asset', String(arForm.related_fixed_asset));
                if (arForm.related_supply_item) fd.append('related_supply_item', String(arForm.related_supply_item));
                if (arImage) fd.append('image', arImage);
                res = await fetch(url, { method: arEditId ? 'PATCH' : 'POST', headers: authHeaders(), body: fd });
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : JSON.stringify(data));
            Swal.fire('Saved', '', 'success');
            setArModal(false);
            resetAr();
            fetchRequests();
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Save failed', 'error');
        }
    };

    const deleteAr = async (id: number) => {
        const c = await Swal.fire({ title: 'Delete this request?', showCancelButton: true, icon: 'warning' });
        if (!c.isConfirmed) return;
        const res = await fetch(`${API_BASE_URL}/app/asset-requests/${id}/`, { method: 'DELETE', headers: authJsonHeaders() });
        if (res.ok) fetchRequests();
        else Swal.fire('Error', 'Could not delete', 'error');
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="bg-gradient-to-r from-[#0e1726] to-[#3b82f6] p-6 rounded-xl shadow-lg mb-2 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Assets &amp; Inventory</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        Core (serialized) units, variable SKU catalog (supply stack), and requests. Link a core asset to a variable SKU when they match.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="panel">
                <Tab.Group>
                    <Tab.List className="flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                        {['Core assets', 'Variable (supply stack)', 'Requests'].map((label) => (
                            <Tab key={label} as={Fragment}>
                                {({ selected }) => (
                                    <button
                                        type="button"
                                        className={`${
                                            selected
                                                ? '!border-white-light !border-b-white text-primary !outline-none dark:!border-[#191e3a] dark:!border-b-black'
                                                : ''
                                        } -mb-[1px] block border border-transparent p-3.5 py-2 hover:text-primary dark:hover:border-b-black`}
                                    >
                                        {label}
                                    </button>
                                )}
                            </Tab>
                        ))}
                    </Tab.List>
                    <Tab.Panels className="pt-5">
                        <Tab.Panel>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div className="relative flex-1 min-w-[200px] max-w-md">
                                    <input
                                        className="form-input pl-10"
                                        placeholder="Search tag, serial, model..."
                                        value={faSearch}
                                        onChange={(e) => {
                                            setFaSearch(e.target.value);
                                            setFaPage(1);
                                        }}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <IconSearch className="w-4 h-4" />
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary gap-2"
                                    onClick={() => {
                                        resetFa();
                                        setFaModal(true);
                                    }}
                                >
                                    <IconPlus /> Add fixed asset
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Tag</th>
                                            <th>Category</th>
                                            <th>Model</th>
                                            <th>Status</th>
                                            <th>Assigned To</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {faLoading ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-gray-500">
                                                    Loading…
                                                </td>
                                            </tr>
                                        ) : faList.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-gray-500">
                                                    No fixed assets yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            faList.map((row) => (
                                                <Fragment key={row.id}>
                                                    <tr className={expandedFa.includes(row.id) ? 'bg-gray-50/50 dark:bg-white-dark/5' : ''}>
                                                        <td className="font-semibold">
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-transform ${expandedFa.includes(row.id) ? 'rotate-180' : ''}`}
                                                                    onClick={() => setExpandedFa(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                                </button>
                                                                {row.asset_tag}
                                                            </div>
                                                        </td>
                                                        <td className="text-sm font-semibold">{row.category}</td>
                                                        <td>{row.model_brand || '—'}</td>
                                                        <td>
                                                            <span className={`badge uppercase text-[9px] font-black ${
                                                                row.status === 'available' ? 'badge-outline-success' :
                                                                row.status === 'in_use' ? 'badge-outline-primary' :
                                                                row.status === 'repair' ? 'badge-outline-warning' : 'badge-outline-danger'
                                                            }`}>{row.status}</span>
                                                        </td>
                                                        <td>
                                                            {row.assigned_to_name ? (
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold">{row.assigned_to_name}</span>
                                                                    <span className="text-[10px] text-gray-400 font-mono">ID: {row.assignee_emp_id || 'N/A'}</span>
                                                                </div>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm"
                                                                    onClick={() =>
                                                                        openDocs({
                                                                            kind: 'fixed',
                                                                            id: row.id,
                                                                            label: row.asset_tag,
                                                                        })
                                                                    }
                                                                >
                                                                    Docs
                                                                </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm p-2"
                                                                onClick={() => {
                                                                    setFaEditId(row.id);
                                                                    setFaForm({
                                                                        asset_tag: row.asset_tag || '',
                                                                        serial_number: row.serial_number || '',
                                                                        category: row.category || 'other',
                                                                        model_brand: row.model_brand || '',
                                                                        purchase_date: row.purchase_date || '',
                                                                        cost_price: row.cost_price != null ? String(row.cost_price) : '',
                                                                        assigned_to: row.assigned_to && typeof row.assigned_to === 'object' ? row.assigned_to.id : (row.assigned_to ?? ''),
                                                                        assignment_date: row.assignment_date || '',
                                                                        warranty_expiry: row.warranty_expiry || '',
                                                                        status: row.status || 'available',
                                                                        notes: row.notes || '',
                                                                        variable_supply_item: row.variable_supply_item && typeof row.variable_supply_item === 'object' ? row.variable_supply_item.id : (row.variable_supply_item ?? ''),
                                                                    });
                                                                    setFaModal(true);
                                                                }}
                                                            >
                                                                <IconPencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm p-2"
                                                                onClick={() => deleteFa(row.id)}
                                                            >
                                                                <IconTrashLines className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedFa.includes(row.id) && (
                                                    <tr>
                                                        <td colSpan={6} className="p-0 border-0">
                                                            <div className="bg-gray-50 dark:bg-white-dark/5 p-4 border-l-4 border-primary">
                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-black text-gray-400">Serial Number</p>
                                                                        <p className="font-bold text-sm">{row.serial_number || '—'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-black text-gray-400">Purchase Date</p>
                                                                        <p className="font-bold text-sm">{row.purchase_date || '—'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-black text-gray-400">Cost Price</p>
                                                                        <p className="font-bold text-sm text-green-600">
                                                                            {row.cost_price ? `$${Number(row.cost_price).toLocaleString()}` : '—'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-black text-gray-400">Warranty Expiry</p>
                                                                        <p className="font-bold text-sm text-orange-600">{row.warranty_expiry || '—'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3">
                                                                    <p className="text-[10px] uppercase font-black text-gray-400">Assignment Info</p>
                                                                    <p className="text-sm">
                                                                        Assigned on <span className="font-bold">{row.assignment_date || '—'}</span> 
                                                                        {row.assigned_to_name && <> to <span className="font-bold text-primary">{row.assigned_to_name}</span></>}
                                                                    </p>
                                                                </div>
                                                                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                                    <p className="text-[10px] uppercase font-black text-gray-400">Notes</p>
                                                                    <p className="text-sm italic">{row.notes || 'No notes available'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                <span>
                                    Total: {faTotal} — Page {faPage} / {Math.max(1, Math.ceil(faTotal / 10))}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" className="btn btn-outline-primary btn-sm" disabled={faPage <= 1} onClick={() => setFaPage((p) => p - 1)}>
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        disabled={faPage >= Math.max(1, Math.ceil(faTotal / 10))}
                                        onClick={() => setFaPage((p) => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Tab.Panel>

                        <Tab.Panel>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div className="relative flex-1 min-w-[200px] max-w-md">
                                    <input
                                        className="form-input pl-10"
                                        placeholder="Search code, name, vendor..."
                                        value={siSearch}
                                        onChange={(e) => {
                                            setSiSearch(e.target.value);
                                            setSiPage(1);
                                        }}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <IconSearch className="w-4 h-4" />
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary gap-2"
                                    onClick={() => {
                                        resetSi();
                                        setSiModal(true);
                                    }}
                                >
                                    <IconPlus /> Add supply item
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Sub-category</th>
                                            <th>Avail / Total</th>
                                            <th>Reorder</th>
                                            <th>Unit price</th>
                                            <th>Last restocked</th>
                                            <th>Vendor</th>
                                            <th>UoM</th>
                                            <th>Max/Ord</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {siLoading ? (
                                            <tr>
                                                <td colSpan={10} className="text-center py-8">
                                                    Loading…
                                                </td>
                                            </tr>
                                        ) : siList.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center py-8 text-gray-500">
                                                    No supply items.
                                                </td>
                                            </tr>
                                        ) : (
                                            siList.map((row) => (
                                                <tr key={row.id}>
                                                    <td className="py-2">
                                                        {row.image ? (
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                                                                <img 
                                                                    src={row.image.startsWith('http') ? row.image : `${API_BASE_URL}${row.image}`} 
                                                                    className="w-full h-full object-cover" 
                                                                    alt={row.item_name}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700">
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">No Pic</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="font-semibold">{row.item_code}</td>
                                                    <td>{row.item_name}</td>
                                                    <td className="text-sm text-gray-600 dark:text-gray-400">{row.sub_category || '—'}</td>
                                                    <td>
                                                        {row.available_quantity} / {row.total_stock}
                                                        {row.reorder_level > 0 && row.available_quantity <= row.reorder_level ? (
                                                            <span className="ml-2 badge badge-outline-warning">Low</span>
                                                        ) : null}
                                                    </td>
                                                    <td>{row.reorder_level}</td>
                                                    <td>{row.unit_price ?? '—'}</td>
                                                    <td className="text-sm text-gray-600 dark:text-gray-400">{row.last_restocked || '—'}</td>
                                                    <td className="max-w-[180px] truncate text-sm text-gray-600 dark:text-gray-400" title={row.vendor_details || ''}>
                                                        {row.vendor_details || '—'}
                                                    </td>
                                                    <td className="text-sm text-gray-600 dark:text-gray-400">{row.unit_of_measure || '—'}</td>
                                                    <td className="font-bold text-red-600">{row.max_per_order || 10}</td>
                                                    <td className="text-end">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() =>
                                                                    openDocs({ kind: 'supply', id: row.id, label: row.item_code })
                                                                }
                                                            >
                                                                Docs
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm p-2"
                                                                onClick={() => {
                                                                    setSiEditId(row.id);
                                                                    setSiForm({
                                                                        item_code: row.item_code || '',
                                                                        item_name: row.item_name || '',
                                                                        sub_category: row.sub_category || 'other',
                                                                        total_stock: row.total_stock ?? 0,
                                                                        available_quantity: row.available_quantity ?? 0,
                                                                        reorder_level: row.reorder_level ?? 0,
                                                                        unit_price: row.unit_price != null ? String(row.unit_price) : '',
                                                                        last_restocked: row.last_restocked || '',
                                                                        vendor_details: row.vendor_details || '',
                                                                        unit_of_measure: row.unit_of_measure || 'pcs',
                                                                        max_per_order: row.max_per_order ?? 10,
                                                                        notes: row.notes || '',
                                                                    });
                                                                    setSiModal(true);
                                                                }}
                                                            >
                                                                <IconPencil className="w-4 h-4" />
                                                            </button>
                                                            <button type="button" className="btn btn-outline-danger btn-sm p-2" onClick={() => deleteSi(row.id)}>
                                                                <IconTrashLines className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                <span>
                                    Total: {siTotal} — Page {siPage} / {Math.max(1, Math.ceil(siTotal / 10))}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" className="btn btn-outline-primary btn-sm" disabled={siPage <= 1} onClick={() => setSiPage((p) => p - 1)}>
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        disabled={siPage >= Math.max(1, Math.ceil(siTotal / 10))}
                                        onClick={() => setSiPage((p) => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Tab.Panel>

                        <Tab.Panel>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <input
                                            className="form-input pl-10"
                                            placeholder="Search remarks, status..."
                                            value={arSearch}
                                            onChange={(e) => {
                                                setArSearch(e.target.value);
                                                setArPage(1);
                                            }}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <IconSearch className="w-4 h-4" />
                                        </span>
                                    </div>
                                    <select 
                                        className="form-select w-auto font-black uppercase text-[10px] italic tracking-tighter"
                                        value={arStatusFilter}
                                        onChange={(e) => {
                                            setArStatusFilter(e.target.value);
                                            setArPage(1);
                                        }}
                                    >
                                        <option value="pending">Pending Orders</option>
                                        <option value="approved">Approved History</option>
                                        <option value="rejected">Rejected History</option>
                                        <option value="">All Requests</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary gap-2"
                                    onClick={() => {
                                        resetAr();
                                        setArModal(true);
                                    }}
                                >
                                    <IconPlus /> New request
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Employee / Order ID</th>
                                            <th className="text-center">Order Summary</th>
                                            <th className="text-center">Overall Status</th>
                                            <th>Note Preview</th>
                                            <th className="text-end">Batch Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {arLoading ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8">Loading…</td>
                                            </tr>
                                        ) : arList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-gray-500">No requests.</td>
                                            </tr>
                                        ) : (() => {
                                            // Grouping arList into batches in the UI
                                            const groups: any[] = [];
                                            const seen = new Set();
                                            arList.forEach(item => {
                                                if (item.batch_id && !seen.has(item.batch_id)) {
                                                    seen.add(item.batch_id);
                                                    const items = arList.filter(x => x.batch_id === item.batch_id);
                                                    groups.push({ ...item, type: 'batch', id: item.batch_id, items });
                                                } else if (!item.batch_id) {
                                                    groups.push({ type: 'single', data: item });
                                                }
                                            });

                                            return groups.map((g) => {
                                                if (g.type === 'single') {
                                                    const row = g.data;
                                                    return (
                                                        <tr key={row.id}>
                                                            <td>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold">{row.requested_by_name || row.requested_by}</span>
                                                                    <span className="text-[10px] text-gray-400 font-mono">ID: {row.requester_emp_id || 'N/A'}</span>
                                                                    <span className="text-[10px] text-gray-300 font-normal italic">(Direct Asset Request)</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-center font-black">1</td>
                                                            <td className="text-center">
                                                                <span className={`badge uppercase text-[9px] font-black ${
                                                                    row.approval_status === 'approved' ? 'badge-outline-success' : 
                                                                    row.approval_status === 'rejected' ? 'badge-outline-danger' : 'badge-outline-warning'
                                                                }`}>{row.approval_status}</span>
                                                            </td>
                                                            <td className="text-xs italic text-gray-500 truncate max-w-[200px]">{row.remarks || '—'}</td>
                                                            <td className="text-end">
                                                                <div className="flex justify-end gap-1">
                                                                    <button onClick={() => processBatch(row.batch_id || String(row.id), 'approved')} className="btn btn-sm btn-outline-success p-1 text-[10px] uppercase font-black">Approve</button>
                                                                    <button onClick={() => processBatch(row.batch_id || String(row.id), 'rejected')} className="btn btn-sm btn-outline-danger p-1 text-[10px] uppercase font-black">Reject</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                const isExpanded = expandedBatches.includes(g.id);
                                                const overallStatus = g.items.every((i: any) => i.approval_status === 'approved') ? 'approved' : 
                                                                    g.items.every((i: any) => i.approval_status === 'rejected') ? 'rejected' : 'pending';

                                                return (
                                                    <Fragment key={g.id}>
                                                        <tr 
                                                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                                                            onClick={() => toggleBatch(g.id)}
                                                        >
                                                            <td className="font-bold flex items-center gap-3">
                                                                <div className={`p-1 rounded bg-indigo-100 text-indigo-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-indigo-600 uppercase tracking-tighter">{g.requested_by_name || g.requested_by}</span>
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-[9px] font-bold text-gray-400 font-mono italic">Order: {g.id}</span>
                                                                        <span className="text-[9px] font-bold text-indigo-400 font-mono">ID: {g.requester_emp_id || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center font-black text-xs text-gray-500 italic">{g.items.length} Items</td>
                                                            <td className="text-center">
                                                                <span className={`badge uppercase text-[9px] font-black ${
                                                                    overallStatus === 'approved' ? 'badge-outline-success bg-green-50' : 
                                                                    overallStatus === 'rejected' ? 'badge-outline-danger bg-red-50' : 'badge-outline-warning bg-amber-50'
                                                                }`}>{overallStatus}</span>
                                                            </td>
                                                            <td className="text-xs italic text-gray-500 truncate max-w-[200px]">{g.items[0]?.remarks || '—'}</td>
                                                            <td className="text-end">
                                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                                    <button 
                                                                        onClick={() => processBatch(g.id, 'approved')}
                                                                        className="btn btn-sm btn-success px-3 py-1 text-[9px] uppercase font-black italic tracking-widest shadow-md"
                                                                    >Approve Order</button>
                                                                    <button 
                                                                        onClick={() => processBatch(g.id, 'rejected')}
                                                                        className="btn btn-sm btn-danger px-3 py-1 text-[9px] uppercase font-black italic tracking-widest shadow-md"
                                                                    >Reject Order</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="animate__animated animate__fadeIn">
                                                                <td colSpan={5} className="p-0">
                                                                    <div className="bg-white dark:bg-gray-900 border-x border-b border-indigo-100 dark:border-indigo-900/30 p-4 shadow-inner">
                                                                        <table className="table-sm w-full">
                                                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                                                <tr>
                                                                                    <th className="text-[10px] uppercase font-black">Item Preview</th>
                                                                                    <th className="text-[10px] uppercase font-black">Catalog Name</th>
                                                                                    <th className="text-[10px] uppercase font-black text-center">Unit Price</th>
                                                                                    <th className="text-[10px] uppercase font-black text-center">Qty</th>
                                                                                    <th className="text-[10px] uppercase font-black text-center">Subtotal</th>
                                                                                    <th className="text-[10px] uppercase font-black text-center">Individual Status</th>
                                                                                    <th className="text-end text-[10px] uppercase font-black pr-4">Item Action</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {g.items.map((it: any) => (
                                                                                    <tr key={it.id} className="border-b border-gray-50 dark:border-gray-800">
                                                                                        <td className="py-2">
                                                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                                                                                                {it.item_image ? <img src={it.item_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[7px] font-black opacity-30">NO IMAGE</div>}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td>
                                                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{it.item_name}</p>
                                                                                            <p className="text-[9px] font-bold text-gray-400 uppercase italic leading-none">{it.remarks || '—'}</p>
                                                                                        </td>
                                                                                        <td className="text-center text-xs font-bold text-gray-400 italic">₹{(it.item_price || 0).toLocaleString()}</td>
                                                                                        <td className="text-center font-black italic text-indigo-600">x{it.requested_quantity || 1}</td>
                                                                                        <td className="text-center text-xs font-black text-emerald-600 italic">₹{((it.item_price || 0) * (it.requested_quantity || 1)).toLocaleString()}</td>
                                                                                        <td className="text-center">
                                                                                            <span className={`badge uppercase text-[8px] font-black ${it.approval_status === 'approved' ? 'text-green-500' : it.approval_status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>
                                                                                                {it.approval_status}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="text-end pr-4">
                                                                                            <button 
                                                                                                onClick={() => deleteAr(it.id)}
                                                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                                                            ><IconTrashLines className="w-4 h-4" /></button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                            <tfoot className="bg-emerald-50/50 dark:bg-emerald-900/5">
                                                                                <tr>
                                                                                    <td colSpan={4} className="text-right py-3 pr-4 text-[10px] font-black uppercase text-gray-400 italic">Combined Order Total:</td>
                                                                                    <td className="text-center py-3 text-sm font-black italic text-emerald-600 tracking-tighter">
                                                                                        ₹{g.items.reduce((acc: number, cur: any) => acc + (cur.item_price || 0) * (cur.requested_quantity || 1), 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td colSpan={2}></td>
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
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                <span>
                                    Total: {arTotal} — Page {arPage} / {Math.max(1, Math.ceil(arTotal / 10))}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" className="btn btn-outline-primary btn-sm" disabled={arPage <= 1} onClick={() => setArPage((p) => p - 1)}>
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        disabled={arPage >= Math.max(1, Math.ceil(arTotal / 10))}
                                        onClick={() => setArPage((p) => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>

            {/* Fixed asset modal */}
            <Transition show={faModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setFaModal(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel w-full max-w-lg overflow-hidden rounded-lg p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <h5 className="text-lg font-bold">{faEditId ? 'Edit' : 'Add'} fixed asset</h5>
                                        <button type="button" className="text-gray-400 hover:text-gray-800" onClick={() => setFaModal(false)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    <form onSubmit={saveFa} className="p-5 space-y-3">
                                        <div>
                                            <label className="form-label">Asset tag</label>
                                            <input className="form-input" required value={faForm.asset_tag} onChange={(e) => setFaForm({ ...faForm, asset_tag: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Serial</label>
                                                <input className="form-input" value={faForm.serial_number} onChange={(e) => setFaForm({ ...faForm, serial_number: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Category</label>
                                                <select className="form-select" value={faForm.category} onChange={(e) => setFaForm({ ...faForm, category: e.target.value })}>
                                                    {['laptop', 'monitor', 'server', 'furniture', 'other'].map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Model / brand</label>
                                            <input className="form-input" value={faForm.model_brand} onChange={(e) => setFaForm({ ...faForm, model_brand: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Purchase date</label>
                                                <input type="date" className="form-input" value={faForm.purchase_date} onChange={(e) => setFaForm({ ...faForm, purchase_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Cost</label>
                                                <input type="number" step="0.01" className="form-input" value={faForm.cost_price} onChange={(e) => setFaForm({ ...faForm, cost_price: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Warranty expiry</label>
                                                <input type="date" className="form-input" value={faForm.warranty_expiry} onChange={(e) => setFaForm({ ...faForm, warranty_expiry: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Status</label>
                                                <select className="form-select" value={faForm.status} onChange={(e) => setFaForm({ ...faForm, status: e.target.value })}>
                                                    {['available', 'in_use', 'repair', 'scrapped'].map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Assigned to</label>
                                            <select
                                                className="form-select"
                                                value={faForm.assigned_to === '' ? '' : String(faForm.assigned_to)}
                                                onChange={(e) => {
                                                    const val = e.target.value ? Number(e.target.value) : '';
                                                    const newStatus = val ? 'in_use' : 'available';
                                                    setFaForm({ ...faForm, assigned_to: val, status: newStatus });
                                                }}
                                            >
                                                <option value="">— None —</option>
                                                {employees.map((em) => (
                                                    <option key={em.id} value={em.id}>
                                                        {empLabel(em)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Assignment date</label>
                                            <input type="date" className="form-input" value={faForm.assignment_date} onChange={(e) => setFaForm({ ...faForm, assignment_date: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="form-label">Notes</label>
                                            <textarea className="form-textarea" rows={2} value={faForm.notes} onChange={(e) => setFaForm({ ...faForm, notes: e.target.value })} />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setFaModal(false)}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Supply modal */}
            <Transition show={siModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setSiModal(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel w-full max-w-lg overflow-hidden rounded-lg p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <h5 className="text-lg font-bold">{siEditId ? 'Edit' : 'Add'} supply item</h5>
                                        <button type="button" className="text-gray-400 hover:text-gray-800" onClick={() => setSiModal(false)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    <form onSubmit={saveSi} className="p-5 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Item code</label>
                                                <input className="form-input" required value={siForm.item_code} onChange={(e) => setSiForm({ ...siForm, item_code: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Sub-category</label>
                                                <select className="form-select" value={siForm.sub_category} onChange={(e) => setSiForm({ ...siForm, sub_category: e.target.value })}>
                                                    {['peripherals', 'stationery', 'swag', 'cables', 'other'].map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Item name</label>
                                            <input className="form-input" required value={siForm.item_name} onChange={(e) => setSiForm({ ...siForm, item_name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="form-label">Total stock</label>
                                                <input type="number" min={0} className="form-input" value={siForm.total_stock} onChange={(e) => setSiForm({ ...siForm, total_stock: Number(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Available</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="form-input"
                                                    value={siForm.available_quantity}
                                                    onChange={(e) => setSiForm({ ...siForm, available_quantity: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Reorder at</label>
                                                <input type="number" min={0} className="form-input" value={siForm.reorder_level} onChange={(e) => setSiForm({ ...siForm, reorder_level: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Unit price</label>
                                                <input type="number" step="0.01" className="form-input" value={siForm.unit_price} onChange={(e) => setSiForm({ ...siForm, unit_price: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">UoM</label>
                                                <select className="form-select" value={siForm.unit_of_measure} onChange={(e) => setSiForm({ ...siForm, unit_of_measure: e.target.value })}>
                                                    {['pcs', 'box', 'pack', 'meters'].map((u) => (
                                                        <option key={u} value={u}>
                                                            {u}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Last restocked</label>
                                                <input type="date" className="form-input" value={siForm.last_restocked} onChange={(e) => setSiForm({ ...siForm, last_restocked: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label text-red-600 font-bold tracking-tighter uppercase text-[10px]">Max Qty Per Order</label>
                                                <input type="number" min={1} className="form-input border-red-100" value={siForm.max_per_order} onChange={(e) => setSiForm({ ...siForm, max_per_order: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Vendor</label>
                                            <textarea className="form-textarea" rows={2} value={siForm.vendor_details} onChange={(e) => setSiForm({ ...siForm, vendor_details: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="form-label text-indigo-600 font-bold">Item Image (Optional)</label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="file" 
                                                    className="form-input flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                                                    accept="image/*" 
                                                    onChange={(e) => setSiImage(e.target.files?.[0] || null)} 
                                                />
                                                {siImage && (
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-indigo-200">
                                                        <img src={URL.createObjectURL(siImage)} className="w-full h-full object-cover" alt="Preview" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Notes</label>
                                            <textarea className="form-textarea" rows={2} value={siForm.notes} onChange={(e) => setSiForm({ ...siForm, notes: e.target.value })} />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setSiModal(false)}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Request modal */}
            <Transition show={arModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setArModal(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel w-full max-w-lg overflow-hidden rounded-lg p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <h5 className="text-lg font-bold">{arEditId ? 'Edit' : 'New'} request</h5>
                                        <button type="button" className="text-gray-400 hover:text-gray-800" onClick={() => setArModal(false)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    <form onSubmit={saveAr} className="p-5 space-y-3">
                                        <div>
                                            <label className="form-label">Requested by</label>
                                            <select
                                                className="form-select"
                                                required
                                                disabled={!!arEditId}
                                                value={arForm.requested_by === '' ? '' : String(arForm.requested_by)}
                                                onChange={(e) => setArForm({ ...arForm, requested_by: Number(e.target.value) })}
                                            >
                                                <option value="">Select employee</option>
                                                {employees.map((em) => (
                                                    <option key={em.id} value={em.id}>
                                                        {empLabel(em)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Approval status</label>
                                            <select className="form-select" value={arForm.approval_status} onChange={(e) => setArForm({ ...arForm, approval_status: e.target.value })}>
                                                {['pending', 'approved', 'rejected'].map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Remarks</label>
                                            <textarea className="form-textarea" rows={3} value={arForm.remarks} onChange={(e) => setArForm({ ...arForm, remarks: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="form-label">Related fixed asset id</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder="optional"
                                                    value={arForm.related_fixed_asset === '' ? '' : String(arForm.related_fixed_asset)}
                                                    onChange={(e) =>
                                                        setArForm({
                                                            ...arForm,
                                                            related_fixed_asset: e.target.value ? Number(e.target.value) : '',
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Related supply item id</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder="optional"
                                                    value={arForm.related_supply_item === '' ? '' : String(arForm.related_supply_item)}
                                                    onChange={(e) =>
                                                        setArForm({
                                                            ...arForm,
                                                            related_supply_item: e.target.value ? Number(e.target.value) : '',
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {!arEditId ? (
                                            <div>
                                                <label className="form-label">Image (optional)</label>
                                                <input type="file" accept="image/*" className="form-input" onChange={(e) => setArImage(e.target.files?.[0] || null)} />
                                            </div>
                                        ) : null}
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setArModal(false)}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Documents modal */}
            <Transition show={!!docParent} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setDocParent(null)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel w-full max-w-lg overflow-hidden rounded-lg p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <h5 className="text-lg font-bold">Documents — {docParent?.label}</h5>
                                        <button type="button" className="text-gray-400 hover:text-gray-800" onClick={() => setDocParent(null)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="flex flex-wrap gap-2 items-end">
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="form-label">Title (optional)</label>
                                                <input className="form-input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                                            </div>
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="form-label">File</label>
                                                <input type="file" className="form-input" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                                            </div>
                                            <button type="button" className="btn btn-primary mb-0.5" onClick={uploadDoc}>
                                                Upload
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-100 dark:border-[#191e3a] pt-3">
                                            {docLoading ? (
                                                <p className="text-gray-500">Loading…</p>
                                            ) : docList.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No documents yet.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {docList.map((d) => (
                                                        <li key={d.id} className="flex items-center justify-between gap-2 text-sm border border-gray-100 dark:border-[#191e3a] rounded p-2">
                                                            <a href={d.file_url || '#'} className="text-primary hover:underline truncate" target="_blank" rel="noreferrer">
                                                                {d.title || d.file || 'file'}
                                                            </a>
                                                            <button type="button" className="btn btn-outline-danger btn-xs p-1" onClick={() => deleteDoc(d.id)}>
                                                                <IconTrashLines className="w-3 h-3" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            {/* Approval Modal for Core Assets */}
            <Transition appear show={approvalModal} as={Fragment}>
                <Dialog as="div" open={approvalModal} onClose={() => setApprovalModal(false)} className="relative z-[100]">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel w-full max-w-lg overflow-hidden dark:bg-[#0e1726] shadow-2xl border-0 p-0">
                                    <div className="bg-indigo-600 p-6">
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Asset Approval Details</h3>
                                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Specifying action type and employee payment for this request</p>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div>
                                            <label className="text-xs font-black uppercase text-gray-500 mb-2 block tracking-widest">Admin Action Type</label>
                                            <select 
                                                className="form-select font-bold text-gray-800"
                                                value={approvalData.admin_action_type}
                                                onChange={(e) => setApprovalData({ ...approvalData, admin_action_type: e.target.value })}
                                            >
                                                <option value="repair">REPAIR (Maintenance)</option>
                                                <option value="change">CHANGE (Replacement)</option>
                                                <option value="other">OTHER (Consult Remarks)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-black uppercase text-gray-500 mb-2 block tracking-widest">Employee Payment (if any)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                                                <input 
                                                    type="number"
                                                    className="form-input pl-8 font-black text-indigo-600"
                                                    placeholder="0.00"
                                                    value={approvalData.employee_payment_amount}
                                                    onChange={(e) => setApprovalData({ ...approvalData, employee_payment_amount: Number(e.target.value) })}
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 italic font-medium">Leave 0 if the company covers the full cost.</p>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-dark flex-1 uppercase font-black text-xs" 
                                                onClick={() => setApprovalModal(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn btn-primary flex-1 uppercase font-black text-xs italic tracking-widest shadow-lg shadow-indigo-500/20"
                                                onClick={() => processBatch(approvalData.batchId, 'approved', approvalData)}
                                            >
                                                Confirm & Approve
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default AdminAssetsInventory;
