import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Swal from 'sweetalert2';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { Dialog, Transition, Tab } from '@headlessui/react';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import IconChecks from '../../components/Icon/IconChecks';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconSearch from '../../components/Icon/IconSearch';

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
    const [search, setSearch] = useState('');
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

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const promises: any[] = [
                axios.get(`${API_BASE_URL}/app/wfh-requests/?mine=true`, { headers }),
                axios.get(`${API_BASE_URL}/app/wfh-requests/`, { headers }),
                axios.get(`${API_BASE_URL}/app/employee/me/`, { headers }).catch(() => ({ data: {} })),
            ];

            const results = await Promise.all(promises);
            
            setRequests(results[0].data.results || results[0].data);
            if (results[2].data.work_location) setMyLocation(results[2].data.work_location);
            
            const approvalRes = results[1].data.results || results[1].data;
            setPendingRequests(approvalRes.filter((r: any) => r.status === 'pending' && r.employee_username !== myUsername));

        } catch (error) {
            console.error('Error fetching WFH data:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const filteredEmployees = employees.filter((emp: any) => 
        emp.full_name.toLowerCase().includes(search.toLowerCase()) || 
        emp.employee_id?.toLowerCase().includes(search.toLowerCase())
    );

    const tabs = ['My Requests', 'Team Approvals'];
    const myApprovedCount = requests.filter((r: any) => r.status === 'approved').length;
    const myPendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const myRejectedCount = requests.filter((r: any) => r.status === 'rejected').length;

    return (
        <div className="pb-10 space-y-7">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 p-6 shadow-2xl">
                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-extrabold tracking-[0.25em] uppercase text-white/80">Flexible Work</p>
                        <h1 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">Work From Home</h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-white/90">
                            Submit requests, track approvals, and stay synced with team availability from one unified workspace.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {myLocation && (
                            <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-md">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/80">Current Work Mode</p>
                                <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-white">
                                    <span className={`h-2.5 w-2.5 rounded-full ${myLocation === 'home' ? 'bg-indigo-300' : 'bg-emerald-300'} animate-pulse`} />
                                    {myLocation === 'home' ? 'At Home' : 'In Office'}
                                </p>
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn border-0 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold rounded-xl px-5"
                            onClick={() => setShowModal(true)}
                        >
                            <IconPlus className="w-4 h-4 mr-2" />
                            New Request
                        </button>
                    </div>
                </div>
                <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel border border-indigo-100/70 dark:border-indigo-900/40 shadow-sm">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Total Requests</p>
                    <p className="mt-2 text-2xl font-black text-indigo-600">{requests.length}</p>
                </div>
                <div className="panel border border-blue-100/70 dark:border-blue-900/40 shadow-sm">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Pending</p>
                    <p className="mt-2 text-2xl font-black text-blue-600">{myPendingCount}</p>
                </div>
                <div className="panel border border-emerald-100/70 dark:border-emerald-900/40 shadow-sm">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Approved</p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">{myApprovedCount}</p>
                </div>
                <div className="panel border border-rose-100/70 dark:border-rose-900/40 shadow-sm">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Rejected</p>
                    <p className="mt-2 text-2xl font-black text-rose-600">{myRejectedCount}</p>
                </div>
            </div>

            <Tab.Group>
                <Tab.List className="flex w-full flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-black">
                    {tabs.map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={`relative rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.15em] transition-all outline-none ${
                                        selected ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {t}
                                    {t === 'Team Approvals' && pendingRequests.length > 0 && (
                                        <span className="ml-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                                            {pendingRequests.length > 99 ? '99+' : pendingRequests.length}
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
                                <div className="panel p-0 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/30">
                                        <div className="flex items-center gap-2">
                                            <IconCalendar className="w-4 h-4 text-indigo-500" />
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Request Timeline</p>
                                        </div>
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={fetchAllData}>
                                            <IconRefresh className="w-3.5 h-3.5 mr-1.5" />
                                            Refresh
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Type</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Reason</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Duration</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider text-center">Status</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Requested On</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Feedback</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {requests.map((req: any) => (
                                                    <tr key={req.id}>
                                                        <td>
                                                            <span className={`badge uppercase text-[9px] font-black tracking-widest ${req.request_type === 'wfo' ? 'badge-outline-info' : 'badge-outline-secondary'}`}>
                                                                {req.request_type === 'wfo' ? 'Office' : 'Home'}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-normal min-w-[260px] text-sm font-semibold text-gray-700 dark:text-gray-200">{req.reason}</td>
                                                        <td>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-indigo-600">{req.from_date || 'N/A'}</span>
                                                                {req.to_date && <span className="text-[10px] text-gray-400 italic">to {req.to_date}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">{getStatusBadge(req.status)}</td>
                                                        <td className="text-[11px] font-semibold text-gray-500">{new Date(req.created_at).toLocaleDateString('en-GB')}</td>
                                                        <td>
                                                            {req.rejection_reason ? (
                                                                <div className="flex items-start gap-2 max-w-[220px]">
                                                                    <IconInfoCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                                                    <span className="text-[11px] text-rose-600 font-medium italic">{req.rejection_reason}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {requests.length === 0 && !loading && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-16">
                                                            <div className="mx-auto max-w-sm">
                                                                <p className="text-sm font-black uppercase tracking-widest text-gray-400">No requests yet</p>
                                                                <p className="mt-2 text-xs text-gray-500">Start by creating your first work mode request.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {t === 'Team Approvals' && (
                                <div className="panel p-0 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/30">
                                        <div className="flex items-center gap-2">
                                            <IconSearch className="w-4 h-4 text-indigo-500" />
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Pending Team Approvals</p>
                                        </div>
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={fetchAllData}>
                                            <IconRefresh className="w-3.5 h-3.5 mr-1.5" />
                                            Refresh
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Employee</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider text-center">Current</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider text-center">Request</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider">Reason</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider text-center">Duration</th>
                                                    <th className="text-[10px] font-black uppercase tracking-wider text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingRequests.map((req: any) => (
                                                    <tr key={req.id}>
                                                        <td>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-indigo-600">{req.employee_name}</span>
                                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">ID: {req.employee_id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge uppercase text-[9px] font-black tracking-widest ${req.employee_current_location === 'home' ? 'badge-outline-secondary' : 'badge-outline-info'}`}>
                                                                {req.employee_current_location === 'home' ? 'Home' : 'Office'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge uppercase text-[9px] font-black tracking-widest ${req.request_type === 'wfo' ? 'badge-outline-info' : 'badge-outline-secondary'}`}>
                                                                {req.request_type === 'wfo' ? 'Office' : 'Home'}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-normal min-w-[260px] text-xs font-medium text-gray-600 dark:text-gray-300">{req.reason}</td>
                                                        <td className="text-center font-bold text-xs">{req.from_date || 'N/A'} {req.to_date ? `→ ${req.to_date}` : ''}</td>
                                                        <td>
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Tippy content="Approve">
                                                                    <button onClick={() => handleApprove(req.id)} className="btn btn-sm btn-outline-success p-2 rounded-lg">
                                                                        <IconChecks className="w-4 h-4" />
                                                                    </button>
                                                                </Tippy>
                                                                <Tippy content="Reject">
                                                                    <button onClick={() => handleReject(req.id)} className="btn btn-sm btn-outline-danger p-2 rounded-lg">
                                                                        <IconX className="w-4 h-4" />
                                                                    </button>
                                                                </Tippy>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {pendingRequests.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-16">
                                                            <p className="text-sm font-black uppercase tracking-widest text-gray-400">No pending approvals</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </Tab.Panel>
                    ))}
                </Tab.Panels>
            </Tab.Group>

            <Transition appear show={showModal} as={Fragment}>
                <Dialog as="div" open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0e1726]">
                                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                                        <div>
                                            <h5 className="text-lg font-black text-indigo-600 uppercase tracking-wide">Create Request</h5>
                                            <p className="text-xs text-gray-500 mt-0.5">Submit your WFH/WFO plan for approval.</p>
                                        </div>
                                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500">
                                            <IconX />
                                        </button>
                                    </div>
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
                                            <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline-danger">
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                Submit Request
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default WFHRequest;
