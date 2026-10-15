import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconChecks from '../../components/Icon/IconChecks';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import IconCreditCard from '../../components/Icon/IconCreditCard';
import Modal from '../../components/Common/Modal';
import { Tab } from '@headlessui/react';
import Button from '../../components/Common/Button';
import CardGrid from '../../components/Common/CardGrid';
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
    const [pendingApps, setPendingApps] = useState<LoanApplication[]>([]);
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingPageSize, setPendingPageSize] = useState(9);
    const [pendingTotalCount, setPendingTotalCount] = useState(0);
    const [pendingSearch, setPendingSearch] = useState('');
    const [pendingLoading, setPendingLoading] = useState(false);

    // History tab backend pagination & search
    const [historyApps, setHistoryApps] = useState<LoanApplication[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    const [historySearch, setHistorySearch] = useState('');

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
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHistory();
        }, 300);
        return () => clearTimeout(timer);
    }, [historyPage, historyPageSize, historySearch]);

    const fetchPending = async () => {
        setPendingLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/loan-applications/`);
            url.searchParams.set('pending', 'true');
            url.searchParams.set('page', String(pendingPage));
            url.searchParams.set('page_size', String(pendingPageSize));
            if (pendingSearch.trim()) url.searchParams.set('search', pendingSearch.trim());
            const res = await fetch(url.toString(), { headers: hdr() });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setPendingApps(list);
                setPendingTotalCount(data.count !== undefined ? data.count : list.length);
            }
        } catch (e) { console.error(e); }
        finally { setPendingLoading(false); }
    };

    useEffect(() => {
        const timer = setTimeout(fetchPending, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingPage, pendingPageSize, pendingSearch]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/loan-applications/`);
            url.searchParams.set('history', 'true');
            url.searchParams.set('page', String(historyPage));
            url.searchParams.set('page_size', String(historyPageSize));
            if (historySearch.trim()) url.searchParams.set('search', historySearch.trim());

            const res = await fetch(url.toString(), { headers: hdr() });
            if (res.ok) {
                const data = await res.json();
                const list = data.results || (Array.isArray(data) ? data : []);
                setHistoryApps(list);
                setHistoryTotalCount(data.count !== undefined ? data.count : list.length);
            }
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    };

    const refreshAll = () => {
        fetchPending();
        fetchHistory();
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
                refreshAll();
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
                    refreshAll();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this! This will permanently delete the loan record.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e7515a',
            cancelButtonColor: '#4f46e5',
            confirmButtonText: 'Yes, delete it!',
            customClass: {
                popup: 'sweet-alerts'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_BASE_URL}/app/loan-applications/${id}/`, {
                    method: 'DELETE',
                    headers: hdr(),
                });
                if (res.ok) {
                    Swal.fire('Deleted!', 'Loan record has been deleted.', 'success');
                    refreshAll();
                } else {
                    Swal.fire('Error', 'Failed to delete record.', 'error');
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'An error occurred while deleting.', 'error');
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

    const historyColumns: Column<LoanApplication>[] = [
        {
            key: 'index',
            title: '#',
            width: '60px',
            align: 'center',
            render: (_val, _app, idx) => (
                <span className="font-semibold text-gray-500">{(historyPage - 1) * historyPageSize + (idx ?? 0) + 1}</span>
            ),
        },
        {
            key: 'employee',
            title: 'Employee',
            sortable: true,
            render: (_val, app) => (
                <div className="font-bold text-gray-700 dark:text-white-light">
                    <p>{app.employee_details.full_name}</p>
                    <p className="text-[10px] font-normal text-gray-400 font-mono">{app.employee_details.employee_id}</p>
                </div>
            ),
        },
        {
            key: 'category_name',
            title: 'Loan Type',
            sortable: true,
            render: (val) => <span className="text-xs font-bold text-brand-600 uppercase">{val}</span>,
        },
        {
            key: 'requested_amount',
            title: 'Amount',
            sortable: true,
            align: 'right',
            render: (val) => <span className="font-black text-emerald-600">₹{Number(val).toLocaleString()}</span>,
        },
        {
            key: 'status',
            title: 'Status',
            align: 'center',
            render: (val) => getStatusBadge(val),
        },
        {
            key: 'payment_status',
            title: 'Payment Status',
            align: 'center',
            render: (_val, app) => (
                app.status === 'CLEARED' ? (
                    <span className="badge badge-outline-success font-bold text-[10px]">Fully Repaid</span>
                ) : app.status === 'APPROVED' ? (
                    <span className="badge badge-outline-primary font-bold text-[10px]">In Progress</span>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )
            ),
        },
        {
            key: 'repayment_end_month',
            title: 'Ends On',
            render: (val) => <span className="text-xs font-semibold text-brand-500 uppercase">{val || '—'}</span>,
        },
        {
            key: 'created_at',
            title: 'Date',
            sortable: true,
            render: (val) => <span className="text-xs text-gray-400">{new Date(val).toLocaleDateString()}</span>,
        },
        {
            key: 'action',
            title: 'Action',
            align: 'center',
            render: (_val, app) => (
                <div className="flex items-center justify-center gap-2">
                    {app.status === 'APPROVED' && (
                        <Button variant="outline-success" size="sm" className="!px-2 !py-1"
                            type="button"
                            onClick={() => handleClear(app.id)}
                            
                        >
                            Mark Cleared
                        </Button>
                    )}
                    <Button variant="outline-danger" size="sm" className="!px-2 !py-1"
                        type="button"
                        onClick={() => handleDelete(app.id)}
                        
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="pb-10">
            {/* Header Banner */}
            <PageHeader
                icon={<IconCreditCard />}
                title="Loan Approval Center"
                subtitle="Review and manage employee loan requests. Ensure financial compliance and support."
                variant="amber"
            />

            <Tab.Group>
                <Tab.List className="flex gap-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-1">
                    {['Active Requests', 'Approval History'].map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none border-b-4 ${selected ? 'text-brand-600 border-brand-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                    {t} {t === 'Active Requests' && pendingTotalCount > 0 && <span className="ml-2 bg-brand-600 text-white px-2 py-0.5 rounded-full text-[9px]">{pendingTotalCount}</span>}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    {/* Panel 1: Active Requests */}
                    <Tab.Panel className="animate-fade-in-up">
                        <CardGrid
                            items={pendingApps}
                            loading={pendingLoading}
                            page={pendingPage}
                            pageSize={pendingPageSize}
                            totalCount={pendingTotalCount}
                            pageSizeOptions={[6, 9, 12, 24]}
                            onPageChange={setPendingPage}
                            onPageSizeChange={(sz) => { setPendingPageSize(sz); setPendingPage(1); }}
                            searchValue={pendingSearch}
                            onSearchChange={(v) => { setPendingSearch(v); setPendingPage(1); }}
                            searchPlaceholder="Search by employee or loan type..."
                            emptyMessage="All clear! No pending loan requests"
                            entityLabel="requests"
                            cols={3}
                            onRefresh={fetchPending}
                            renderCard={(app) => (
                                    <div className="panel group hover:shadow-2xl transition-all duration-300 border-t-4 border-amber-500 flex flex-col h-full bg-white dark:bg-[#0e1726]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800 dark:text-white-light leading-tight">{app.employee_details.full_name}</h3>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{app.employee_details.employee_id}</span>
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mb-6">
                                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">{app.category_name}</p>
                                            <p className="text-2xl font-black text-emerald-600">₹{Number(app.requested_amount).toLocaleString()}</p>
                                            <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-500 uppercase">
                                                <span>{app.repayment_months} Months</span>
                                                <span>EMI: ₹{Number(app.emi_amount).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex flex-col gap-2">
                                            <Button className="w-full font-black !py-3 shadow-brand-500/20" 
                                                onClick={() => handleAction(app)}

                                            >
                                                Review & Action
                                            </Button>
                                            <Button variant="outline-danger" className="w-full font-black !py-2 border-dashed opacity-70 hover:opacity-100" 
                                                onClick={() => handleDelete(app.id)}

                                            >
                                                Delete Request
                                            </Button>
                                        </div>
                                    </div>

                                )}
                        />
                    </Tab.Panel>

                    {/* Panel 2: History */}
                    <Tab.Panel className="animate-fade-in-up">
                        <DataTable
                            title="Approval History Records"
                            columns={historyColumns}
                            data={historyApps}
                            loading={historyLoading}
                            page={historyPage}
                            pageSize={historyPageSize}
                            totalCount={historyTotalCount}
                            onPageChange={(p) => setHistoryPage(p)}
                            onPageSizeChange={(sz) => {
                                setHistoryPageSize(sz);
                                setHistoryPage(1);
                            }}
                            searchValue={historySearch}
                            onSearchChange={(val) => {
                                setHistorySearch(val);
                                setHistoryPage(1);
                            }}
                            onRefresh={fetchHistory}
                            searchPlaceholder="Search history by employee, loan type..."
                            emptyMessage="No loan approval history records found."
                        />
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>

            {/* Action Modal */}
            <Modal open={modal} onClose={() => setModal(false)} title="Review Loan Request" size="lg">
                <div className="space-y-6">
                                                        <div className="flex items-center gap-4 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl">
                                                            <div className="bg-brand-600 text-white p-3 rounded-xl font-black text-xl">
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
                                                                <p className="text-lg font-black text-brand-600">{selectedApp?.repayment_months} Months</p>
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
                                                                    className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-bold text-sm"
                                                                >
                                                                    <IconInfoCircle className="w-4 h-4" />
                                                                    View Attachment
                                                                </a>
                                                            </div>
                                                        )}

                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Decision Remarks</label>
                                                            <textarea
                                                                className="form-textarea min-h-[100px] border-gray-200 focus:border-brand-500"
                                                                placeholder="Add any internal remarks or reason for rejection..."
                                                                value={remarks}
                                                                onChange={e => setRemarks(e.target.value)}
                                                            ></textarea>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 gap-3 border-t border-gray-100 dark:border-gray-800">
                                                        <Button variant="outline-danger" className="!px-6"
                                                            onClick={() => processApproval('REJECTED')}
                                                            disabled={processing}
                                                            
                                                        >
                                                            Reject Request
                                                        </Button>
                                                        <Button variant="success" className="!px-8"
                                                            onClick={() => processApproval('APPROVED')}
                                                            disabled={processing}
                                                            
                                                        >
                                                            {processing ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3 h-3 mr-2"></span> : <IconChecks className="w-4 h-4 mr-2" />}
                                                            Approve Loan
                                                        </Button>
                                                    </div>
            </Modal>
        </div>
    );
};

export default LoanApprovals;
