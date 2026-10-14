import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Swal from 'sweetalert2';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconChecks from '../../components/Icon/IconChecks';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconSearch from '../../components/Icon/IconSearch';
import PageHeader from '../../components/Common/PageHeader';

import Modal from '../../components/Common/Modal';
import { Tab } from '@headlessui/react';
import Button from '../../components/Common/Button';
import DataTable, { Column } from '../../components/Common/DataTable';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** Calendar date in local timezone (do not use toISOString() — it shifts dates in non-UTC zones). */
const dateToLocalYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const WFHRequest = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [reqSearch, setReqSearch] = useState('');
    const [reqPage, setReqPage] = useState(1);
    const [reqPageSize, setReqPageSize] = useState(10);
    const [reqTotal, setReqTotal] = useState(0);
    const [reqLoading, setReqLoading] = useState(false);
    const [apSearch, setApSearch] = useState('');
    const [apPage, setApPage] = useState(1);
    const [apPageSize, setApPageSize] = useState(10);
    const [apTotal, setApTotal] = useState(0);
    const [apLoading, setApLoading] = useState(false);
    const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
    const [showModal, setShowModal] = useState(false);
    const [myLocation, setMyLocation] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        request_type: 'wfh',
        reason: '',
        from_date: '',
        to_date: '',
    });

    const userRole = localStorage.getItem('role');
    const isReportingManager = localStorage.getItem('is_reporting_manager') === 'true';
    const isAdmin = userRole === 'admin' || userRole === 'master';
    const myUsername = localStorage.getItem('username');

    const headers = {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    };

    const fetchMine = async () => {
        setReqLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/app/wfh-requests/`, {
                headers,
                params: { mine: 'true', page: reqPage, page_size: reqPageSize, search: reqSearch.trim() || undefined },
            });
            const list = res.data.results || (Array.isArray(res.data) ? res.data : []);
            setRequests(list);
            setReqTotal(res.data.count !== undefined ? res.data.count : list.length);
        } catch (error) {
            console.error('Error fetching WFH requests:', error);
        } finally {
            setReqLoading(false);
            setLoading(false);
        }
    };

    const fetchApprovals = async () => {
        setApLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/app/wfh-requests/`, {
                headers,
                params: { status: 'pending', page: apPage, page_size: apPageSize, search: apSearch.trim() || undefined },
            });
            const list = res.data.results || (Array.isArray(res.data) ? res.data : []);
            setPendingRequests(list.filter((r: any) => r.employee_username !== myUsername));
            setApTotal(res.data.count !== undefined ? res.data.count : list.length);
        } catch (error) {
            console.error('Error fetching approvals:', error);
        } finally {
            setApLoading(false);
        }
    };

    const fetchCounts = async () => {
        try {
            const one = (status?: string) => axios.get(`${API_BASE_URL}/app/wfh-requests/`, { headers, params: { mine: 'true', page: 1, page_size: 1, status } });
            const [all, pending, approved, rejected] = await Promise.all([one(), one('pending'), one('approved'), one('rejected')]);
            const n = (r: any) => (r.data.count !== undefined ? r.data.count : (r.data.results || r.data || []).length);
            setCounts({ total: n(all), pending: n(pending), approved: n(approved), rejected: n(rejected) });
        } catch {
            /* counts are informational */
        }
    };

    const fetchMyLocation = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/app/employee/me/`, { headers });
            if (res.data?.work_location) setMyLocation(res.data.work_location);
        } catch {
            /* optional */
        }
    };

    const fetchAllData = () => {
        fetchMine();
        fetchApprovals();
        fetchCounts();
        fetchMyLocation();
    };

    useEffect(() => {
        fetchCounts();
        fetchMyLocation();
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchMine, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reqPage, reqPageSize, reqSearch]);

    useEffect(() => {
        const t = setTimeout(fetchApprovals, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apPage, apPageSize, apSearch]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            const data: any = { ...formData };
            if (!data.from_date) delete data.from_date;
            if (!data.to_date) delete data.to_date;

            await axios.post(`${API_BASE_URL}/app/wfh-requests/`, data, { headers });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'WFH request submitted successfully!',
                padding: '2em',
                customClass: { popup: 'sweet-alerts' },
            });
            setShowModal(false);
            setFormData({ request_type: 'wfh', reason: '', from_date: '', to_date: '' });
            fetchAllData();
        } catch (error: any) {
            console.error('WFH Error:', error.response?.data);
            const errorMsg = error.response?.data 
                ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data))
                : 'Failed to submit request';
            
            Swal.fire({ icon: 'error', title: 'Error', text: errorMsg, padding: '2em', customClass: { popup: 'sweet-alerts' } });
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await axios.post(`${API_BASE_URL}/app/wfh-requests/${id}/approve/`, {}, { headers });
            Swal.fire({ title: 'Approved!', text: 'WFH request has been approved.', icon: 'success', customClass: { popup: 'sweet-alerts' } });
            fetchAllData();
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.detail || 'Failed to approve request.', 'error');
        }
    };

    const handleReject = async (id: number) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Request',
            input: 'textarea',
            inputLabel: 'Rejection Reason',
            inputPlaceholder: 'Provide feedback...',
            showCancelButton: true,
            confirmButtonText: 'Confirm Rejection',
            customClass: { popup: 'sweet-alerts' }
        });

        if (reason) {
            try {
                await axios.post(`${API_BASE_URL}/app/wfh-requests/${id}/reject/`, { rejection_reason: reason }, { headers });
                Swal.fire('Rejected!', 'WFH request has been rejected.', 'success');
                fetchAllData();
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.detail || 'Failed to reject request.', 'error');
            }
        }
    };

    const handleToggleLocation = async (emp: any) => {
        const newLoc = emp.work_location === 'office' ? 'home' : 'office';
        const result = await Swal.fire({
            title: 'Manual Override',
            text: `Switch ${emp.full_name}'s location to ${newLoc.toUpperCase()}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Switch to ${newLoc}`,
            input: 'text',
            inputPlaceholder: 'Reason...',
            customClass: { popup: 'sweet-alerts' }
        });

        if (result.isConfirmed) {
            try {
                await axios.post(`${API_BASE_URL}/app/employee/${emp.id}/toggle_work_location/`, {
                    reason: result.value || 'Admin Direct Update',
                }, { headers });
                Swal.fire('Updated!', `Employee is now working from ${newLoc}.`, 'success');
                fetchAllData();
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.detail || 'Failed to update location.', 'error');
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="badge badge-outline-success uppercase text-[10px] font-black tracking-widest">Approved</span>;
            case 'rejected': return <span className="badge badge-outline-danger uppercase text-[10px] font-black tracking-widest">Rejected</span>;
            default: return <span className="badge badge-outline-primary uppercase text-[10px] font-black tracking-widest">Pending</span>;
        }
    };

    const tabs = ['My Requests', 'Team Approvals'];

    const typeBadge = (t: string) => (
        <span className={`badge text-[9px] font-black uppercase tracking-widest ${t === 'wfo' ? 'badge-outline-success' : 'badge-outline-primary'}`}>{t === 'wfo' ? 'Office' : 'Home'}</span>
    );

    const myColumns: Column<any>[] = [
        { key: 'request_type', title: 'Type', render: (v) => typeBadge(v) },
        { key: 'reason', title: 'Reason', hideBelow: 'md', render: (v) => <span className="block min-w-[200px] whitespace-normal text-sm font-semibold text-gray-700">{v}</span> },
        {
            key: 'from_date', title: 'Duration',
            render: (_v, req) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-brand">{req.from_date || 'N/A'}</span>
                    {req.to_date && <span className="text-[10px] italic text-gray-400">to {req.to_date}</span>}
                </div>
            ),
        },
        { key: 'status', title: 'Status', align: 'center', render: (v) => getStatusBadge(v) },
        { key: 'created_at', title: 'Requested On', hideBelow: 'lg', render: (v) => <span className="text-[11px] font-semibold text-gray-500">{new Date(v).toLocaleDateString()}</span> },
        {
            key: 'rejection_reason', title: 'Feedback', hideBelow: 'lg',
            render: (v) =>
                v ? (
                    <div className="flex max-w-[220px] items-start gap-2">
                        <IconInfoCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                        <span className="text-[11px] font-medium italic text-rose-600">{v}</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                ),
        },
    ];

    const approvalColumns: Column<any>[] = [
        {
            key: 'employee_name', title: 'Employee',
            render: (_v, req) => (
                <div className="flex flex-col">
                    <span className="font-black text-brand">{req.employee_name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">ID: {req.employee_id}</span>
                </div>
            ),
        },
        { key: 'employee_current_location', title: 'Current', align: 'center', hideBelow: 'md', render: (v) => <span className={`badge text-[9px] font-black uppercase tracking-widest ${v === 'home' ? 'badge-outline-primary' : 'badge-outline-success'}`}>{v === 'home' ? 'Home' : 'Office'}</span> },
        { key: 'request_type', title: 'Request', align: 'center', render: (v) => typeBadge(v) },
        { key: 'reason', title: 'Reason', hideBelow: 'lg', render: (v) => <span className="block min-w-[200px] whitespace-normal text-xs font-medium text-gray-600">{v}</span> },
        { key: 'from_date', title: 'Duration', align: 'center', hideBelow: 'md', render: (_v, req) => <span className="text-xs font-bold">{req.from_date || 'N/A'} {req.to_date ? `→ ${req.to_date}` : ''}</span> },
        {
            key: 'actions', title: 'Actions', align: 'center',
            render: (_v, req) => (
                <div className="flex items-center justify-center gap-2">
                    <Tippy content="Approve"><Button variant="outline-success" size="sm" className="!p-2" onClick={() => handleApprove(req.id)}><IconChecks className="h-4 w-4" /></Button></Tippy>
                    <Tippy content="Reject"><Button variant="outline-danger" size="sm" className="!p-2" onClick={() => handleReject(req.id)}><IconX className="h-4 w-4" /></Button></Tippy>
                </div>
            ),
        },
    ];


    return (
        <div className="pb-10 space-y-7">
            <PageHeader
                title="Work From Home"
                subtitle="Submit requests, track approvals, and stay synced with team availability from one unified workspace."
                icon={<IconCalendar />}
                badge="Flexible Work"
                variant="indigo"
                actions={
                    <div className="flex items-center gap-3">
                        {myLocation && (
                            <div className="rounded-xl border border-brand/20 bg-brand/10 px-4 py-2">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Current Work Mode</p>
                                <p className="mt-0.5 flex items-center gap-2 text-xs font-extrabold text-slate-900">
                                    <span className={`h-2 w-2 rounded-full ${myLocation === 'home' ? 'bg-brand-300' : 'bg-emerald-300'} animate-pulse`} />
                                    {myLocation === 'home' ? 'At Home' : 'In Office'}
                                </p>
                            </div>
                        )}
                        <Button
                            type="button"
                            
                            onClick={() => setShowModal(true)}
                        >
                            <IconPlus className="w-4 h-4" />
                            New Request
                        </Button>
                    </div>
                }
            />

            <StatGrid cols={4} className="!mb-0">
                <StatCard label="Total Requests" value={counts.total} tone="primary" icon={<IconCalendar />} />
                <StatCard label="Pending" value={counts.pending} tone="warning" icon={<IconInfoCircle />} />
                <StatCard label="Approved" value={counts.approved} tone="success" icon={<IconChecks />} />
                <StatCard label="Rejected" value={counts.rejected} tone="danger" icon={<IconX />} />
            </StatGrid>

            <Tab.Group>
                <Tab.List className="flex w-full flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-black">
                    {tabs.map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={`relative rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.15em] transition-all outline-none ${
                                        selected ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {t}
                                    {t === 'Team Approvals' && apTotal > 0 && (
                                        <span className="ml-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                                            {apTotal > 99 ? '99+' : apTotal}
                                        </span>
                                    )}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>

                <Tab.Panels className="mt-5">
                    {tabs.map((t) => (
                        <Tab.Panel key={t} className="animate-fade-in-up">
                            {t === 'My Requests' && (
                                <DataTable
                                    columns={myColumns}
                                    data={requests}
                                    loading={reqLoading}
                                    page={reqPage}
                                    pageSize={reqPageSize}
                                    totalCount={reqTotal}
                                    onPageChange={setReqPage}
                                    onPageSizeChange={(sz) => { setReqPageSize(sz); setReqPage(1); }}
                                    searchValue={reqSearch}
                                    onSearchChange={(v) => { setReqSearch(v); setReqPage(1); }}
                                    onRefresh={() => { fetchMine(); fetchCounts(); }}
                                    searchPlaceholder="Search my requests..."
                                    emptyMessage="No requests found"
                                    emptySubtitle="Start by creating your first work mode request."
                                    entityLabel="requests"
                                />
                            )}

                            {t === 'Team Approvals' && (
                                <DataTable
                                    columns={approvalColumns}
                                    data={pendingRequests}
                                    loading={apLoading}
                                    page={apPage}
                                    pageSize={apPageSize}
                                    totalCount={apTotal}
                                    onPageChange={setApPage}
                                    onPageSizeChange={(sz) => { setApPageSize(sz); setApPage(1); }}
                                    searchValue={apSearch}
                                    onSearchChange={(v) => { setApSearch(v); setApPage(1); }}
                                    onRefresh={fetchApprovals}
                                    searchPlaceholder="Search pending approvals..."
                                    emptyMessage="No pending approvals"
                                    entityLabel="requests"
                                />
                            )}
                        </Tab.Panel>
                    ))}
                </Tab.Panels>
            </Tab.Group>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Request" size="xl">
                <form onSubmit={handleSubmit}>
                                                        <div className="space-y-5 p-6">
                                                            <div>
                                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Request Type</label>
                                                                <select className="form-select text-sm font-semibold" value={formData.request_type} onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}>
                                                                    <option value="wfh">Work From Home</option>
                                                                    <option value="wfo">Work From Office</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Reason</label>
                                                                <textarea className="form-textarea min-h-[110px] text-sm" placeholder="Share details for your manager..." required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">From Date</label>
                                                                    <Flatpickr
                                                                        value={formData.from_date || undefined}
                                                                        options={{ dateFormat: 'Y-m-d' }}
                                                                        className="form-input"
                                                                        onChange={(date: Date[]) => {
                                                                            const picked = date[0];
                                                                            if (!picked) {
                                                                                setFormData((prev) => ({ ...prev, from_date: '' }));
                                                                                return;
                                                                            }
                                                                            const from = dateToLocalYmd(picked);
                                                                            setFormData((prev) => ({
                                                                                ...prev,
                                                                                from_date: from,
                                                                                to_date: prev.to_date && prev.to_date < from ? from : prev.to_date,
                                                                            }));
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">To Date</label>
                                                                    <Flatpickr
                                                                        value={formData.to_date || undefined}
                                                                        options={{ dateFormat: 'Y-m-d' }}
                                                                        className="form-input"
                                                                        onChange={(date: Date[]) => {
                                                                            const picked = date[0];
                                                                            if (!picked) {
                                                                                setFormData((prev) => ({ ...prev, to_date: '' }));
                                                                                return;
                                                                            }
                                                                            let to = dateToLocalYmd(picked);
                                                                            setFormData((prev) => {
                                                                                if (prev.from_date && to < prev.from_date) {
                                                                                    to = prev.from_date;
                                                                                }
                                                                                return { ...prev, to_date: to };
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/20">
                                                            <Button variant="outline-danger" type="button" onClick={() => setShowModal(false)} >
                                                                Cancel
                                                            </Button>
                                                            <Button type="submit">
                                                                Submit Request
                                                            </Button>
                                                        </div>
                                                    </form>
            </Modal>
        </div>
    );
};

export default WFHRequest;
