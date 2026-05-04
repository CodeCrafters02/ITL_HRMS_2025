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

    return (
        <div className="pb-10">
            {/* Unified Header */}
            <div className="bg-gradient-to-r from-[#4338ca] via-[#3b82f6] to-[#0ea5e9] p-10 rounded-3xl shadow-2xl mb-10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic drop-shadow-lg">WFH Hub</h1>
                        <p className="text-white/90 mt-4 text-lg font-bold max-w-2xl italic leading-relaxed">
                            {isAdmin ? 'Global oversight & policy management center.' : 'Track your presence and see who\'s in the office today.'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {myLocation && (
                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-inner">
                                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest block mb-1">Live Status</span>
                                <span className="text-white font-black uppercase text-xl flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${myLocation === 'home' ? 'bg-indigo-400' : 'bg-green-400'} animate-pulse`}></span>
                                    {myLocation === 'home' ? 'At Home' : 'In Office'}
                                </span>
                            </div>
                        )}
                        <button 
                            type="button" 
                            className="btn bg-white text-indigo-600 hover:bg-indigo-50 border-0 font-black uppercase tracking-widest px-8 py-3 rounded-2xl shadow-2xl transition-all hover:scale-105"
                            onClick={() => setShowModal(true)}
                        >
                            <IconPlus className="mr-2 w-5 h-5" /> New Request
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <Tab.Group>
                <Tab.List className="flex flex-wrap gap-8 mb-8 border-b border-gray-100 dark:border-gray-800 pb-1">
                    {tabs.map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button className={`px-2 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none border-b-4 ${selected ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
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
                            
                            {/* MY REQUESTS */}
                            {t === 'My Requests' && (
                                <div className="panel p-0 border-0 overflow-hidden shadow-sm rounded-2xl">
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                    <th className="text-[10px] font-black uppercase">Type</th>
                                                    <th className="text-[10px] font-black uppercase">Reason</th>
                                                    <th className="text-[10px] font-black uppercase">Duration</th>
                                                    <th className="text-[10px] font-black uppercase text-center">Status</th>
                                                    <th className="text-[10px] font-black uppercase">Requested On</th>
                                                    <th className="text-[10px] font-black uppercase">Feedback</th>
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
                                                        <td className="whitespace-normal min-w-[250px] text-sm font-semibold">{req.reason}</td>
                                                        <td>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-indigo-600">{req.from_date || 'N/A'}</span>
                                                                {req.to_date && <span className="text-[10px] text-gray-400 italic">to {req.to_date}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">{getStatusBadge(req.status)}</td>
                                                        <td className="text-[11px] font-bold text-gray-400 italic">{new Date(req.created_at).toLocaleDateString('en-GB')}</td>
                                                        <td>
                                                            {req.rejection_reason ? (
                                                                <div className="flex items-start gap-2 max-w-[200px]">
                                                                    <IconInfoCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                                                    <span className="text-[11px] text-rose-600 font-medium italic">{req.rejection_reason}</span>
                                                                </div>
                                                            ) : <span className="text-[10px] text-gray-400">—</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {requests.length === 0 && !loading && (
                                                    <tr><td colSpan={5} className="text-center py-20 opacity-40 font-black uppercase text-sm tracking-widest">No history found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TEAM APPROVALS */}
                            {t === 'Team Approvals' && (
                                <div className="panel p-0 border-0 overflow-hidden shadow-sm rounded-2xl">
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                    <th className="text-[10px] font-black uppercase">Employee</th>
                                                    <th className="text-[10px] font-black uppercase text-center">Current Status</th>
                                                    <th className="text-[10px] font-black uppercase text-center">Req Type</th>
                                                    <th className="text-[10px] font-black uppercase">Reason</th>
                                                    <th className="text-[10px] font-black uppercase text-center">Duration</th>
                                                    <th className="text-[10px] font-black uppercase text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingRequests.map((req: any) => (
                                                    <tr key={req.id}>
                                                        <td>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-indigo-600">{req.employee_name}</span>
                                                                <span className="text-[9px] font-bold uppercase text-gray-400 italic">ID: {req.employee_id}</span>
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
                                                        <td className="whitespace-normal min-w-[250px] text-xs font-medium italic text-gray-600">{req.reason}</td>
                                                        <td className="text-center font-bold text-xs">{req.from_date || 'N/A'} {req.to_date ? `→ ${req.to_date}` : ''}</td>
                                                        <td>
                                                            <div className="flex items-center justify-center gap-3">
                                                                <Tippy content="Approve"><button onClick={() => handleApprove(req.id)} className="btn btn-sm btn-outline-success p-2 rounded-lg"><IconChecks className="w-4 h-4" /></button></Tippy>
                                                                <Tippy content="Reject"><button onClick={() => handleReject(req.id)} className="btn btn-sm btn-outline-danger p-2 rounded-lg"><IconX className="w-4 h-4" /></button></Tippy>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {pendingRequests.length === 0 && (
                                                    <tr><td colSpan={4} className="text-center py-20 opacity-30 italic font-black uppercase tracking-widest">No pending approvals</td></tr>
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

            {/* Request Modal */}
            <Transition appear show={showModal} as={Fragment}>
                <Dialog as="div" open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-[black]/60" /></Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-lg bg-white dark:bg-[#0e1726] shadow-2xl">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                        <h5 className="text-xl font-black text-indigo-600 uppercase tracking-tight italic">New Request</h5>
                                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><IconX /></button>
                                    </div>
                                    <form onSubmit={handleSubmit}>
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Request Type</label>
                                                <select className="form-select text-sm font-semibold" value={formData.request_type} onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}>
                                                    <option value="wfh">Work From Home</option>
                                                    <option value="wfo">Work From Office</option>
                                                </select>
                                            </div>
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
                                            <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline-danger">Cancel</button>
                                            <button type="submit" className="btn btn-primary">Submit</button>
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
