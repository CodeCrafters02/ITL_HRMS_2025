import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { Dialog, Transition, Tab } from '@headlessui/react';
import IconX from '../../components/Icon/IconX';
import IconChecks from '../../components/Icon/IconChecks';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type LoanApplication = {
    id: number;
    employee_details: { full_name: string; employee_id: string };
    category_name: string;
    requested_amount: string;
    repayment_months: number;
    interest_rate: string;
    emi_amount: string;
    status: string;
    reason?: string;
    supporting_document?: string;
    created_at: string;
    repayment_end_month?: string;
};

const LoanApprovals = () => {
    const dispatch = useDispatch();
    const [applications, setApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    const userRole = localStorage.getItem('role'); // 'admin', 'employee', etc.

    const hdr = () => {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    useEffect(() => {
        dispatch(setPageTitle('Loan Approvals'));
        fetchData();
    }, [dispatch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/app/loan-applications/`, { headers: hdr() });
            if (res.ok) {
                const data = await res.json();
                setApplications(data.results || data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAction = (app: LoanApplication) => {
        setSelectedApp(app);
        setRemarks('');
        setModal(true);
    };

    const processApproval = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setProcessing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/app/loan-applications/${selectedApp.id}/approve/`, {
                method: 'POST',
                headers: hdr(),
                body: JSON.stringify({ status, remarks })
            });
            if (res.ok) {
                const data = await res.json();
                Swal.fire('Success', data.message, 'success');
                setModal(false);
                fetchData();
            } else {
                const data = await res.json();
                Swal.fire('Error', data.error || 'Failed to process approval', 'error');
            }
        } catch (e) { console.error(e); }
        finally { setProcessing(false); }
    };

    const handleClear = async (id: number) => {
        const result = await Swal.fire({
            title: 'Mark as Cleared?',
            text: 'This will mark the loan as fully repaid. The employee will then be able to apply for a new loan.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear it',
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_BASE_URL}/app/loan-applications/${id}/clear/`, {
                    method: 'POST',
                    headers: hdr(),
                });
                if (res.ok) {
                    Swal.fire('Cleared', 'Loan has been marked as cleared.', 'success');
                    fetchData();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="badge badge-outline-success uppercase font-black text-[9px]">Approved</span>;
            case 'REJECTED': return <span className="badge badge-outline-danger uppercase font-black text-[9px]">Rejected</span>;
            case 'MANAGER_APPROVED': return <span className="badge badge-outline-primary uppercase font-black text-[9px]">Mgr Approved</span>;
            case 'CLEARED': return <span className="badge badge-outline-info uppercase font-black text-[9px]">Cleared</span>;
            default: return <span className="badge badge-outline-warning uppercase font-black text-[9px]">Pending</span>;
        }
    };

    const pendingApps = applications.filter(a => a.status === 'PENDING' || a.status === 'MANAGER_APPROVED');
    const historyApps = applications.filter(a => a.status === 'APPROVED' || a.status === 'REJECTED' || a.status === 'CLEARED');

    return (
        <div className="pb-10">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] p-10 rounded-2xl shadow-xl mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase italic drop-shadow-md">Loan Approval Center</h1>
                    <p className="text-indigo-100 mt-2 text-lg font-medium opacity-90">Review and manage employee loan requests. Ensure financial compliance and support.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <Tab.Group>
                <Tab.List className="flex gap-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-1">
                    {['Active Requests', 'Approval History'].map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none border-b-4 ${selected ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                    {t} {t === 'Active Requests' && pendingApps.length > 0 && <span className="ml-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[9px]">{pendingApps.length}</span>}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    {/* Panel 1: Active Requests */}
                    <Tab.Panel className="animate-fade-in-up">
                        {loading ? (
                            <div className="flex justify-center py-20"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12"></span></div>
                        ) : pendingApps.length === 0 ? (
                            <div className="panel flex flex-col items-center justify-center py-20 text-center bg-gray-50/50">
                                <IconChecks className="w-16 h-16 text-gray-200 mb-4" />
                                <h3 className="text-lg font-bold text-gray-400">All clear! No pending loan requests.</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingApps.map(app => (
                                    <div key={app.id} className="panel group hover:shadow-2xl transition-all duration-300 border-t-4 border-amber-500 flex flex-col h-full bg-white dark:bg-[#0e1726]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800 dark:text-white-light leading-tight">{app.employee_details.full_name}</h3>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{app.employee_details.employee_id}</span>
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mb-6">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{app.category_name}</p>
                                            <p className="text-2xl font-black text-emerald-600">₹{Number(app.requested_amount).toLocaleString()}</p>
                                            <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-500 uppercase">
                                                <span>{app.repayment_months} Months</span>
                                                <span>EMI: ₹{Number(app.emi_amount).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleAction(app)}
                                            className="mt-auto w-full btn btn-primary font-black uppercase tracking-widest text-[10px] py-3 rounded-xl shadow-lg shadow-indigo-500/20"
                                        >
                                            Review & Action
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Tab.Panel>

                    {/* Panel 2: History */}
                    <Tab.Panel className="animate-fade-in-up">
                        <div className="panel table-responsive border rounded-xl overflow-hidden p-0">
                            <table className="table-hover">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="text-[10px] font-black uppercase">Employee</th>
                                        <th className="text-[10px] font-black uppercase">Loan Type</th>
                                        <th className="text-[10px] font-black uppercase text-right">Amount</th>
                                        <th className="text-[10px] font-black uppercase text-center">Status</th>
                                        <th className="text-[10px] font-black uppercase text-center">Payment Status</th>
                                        <th className="text-[10px] font-black uppercase">Ends On</th>
                                        <th className="text-[10px] font-black uppercase">Date</th>
                                        <th className="text-[10px] font-black uppercase text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyApps.map(app => (
                                        <tr key={app.id}>
                                            <td className="font-bold text-gray-700 dark:text-white-light">
                                                <p>{app.employee_details.full_name}</p>
                                                <p className="text-[9px] font-normal text-gray-400">{app.employee_details.employee_id}</p>
                                            </td>
                                            <td className="text-xs font-bold text-indigo-600 uppercase">{app.category_name}</td>
                                            <td className="font-black text-emerald-600 text-right">₹{Number(app.requested_amount).toLocaleString()}</td>
                                            <td className="text-center">{getStatusBadge(app.status)}</td>
                                            <td className="text-center">
                                                {app.status === 'CLEARED' ? (
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Fully Repaid</span>
                                                ) : app.status === 'APPROVED' ? (
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">In Progress</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">—</span>
                                                )}
                                            </td>
                                            <td className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                                                {app.repayment_end_month || '—'}
                                            </td>
                                            <td className="text-[10px] font-bold text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                                            <td className="text-center">
                                                {app.status === 'APPROVED' && (
                                                    <button 
                                                        onClick={() => handleClear(app.id)}
                                                        className="btn btn-sm btn-outline-success text-[9px] font-black uppercase px-2 py-1"
                                                    >
                                                        Mark Cleared
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>

            {/* Action Modal */}
            <Transition appear show={modal} as={Fragment}>
                <Dialog as="div" open={modal} onClose={() => setModal(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-lg bg-white dark:bg-[#0e1726] shadow-2xl">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                        <h5 className="text-xl font-black text-indigo-600 uppercase tracking-tight italic">Review Loan Request</h5>
                                        <button onClick={() => setModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><IconX /></button>
                                    </div>
                                    
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-center gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl">
                                            <div className="bg-indigo-600 text-white p-3 rounded-xl font-black text-xl">
                                                {selectedApp?.employee_details.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-800 dark:text-white-light">{selectedApp?.employee_details.full_name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedApp?.employee_details.employee_id}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="panel border-gray-100 dark:border-gray-800 p-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Loan Amount</p>
                                                <p className="text-lg font-black text-emerald-600">₹{Number(selectedApp?.requested_amount).toLocaleString()}</p>
                                            </div>
                                            <div className="panel border-gray-100 dark:border-gray-800 p-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                                                <p className="text-lg font-black text-indigo-600">{selectedApp?.repayment_months} Months</p>
                                            </div>
                                        </div>

                                        {selectedApp?.reason && (
                                            <div className="panel border-gray-100 dark:border-gray-800 p-4 bg-gray-50/30">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Employee's Reason</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{selectedApp.reason}"</p>
                                            </div>
                                        )}

                                        {selectedApp?.supporting_document && (
                                            <div className="panel border-gray-100 dark:border-gray-800 p-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Supporting Document</p>
                                                <a 
                                                    href={`${selectedApp.supporting_document}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                                                >
                                                    <IconInfoCircle className="w-4 h-4" />
                                                    View Attachment
                                                </a>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Decision Remarks</label>
                                            <textarea 
                                                className="form-textarea min-h-[100px] border-gray-200 focus:border-indigo-500" 
                                                placeholder="Add any internal remarks or reason for rejection..."
                                                value={remarks}
                                                onChange={e => setRemarks(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 gap-3 border-t border-gray-100 dark:border-gray-800">
                                        <button 
                                            onClick={() => processApproval('REJECTED')} 
                                            disabled={processing}
                                            className="btn btn-outline-danger font-bold uppercase tracking-widest text-[10px] px-6"
                                        >
                                            Reject Request
                                        </button>
                                        <button 
                                            onClick={() => processApproval('APPROVED')} 
                                            disabled={processing}
                                            className="btn btn-success font-bold uppercase tracking-widest text-[10px] px-8 shadow-emerald-500/20 shadow-lg"
                                        >
                                            {processing ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3 h-3 mr-2"></span> : <IconChecks className="w-4 h-4 mr-2" />}
                                            Approve Loan
                                        </button>
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

export default LoanApprovals;
