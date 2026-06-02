import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchPayrollBatches, fetchRolloutDashboard, rolloutPayslips, publishPayslip, bulkPublishPayslips, PayrollBatch, RolloutDashboardItem, generatePayslip } from '../Payroll/payslipApi';
import Swal from 'sweetalert2';
import IconFile from '../../components/Icon/IconFile';
import IconSend from '../../components/Icon/IconSend';
import IconSearch from '../../components/Icon/IconSearch';
import IconEye from '../../components/Icon/IconEye';
import IconDownload from '../../components/Icon/IconDownload';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconPlus from '../../components/Icon/IconPlus';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

const PayslipRollout = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Payslip Rollout'));
    }, [dispatch]);

    const [dashboardData, setDashboardData] = useState<RolloutDashboardItem[]>([]);
    const [batches, setBatches] = useState<PayrollBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | string | null>(null);
    const [search, setSearch] = useState('');
    
    const [dateRange, setDateRange] = useState<any>([
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    ]);
    const [viewedIds, setViewedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadBatches();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [dateRange]);

    const loadBatches = async () => {
        try {
            const data = await fetchPayrollBatches({ page_size: 100 });
            const results = Array.isArray(data) ? data : (data.results || []);
            setBatches(results.filter((b: any) => b.status === 'Locked'));
        } catch (error) {
            console.error('Failed to load batches', error);
        }
    };

    const loadDashboard = async () => {
        if (!dateRange || dateRange.length < 2) return;
        setLoading(true);
        try {
            const formatDate = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            
            const start = formatDate(dateRange[0]);
            const end = formatDate(dateRange[1]);
            const data = await fetchRolloutDashboard(undefined, undefined, start, end);
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard data', error);
            setDashboardData([]);
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (msg = '', type = 'success') => {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: msg,
            padding: '10px 20px',
        });
    };

    const handleGenerate = async (batchId: number | null, payrollId: number | null, isReport: boolean = false, regenerate: boolean = false) => {
        if (!payrollId) return;

        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const start = dateRange && dateRange[0] ? formatDate(dateRange[0]) : undefined;
        const end = dateRange && dateRange[1] ? formatDate(dateRange[1]) : undefined;

        setActionLoading(`gen-${payrollId}`);
        try {
            await generatePayslip(payrollId, isReport, regenerate, start, end);
            showMessage(regenerate ? 'Payslip regenerated successfully!' : 'Payslip generated successfully!');
            loadDashboard();
        } catch (error) {
            console.error('Failed to generate payslip', error);
            showMessage('Failed to generate payslip', 'error');
        } finally {
            setActionLoading(null);
        }
    };
    const handleGenerateAll = async () => {
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const start = dateRange && dateRange[0] ? formatDate(dateRange[0]) : undefined;
        const end = dateRange && dateRange[1] ? formatDate(dateRange[1]) : undefined;

        // Get all employees that can have payslips generated
        const eligible = dashboardData.filter(d => d.payroll_id);

        if (eligible.length === 0) {
            Swal.fire('Info', 'No employees found with payroll data for this period.', 'info');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Generate All Payslips',
            html: `This will generate/regenerate payslips for <b>${eligible.length}</b> employees.<br/>This may take a moment.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Generate All',
            confirmButtonColor: '#2563eb',
        });

        if (!confirm.isConfirmed) return;

        setActionLoading('generate-all');
        let success = 0;
        let failed = 0;

        for (const item of eligible) {
            try {
                const regenerate = !!item.payslip_id;
                await generatePayslip(item.payroll_id!, item.is_report, regenerate, start, end);
                success++;
            } catch (e) {
                console.error(`Failed for ${item.employee_name}`, e);
                failed++;
            }
        }

        setActionLoading(null);
        loadDashboard();

        Swal.fire({
            title: 'Batch Complete',
            html: `<b>${success}</b> payslips generated successfully.${failed > 0 ? `<br/><span style="color:red">${failed} failed.</span>` : ''}`,
            icon: failed > 0 ? 'warning' : 'success',
        });
    };

    const handleView = (payslipId: number, fileUrl: string) => {
        window.open(`${import.meta.env.VITE_API_BASE_URL}${fileUrl}`, '_blank');
        setViewedIds(prev => new Set(prev).add(payslipId));
    };

    const handleVerify = (payslipId: number) => {
        setViewedIds(prev => new Set(prev).add(payslipId));
    };

    const handleSend = async (payslipId: number) => {
        setActionLoading(`send-${payslipId}`);
        try {
            await publishPayslip(payslipId);
            Swal.fire('Success', 'Payslip published to employee dashboard.', 'success');
            loadDashboard();
        } catch (error: any) {
            Swal.fire('Error', 'Failed to send payslip', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkSend = async () => {
        const draftIds = dashboardData
            .filter(d => d.payslip_status === 'Draft')
            .map(d => d.id!);

        if (draftIds.length === 0) {
            Swal.fire('Info', 'No viewed draft payslips to send.', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Bulk Publish',
            text: `Are you sure you want to send ${draftIds.length} payslips?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Send All'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                await bulkPublishPayslips(draftIds);
                Swal.fire('Success', `${draftIds.length} payslips published.`, 'success');
                loadDashboard();
            } catch (error) {
                Swal.fire('Error', 'Bulk publish failed', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const filteredData = dashboardData.filter(d => 
        d.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        d.employee_id_str.toLowerCase().includes(search.toLowerCase()) ||
        (d.payslip_id && d.payslip_id.toLowerCase().includes(search.toLowerCase()))
    );

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20">
                            <IconFile className="w-10 h-10 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payslip Rollout</h1>
                            <p className="text-blue-200/80 mt-1 text-sm font-bold tracking-wide">Review and distribute salary statements with precision.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-3 px-4 py-2">
                            <span className="text-white/60 text-xs font-black uppercase tracking-widest">Period</span>
                            <Flatpickr
                                value={dateRange}
                                options={{
                                    mode: 'range',
                                    dateFormat: 'Y-m-d',
                                }}
                                className="form-input bg-transparent border-none text-white font-black text-xs focus:ring-0 w-64 cursor-pointer p-0"
                                onChange={(date) => setDateRange(date)}
                            />
                        </div>
                        <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>
                        <button 
                            onClick={handleGenerateAll}
                            disabled={!!actionLoading || loading}
                            className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                            {actionLoading === 'generate-all' ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5"></span> : <IconFile className="w-5 h-5" />}
                            Generate All
                        </button>
                        <button 
                            onClick={handleBulkSend}
                            className="btn bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3 rounded-xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <IconSend className="w-5 h-5" />
                            Send Verified
                        </button>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
            </div>

            <div className="panel border-none shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-black">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-2">
                    <div className="flex flex-col">
                        <h5 className="font-black text-xl text-gray-800 dark:text-white uppercase tracking-tight">Employees Dashboard</h5>
                        <p className="text-xs font-bold text-gray-400">
                            {dateRange[0]?.toLocaleDateString()} - {dateRange[1]?.toLocaleDateString()} Statistics
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group w-full md:w-72">
                            <input 
                                type="text" 
                                placeholder="Search Name or ID..." 
                                className="form-input py-3 ltr:pl-12 rtl:pr-12 rounded-xl border-gray-200 dark:border-gray-800 focus:border-blue-500 transition-all shadow-sm" 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                            />
                            <IconSearch className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="table-responsive rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                                <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Salary Breakdown</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Pay</th>
                                <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Payslip</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="animate-spin border-4 border-blue-500 border-l-transparent rounded-full w-12 h-12"></span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Payroll Data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <IconFile className="w-16 h-16 mb-4" />
                                            <p className="text-lg font-black uppercase tracking-tight">No Employees Found</p>
                                            <p className="text-xs font-bold text-center max-w-md">No active employees found for this company.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    {/* Employee Info */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-black text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-all flex-shrink-0">
                                                {item.employee_name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-black text-sm text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors truncate">{item.employee_name}</span>
                                                <span className="text-[10px] font-bold text-gray-400 tracking-wider">ID: {item.employee_id_str}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Attendance Breakdown */}
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{item.details.present_days}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Present</span>
                                                </div>
                                                <div className="text-gray-300 dark:text-gray-700 font-light">/</div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{item.details.expected_working_days}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Working</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                                {item.details.half_days > 0 && (
                                                    <span className="text-[8px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">½ Day: {item.details.half_days}</span>
                                                )}
                                                {item.details.paid_leaves > 0 && (
                                                    <span className="text-[8px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">PL: {item.details.paid_leaves}</span>
                                                )}
                                                {item.details.absent_days > 0 && (
                                                    <span className="text-[8px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">Absent: {item.details.absent_days}</span>
                                                )}
                                                {item.details.overtime_hours > 0 && (
                                                    <span className="text-[8px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">OT: {item.details.overtime_hours}h</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Salary Breakdown */}
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between gap-4 text-[10px]">
                                                <span className="text-gray-400 font-bold">Earned Basic</span>
                                                <span className="font-mono font-bold text-gray-600 dark:text-gray-400">₹{item.details.earned_basic.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-[10px]">
                                                <span className="text-emerald-500 font-bold">Gross</span>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{item.details.gross.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-[10px]">
                                                <span className="text-rose-500 font-bold">Deductions</span>
                                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">−₹{item.details.deductions.toLocaleString()}</span>
                                            </div>
                                            {item.details.ot_pay > 0 && (
                                                <div className="flex items-center justify-between gap-4 text-[10px]">
                                                    <span className="text-purple-500 font-bold">OT Pay</span>
                                                    <span className="font-mono font-bold text-purple-600">₹{item.details.ot_pay.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[8px] font-bold text-gray-300 dark:text-gray-600">Days Paid: {item.details.days_paid}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Net Pay */}
                                    <td className="px-4 py-4">
                                        <span className="font-mono text-base font-black text-gray-800 dark:text-white">₹{item.net_pay.toLocaleString()}</span>
                                    </td>

                                    {/* Payslip ID & Status */}
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            {item.payslip_id ? (
                                                <span className="font-mono text-[10px] font-bold p-1 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800 text-gray-500 inline-block">
                                                    {item.payslip_id}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Pending</span>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    item.payslip_status === 'Published' ? 'bg-green-500 animate-pulse' : 
                                                    item.payslip_status === 'Draft' ? 'bg-amber-500' : 'bg-gray-300'
                                                }`}></span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    item.payslip_status === 'Published' ? 'text-green-600' : 
                                                    item.payslip_status === 'Draft' ? 'text-amber-600' : 'text-gray-400'
                                                }`}>
                                                    {item.payslip_status}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {!item.payslip_id ? (
                                                <button 
                                                    onClick={() => handleGenerate(item.batch_id, item.payroll_id, item.is_report)}
                                                    disabled={!!actionLoading || !item.payroll_id}
                                                    className={`btn btn-sm flex items-center gap-2 py-2 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest ${
                                                        !item.payroll_id 
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                                                            : 'btn-outline-primary'
                                                    }`}
                                                >
                                                    {actionLoading === `gen-${item.payroll_id}` ? <span className="animate-spin border-2 border-primary border-l-transparent rounded-full w-3 h-3"></span> : <IconPlus className="w-3 h-3" />}
                                                    {item.payroll_id ? 'Generate' : 'No Payroll'}
                                                </button>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleView(item.id!, item.file!)}
                                                        className="btn btn-sm bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 hover:text-white text-gray-600 dark:text-gray-400 transition-all p-2 rounded-lg"
                                                        title="View & Verify"
                                                    >
                                                        <IconEye className={`w-4 h-4 ${viewedIds.has(item.id!) ? 'text-green-500 group-hover:text-white' : ''}`} />
                                                    </button>
                                                    {item.payslip_status === 'Draft' && (
                                                        <button 
                                                            onClick={() => handleSend(item.id!)}
                                                            disabled={!!actionLoading}
                                                            className={`btn btn-sm py-2 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md`}
                                                        >
                                                            {actionLoading === `send-${item.id}` ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3 h-3"></span> : <IconSend className="w-3 h-3" />}
                                                            Send
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleGenerate(item.batch_id, item.payroll_id, item.is_report, true)}
                                                        disabled={!!actionLoading}
                                                        className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 transition-colors"
                                                        title="Regenerate Payslip"
                                                    >
                                                        {actionLoading === `gen-${item.payroll_id}` ? <span className="animate-spin border-2 border-amber-600 border-l-transparent rounded-full w-4 h-4 inline-block"></span> : <IconRefresh className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PayslipRollout;
