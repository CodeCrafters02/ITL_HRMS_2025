import { useEffect, useState, Fragment, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconChecks from '../../components/Icon/IconChecks';
import IconSearch from '../../components/Icon/IconSearch';

import Modal from '../../components/Common/Modal';
import { Tab } from '@headlessui/react';
import Button from '../../components/Common/Button';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type LoanCategory = {
    id: number;
    name: string;
    description: string;
    min_tenure_months: number;
    max_repayment_months: number;
    max_loan_limit: string | number;
};

type LoanApplication = {
    id: number;
    category_name: string;
    requested_amount: string;
    repayment_months: number;
    interest_rate: string;
    emi_amount: string;
    status: string;
    created_at: string;
    repayment_end_month?: string;
};

const LoanApplication = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<LoanCategory[]>([]);
    const [myApplications, setMyApplications] = useState<LoanApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [selectedCat, setSelectedCat] = useState<LoanCategory | null>(null);

    // Pagination & Search state
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Form state
    const [amount, setAmount] = useState<number>(0);
    const [months, setMonths] = useState<number>(12);
    const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string; interest_rate?: number; max_repayment_months?: number } | null>(null);
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reason, setReason] = useState('');
    const [document, setDocument] = useState<File | null>(null);

    const hdr = () => {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    };

    useEffect(() => {
        dispatch(setPageTitle('Loan Application'));
        fetchCategories();
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchApplications();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page, pageSize]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/app/loan-categories/`, { headers: hdr() });
            if (res.ok) {
                const data = await res.json();
                setCategories(data.results || data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/app/loan-applications/`);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('page_size', pageSize.toString());
            if (search) url.searchParams.append('search', search);

            const res = await fetch(url.toString(), { headers: hdr() });
            if (res.ok) {
                const data = await res.json();
                setMyApplications(data.results || data);
                setTotalCount(data.count || (Array.isArray(data) ? data.length : 0));
                setTotalPages(Math.ceil((data.count || 0) / pageSize) || 1);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = (cat: LoanCategory) => {
        setSelectedCat(cat);
        setAmount(0);
        setMonths(cat.max_repayment_months);
        setEligibility(null);
        setReason('');
        setDocument(null);
        setModal(true);
    };

    const checkEligibility = async () => {
        if (!selectedCat || !amount || amount <= 0) return;
        setChecking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/app/loan-applications/check_eligibility/`, {
                method: 'POST',
                headers: hdr(),
                body: JSON.stringify({ category_id: selectedCat.id, amount }),
            });
            const data = await res.json();
            setEligibility(data);
        } catch (e) {
            console.error(e);
        } finally {
            setChecking(false);
        }
    };

    const submitApplication = async () => {
        if (!eligibility?.eligible) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('category', selectedCat?.id?.toString() || '');
            formData.append('requested_amount', amount.toString());
            formData.append('repayment_months', months.toString());
            formData.append('reason', reason);
            if (document) formData.append('supporting_document', document);

            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/loan-applications/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            if (res.ok) {
                Swal.fire('Success', 'Loan application submitted successfully!', 'success');
                setModal(false);
                setPage(1);
                fetchApplications();
            } else {
                const data = await res.json();
                Swal.fire('Error', data.error || 'Failed to submit application', 'error');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="badge badge-outline-success uppercase">Approved</span>;
            case 'REJECTED':
                return <span className="badge badge-outline-danger uppercase">Rejected</span>;
            case 'MANAGER_APPROVED':
                return <span className="badge badge-outline-primary uppercase">Manager Approved</span>;
            case 'CLEARED':
                return <span className="badge badge-outline-info uppercase">Cleared</span>;
            default:
                return <span className="badge badge-outline-warning uppercase">Pending</span>;
        }
    };

    const historyColumns: Column<LoanApplication>[] = [
        { key: 'category_name', title: 'Loan Type', render: (v) => <span className="font-bold text-gray-700">{v}</span> },
        { key: 'requested_amount', title: 'Amount', render: (v) => <span className="font-black text-emerald-600">₹{Number(v).toLocaleString()}</span> },
        { key: 'emi_amount', title: 'EMI', hideBelow: 'md', render: (v) => <span className="text-xs font-black text-amber-600">₹{Number(v).toLocaleString()} <span className="text-[8px] opacity-60">/mo</span></span> },
        { key: 'status', title: 'Status', align: 'center', render: (v) => getStatusBadge(v) },
        {
            key: 'payment', title: 'Payment Status', align: 'center', hideBelow: 'lg',
            render: (_v, app) =>
                app.status === 'CLEARED' ? (
                    <span className="flex items-center justify-center gap-1 text-xs font-black uppercase tracking-tighter text-emerald-600"><IconChecks className="h-3 w-3" /> Fully Repaid</span>
                ) : app.status === 'APPROVED' ? (
                    <span className="animate-pulse text-xs font-black uppercase tracking-tighter text-brand">Repayment In Progress</span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">—</span>
                ),
        },
        {
            key: 'repayment_end_month', title: 'Repayment Ends', hideBelow: 'lg',
            render: (v) => v ? <div className="flex flex-col text-[10px] font-bold uppercase tracking-tight text-brand"><span>{v}</span><span className="text-[8px] font-medium lowercase text-gray-400">final emi month</span></div> : '—',
        },
        { key: 'created_at', title: 'Date Applied', hideBelow: 'md', render: (v) => <span className="text-[10px] font-bold italic text-gray-400">{new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    ];

    return (
        <div className="pb-10">
            {/* Header Banner */}
            <PageHeader
                title="Employee Loan Center"
                subtitle="Financial support when you need it most. Check your eligibility and apply for company-sponsored loans with ease."
                variant="amber"
            />

            <Tab.Group>
                <Tab.List className="flex gap-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-1">
                    {['Apply for Loan', 'My Loan History'].map((t) => (
                        <Tab key={t} as={Fragment}>
                            {({ selected }) => (
                                <button className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none border-b-4 ${selected ? 'text-brand-600 border-brand-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                                    {t}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    {/* Tab 1: Apply */}
                    <Tab.Panel className="animate-fade-in-up">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2 space-y-6">
                                <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <IconInfoCircle className="w-5 h-5 text-brand-500" /> Available Loan Products
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="panel hover:shadow-xl transition-all duration-300 border-l-4 border-brand-500 bg-white dark:bg-[#0e1726]">
                                            <h3 className="text-xl font-black text-brand-600 mb-2">{cat.name}</h3>
                                            <p className="text-gray-500 text-sm mb-6 line-clamp-2 italic">{cat.description}</p>
                                            <div className="space-y-2 mb-6">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                                    <span className="text-gray-400">Max Limit:</span>
                                                    <span className="text-emerald-600 font-black">₹{Number(cat.max_loan_limit).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                                    <span className="text-gray-400">Repayment:</span>
                                                    <span className="text-rose-600 font-black">Up to {cat.max_repayment_months} Months</span>
                                                </div>
                                            </div>
                                            <Button className="w-full font-black !py-2.5 shadow-brand-500/20" onClick={() => handleApply(cat)} >
                                                Check Eligibility & Apply
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="panel bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30">
                                    <h2 className="text-md font-black text-brand-700 dark:text-brand-400 uppercase tracking-tight mb-4 flex items-center gap-2">Quick Guidelines</h2>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3">
                                            <div className="p-1.5 h-fit bg-white dark:bg-brand-900/40 rounded-lg shadow-sm">
                                                <IconChecks className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-700 dark:text-white-light uppercase">Tenure Based</p>
                                                <p className="text-[11px] text-gray-500 italic leading-relaxed">Your eligibility is calculated from your date of joining. Ensure you meet the minimum requirement for the chosen loan type.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <div className="p-1.5 h-fit bg-white dark:bg-brand-900/40 rounded-lg shadow-sm">
                                                <IconChecks className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-700 dark:text-white-light uppercase">Approval Flow</p>
                                                <p className="text-[11px] text-gray-500 italic leading-relaxed">Requests are first reviewed by your Reporting Manager and then by the HR Administrator.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* Tab 2: History */}
                    <Tab.Panel className="animate-fade-in-up">
                        <DataTable
                            columns={historyColumns}
                            data={myApplications}
                            loading={loading}
                            page={page}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                            searchValue={search}
                            onSearchChange={(v) => { setSearch(v); setPage(1); }}
                            searchPlaceholder="Search history..."
                            emptyMessage="No loan applications found"
                            entityLabel="applications"
                        />

                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>

            {/* Application Modal */}
            <Modal open={modal} onClose={() => setModal(false)} title={<>Apply for {selectedCat?.name}</>} size="lg">
                <div className="p-6 space-y-6">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Requested Amount (₹)</label>
                                                            <div className="relative">
                                                                <input type="number" className="form-input text-lg font-black pl-8 border-brand-100 focus:border-brand-500" value={amount} onChange={(e) => setAmount(Number(e.target.value))} onBlur={checkEligibility} />
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Repayment Period (Months)</label>
                                                            <input type="range" className="w-full accent-brand-600" min={1} max={selectedCat?.max_repayment_months || 12} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
                                                            <div className="flex justify-between mt-1 text-[10px] font-bold text-brand-600">
                                                                <span>1 Month</span>
                                                                <span className="bg-brand-100 px-2 py-0.5 rounded uppercase">{months} Months Selected</span>
                                                                <span>{selectedCat?.max_repayment_months} Months Max</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Reason for Loan</label>
                                                            <textarea 
                                                                className="form-textarea border-brand-100 focus:border-brand-500 min-h-[100px]" 
                                                                placeholder="Please specify why you are applying for this loan..."
                                                                value={reason}
                                                                onChange={(e) => setReason(e.target.value)}
                                                            ></textarea>
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Supporting Document</label>
                                                            <input 
                                                                type="file" 
                                                                className="form-input border-brand-100 focus:border-brand-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" 
                                                                onChange={(e) => setDocument(e.target.files ? e.target.files[0] : null)}
                                                            />
                                                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">PDF, JPG, or PNG (Max 5MB)</p>
                                                        </div>

                                                        {/* Eligibility Results */}
                                                        {checking ? (
                                                            <div className="flex items-center justify-center py-4 gap-2 text-brand-500">
                                                                <span className="animate-spin border-2 border-current border-l-transparent rounded-full w-4 h-4"></span>
                                                                <span className="text-[10px] font-bold uppercase animate-pulse">Calculating Eligibility...</span>
                                                            </div>
                                                        ) : (
                                                            eligibility && (
                                                                <div className={`p-4 rounded-xl border-2 ${eligibility.eligible ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'} transition-all`}>
                                                                    {eligibility.eligible ? (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center gap-2 text-emerald-600">
                                                                                <IconChecks className="w-5 h-5" />
                                                                                <span className="text-sm font-black uppercase">You are eligible!</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                                                                                <div>
                                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Interest Rate</p>
                                                                                    <p className="text-sm font-black text-emerald-700">{eligibility.interest_rate}% p.a.</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Estimated EMI</p>
                                                                                    <p className="text-sm font-black text-brand-700">₹{((amount + (amount * (eligibility.interest_rate || 0) * (months / 12)) / 100) / months).toFixed(2)}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex gap-3">
                                                                            <IconInfoCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                                                            <p className="text-xs font-bold text-rose-700 italic">{eligibility.reason}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 gap-3 border-t border-gray-100 dark:border-gray-800">
                                                        <Button variant="outline-danger" className="!px-6" onClick={() => setModal(false)} >
                                                            Cancel
                                                        </Button>
                                                        <Button className="!px-8 shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={submitApplication}
                                                            disabled={!eligibility?.eligible || submitting}>
                                                            {submitting ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3 h-3 mr-2"></span> : <IconPlus className="w-4 h-4 mr-2" />}
                                                            Submit Application
                                                        </Button>
                                                    </div>
            </Modal>
        </div>
    );
};

export default LoanApplication;
