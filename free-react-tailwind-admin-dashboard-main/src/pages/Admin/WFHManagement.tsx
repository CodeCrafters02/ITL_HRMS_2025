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
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';

import Modal from '../../components/Common/Modal';
import { Tab } from '@headlessui/react';
import Button from '../../components/Common/Button';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** Calendar date in local timezone (do not use toISOString() — it shifts dates in non-UTC zones). */
const dateToLocalYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const WFHRequest = () => { 
    const { t } = useTranslation();
    // Team Approvals State
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [approvalPage, setApprovalPage] = useState(1);
    const [approvalPageSize, setApprovalPageSize] = useState(10);
    const [approvalTotalCount, setApprovalTotalCount] = useState(0);
    const [approvalSearch, setApprovalSearch] = useState('');

    // Live Status State
    const [employees, setEmployees] = useState<any[]>([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [livePage, setLivePage] = useState(1);
    const [livePageSize, setLivePageSize] = useState(10);
    const [liveTotalCount, setLiveTotalCount] = useState(0);
    const [liveSearch, setLiveSearch] = useState('');

    // Audit Logs State
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const [logsPageSize, setLogsPageSize] = useState(10);
    const [logsTotalCount, setLogsTotalCount] = useState(0);
    const [logsSearch, setLogsSearch] = useState('');

    // Header Summary Counts
    const [homeCount, setHomeCount] = useState(0);
    const [officeCount, setOfficeCount] = useState(0);

    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
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

    const fetchSummaryCounts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/app/employee/?page_size=1000`, { headers });
            const list = res.data.results || (Array.isArray(res.data) ? res.data : []);
            setHomeCount(list.filter((e: any) => e.work_location === 'home').length);
            setOfficeCount(list.filter((e: any) => e.work_location === 'office').length);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPendingApprovals = async () => {
        setApprovalLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/app/wfh-requests/`, {
                headers,
                params: {
                    status: 'pending',
                    page: approvalPage,
                    page_size: approvalPageSize,
                    search: approvalSearch.trim() || undefined,
                }
            });
            const data = res.data;
            const list = data.results || (Array.isArray(data) ? data : []);
            setPendingRequests(list);
            setApprovalTotalCount(data.count !== undefined ? data.count : list.length);
        } catch (error) {
            console.error('Error fetching approvals:', error);
        } finally {
            setApprovalLoading(false);
        }
    };

    const fetchLiveStatus = async () => {
        setLiveLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/app/employee/`, {
                headers,
                params: {
                    page: livePage,
                    page_size: livePageSize,
                    search: liveSearch.trim() || undefined,
                }
            });
            const data = res.data;
            const list = data.results || (Array.isArray(data) ? data : []);
            setEmployees(list);
            setLiveTotalCount(data.count !== undefined ? data.count : list.length);
        } catch (error) {
            console.error('Error fetching live status:', error);
        } finally {
            setLiveLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/app/work-location-logs/`, {
                headers,
                params: {
                    page: logsPage,
                    page_size: logsPageSize,
                    search: logsSearch.trim() || undefined,
                }
            });
            const data = res.data;
            const list = data.results || (Array.isArray(data) ? data : []);
            setLogs(list);
            setLogsTotalCount(data.count !== undefined ? data.count : list.length);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchAllData = () => {
        fetchSummaryCounts();
        fetchPendingApprovals();
        fetchLiveStatus();
        fetchLogs();
    };

    useEffect(() => {
        fetchSummaryCounts();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPendingApprovals();
        }, 300);
        return () => clearTimeout(timer);
    }, [approvalPage, approvalPageSize, approvalSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLiveStatus();
        }, 300);
        return () => clearTimeout(timer);
    }, [livePage, livePageSize, liveSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [logsPage, logsPageSize, logsSearch]);

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
            setFormData({ reason: '', from_date: '', to_date: '' });
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

    const approvalColumns: Column<any>[] = [
        {
            key: 'index',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _req, idx) => (
                <span className="font-semibold text-gray-500">{(approvalPage - 1) * approvalPageSize + (idx ?? 0) + 1}</span>
            ),
        },
        {
            key: 'employee',
            title: 'Employee',
            sortable: true,
            render: (_val, req) => (
                <div className="flex flex-col">
                    <span className="font-bold text-primary">{req.employee_name}</span>
                    <span className="text-[10px] font-mono text-gray-400">ID: {req.employee_id}</span>
                </div>
            ),
        },
        {
            key: 'current_location',
            title: 'Current Status',
            align: 'center',
            render: (_val, req) => (
                <span className={`badge uppercase text-[9px] font-bold ${req.employee_current_location === 'home' ? 'badge-outline-secondary' : 'badge-outline-info'}`}>
                    {req.employee_current_location === 'home' ? 'Home' : 'Office'}
                </span>
            ),
        },
        {
            key: 'request_type',
            title: 'Req Type',
            align: 'center',
            render: (_val, req) => (
                <span className={`badge uppercase text-[9px] font-bold ${req.request_type === 'wfo' ? 'badge-outline-info' : 'badge-outline-secondary'}`}>
                    {req.request_type === 'wfo' ? 'Office' : 'Home'}
                </span>
            ),
        },
        {
            key: 'reason',
            title: 'Reason',
            render: (val) => <span className="text-xs italic text-gray-600 dark:text-gray-300 max-w-[250px] truncate block" title={val}>{val}</span>,
        },
        {
            key: 'duration',
            title: 'Duration',
            align: 'center',
            render: (_val, req) => (
                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">
                    {req.from_date || 'N/A'} {req.to_date ? `→ ${req.to_date}` : ''}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, req) => (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline-success" size="sm" className="!p-2" type="button" onClick={() => handleApprove(req.id)}  title="Approve">
                        <IconChecks className="w-4 h-4" />
                    </Button>
                    <Button variant="outline-danger" size="sm" className="!p-2" type="button" onClick={() => handleReject(req.id)}  title="Reject">
                        <IconX className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const liveStatusColumns: Column<any>[] = [
        {
            key: 'index',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _emp, idx) => (
                <span className="font-semibold text-gray-500">{(livePage - 1) * livePageSize + (idx ?? 0) + 1}</span>
            ),
        },
        {
            key: 'employee_id',
            title: 'ID',
            sortable: true,
            render: (val) => <span className="text-xs font-mono font-bold text-gray-400">{val}</span>,
        },
        {
            key: 'full_name',
            title: 'Name',
            sortable: true,
            render: (val) => <span className="font-bold text-gray-800 dark:text-white-light">{val}</span>,
        },
        {
            key: 'work_location',
            title: 'Status',
            sortable: true,
            render: (val) => (
                <span className={`badge ${val === 'home' ? 'badge-outline-info' : 'badge-outline-success'} uppercase text-[9px] font-bold`}>
                    {val === 'home' ? 'Working Home' : 'In Office'}
                </span>
            ),
        },
        {
            key: 'action',
            title: 'Action',
            align: 'center',
            render: (_val, emp) => (
                <button
                    type="button"
                    onClick={() => handleToggleLocation(emp)}
                    className={`btn btn-sm font-bold uppercase text-[10px] px-4 py-1.5 rounded-xl shadow-sm ${emp.work_location === 'home' ? 'btn-warning' : 'btn-info'}`}
                >
                    Switch to {emp.work_location === 'home' ? 'Office' : 'Home'}
                </button>
            ),
        },
    ];

    const auditLogColumns: Column<any>[] = [
        {
            key: 'index',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _log, idx) => (
                <span className="font-semibold text-gray-500">{(logsPage - 1) * logsPageSize + (idx ?? 0) + 1}</span>
            ),
        },
        {
            key: 'employee_name',
            title: 'Employee',
            sortable: true,
            render: (val) => <span className="font-bold text-primary">{val}</span>,
        },
        {
            key: 'transition',
            title: 'Transition',
            render: (_val, log) => (
                <span className="font-semibold text-xs capitalize text-gray-600 dark:text-gray-300">
                    {log.from_location} &rarr; {log.to_location}
                </span>
            ),
        },
        {
            key: 'changed_by_name',
            title: 'Auth By',
            render: (val) => <span className="text-xs font-semibold text-gray-500">{val || 'System'}</span>,
        },
        {
            key: 'date',
            title: 'Timestamp',
            sortable: true,
            render: (val) => <span className="text-xs text-gray-400">{val ? new Date(val).toLocaleString() : '-'}</span>,
        },
    ];

    const tabs = ['Team Approvals', 'Live Status', 'Audit Logs'];

    return (
        <div className="pb-10">
            {/* Unified Header */}
            <PageHeader
                title="WFH Management Hub"
                subtitle={isAdmin ? 'Global organizational presence tracking, flexible work policies, and approval workflows.' : 'Track your presence and see who\'s working remotely or in the office today.'}
                icon={<IconCalendar />}
                badge="Workforce Flexibility"
                variant="indigo"
                stats={
                    <div className="flex items-center gap-3">
                        <div className="text-center bg-brand/10 p-2.5 px-4 rounded-xl border border-brand/20">
                            <p className="text-xl font-black text-slate-900 leading-none">{homeCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-wider text-brand mt-1">At Home</p>
                        </div>
                        <div className="text-center bg-brand/10 p-2.5 px-4 rounded-xl border border-brand/20">
                            <p className="text-xl font-black text-slate-900 leading-none">{officeCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mt-1">In Office</p>
                        </div>
                    </div>
                }
            />

            <Tab.Group>
                <Tab.List className="flex flex-wrap gap-8 mb-8 border-b border-gray-100 dark:border-gray-800 pb-1">
                    {tabs.map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button className={`px-2 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none border-b-4 ${selected ? 'text-brand-600 border-brand-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                    {t === 'Team Approvals' && pendingRequests.length > 0 && (
                                        <span className="inline-block w-2 h-2 bg-rose-500 rounded-full mr-2 animate-ping"></span>
                                    )}
                                    {t}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    {tabs.map(t => (
                        <Tab.Panel key={t} className="animate-fade-in-up">
                            
                            {/* TEAM APPROVALS */}
                            {t === 'Team Approvals' && (
                                <DataTable
                                    title="Team WFH Approvals"
                                    columns={approvalColumns}
                                    data={pendingRequests}
                                    loading={approvalLoading}
                                    page={approvalPage}
                                    pageSize={approvalPageSize}
                                    totalCount={approvalTotalCount}
                                    onPageChange={(p) => setApprovalPage(p)}
                                    onPageSizeChange={(sz) => {
                                        setApprovalPageSize(sz);
                                        setApprovalPage(1);
                                    }}
                                    searchValue={approvalSearch}
                                    onSearchChange={(val) => {
                                        setApprovalSearch(val);
                                        setApprovalPage(1);
                                    }}
                                    onRefresh={fetchPendingApprovals}
                                    searchPlaceholder="Search approvals by name, ID, reason..."
                                    emptyMessage="No pending approvals"
                                    emptySubtitle="All employee work-from-home requests have been processed."
                                />
                            )}

                            {/* LIVE STATUS */}
                            {t === 'Live Status' && (
                                <DataTable
                                    title="Employee Live Work Location"
                                    columns={liveStatusColumns}
                                    data={employees}
                                    loading={liveLoading}
                                    page={livePage}
                                    pageSize={livePageSize}
                                    totalCount={liveTotalCount}
                                    onPageChange={(p) => setLivePage(p)}
                                    onPageSizeChange={(sz) => {
                                        setLivePageSize(sz);
                                        setLivePage(1);
                                    }}
                                    searchValue={liveSearch}
                                    onSearchChange={(val) => {
                                        setLiveSearch(val);
                                        setLivePage(1);
                                    }}
                                    onRefresh={fetchLiveStatus}
                                    searchPlaceholder="Search employee by name, ID..."
                                    emptyMessage="No employees found."
                                />
                            )}

                            {/* AUDIT LOGS */}
                            {t === 'Audit Logs' && (
                                <DataTable
                                    title="Work Location Audit Logs"
                                    columns={auditLogColumns}
                                    data={logs}
                                    loading={logsLoading}
                                    page={logsPage}
                                    pageSize={logsPageSize}
                                    totalCount={logsTotalCount}
                                    onPageChange={(p) => setLogsPage(p)}
                                    onPageSizeChange={(sz) => {
                                        setLogsPageSize(sz);
                                        setLogsPage(1);
                                    }}
                                    searchValue={logsSearch}
                                    onSearchChange={(val) => {
                                        setLogsSearch(val);
                                        setLogsPage(1);
                                    }}
                                    onRefresh={fetchLogs}
                                    searchPlaceholder="Search audit logs..."
                                    emptyMessage="No audit logs recorded."
                                />
                            )}

                        </Tab.Panel>
                    ))}
                </Tab.Panels>

            </Tab.Group>

            {/* Request Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="New Request" size="lg">
                <form onSubmit={handleSubmit}>
                                                        <div className="p-6 space-y-6">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Reason</label>
                                                                <textarea className="form-textarea min-h-[120px] text-sm" placeholder="Details..." required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}></textarea>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-5">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">From</label>
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
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">To</label>
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
                                                        <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 gap-3">
                                                            <Button variant="outline-danger" type="button" onClick={() => setShowModal(false)} >Cancel</Button>
                                                            <Button type="submit">Submit</Button>
                                                        </div>
                                                    </form>
            </Modal>
        </div>
    );
};

export default WFHRequest;
