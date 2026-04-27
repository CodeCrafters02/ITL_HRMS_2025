import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconPrinter from '../../components/Icon/IconPrinter';
import IconDownload from '../../components/Icon/IconDownload';
import IconEdit from '../../components/Icon/IconEdit';
import IconSave from '../../components/Icon/IconSave';
import IconX from '../../components/Icon/IconX';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type CompanyInfo = {
    name: string;
    address: string;
    bank_name: string;
    account_no: string;
    ifsc_code: string;
    branch_name: string;
};

type DisbursementEmployee = {
    id: number;
    employee_id: string;
    full_name: string;
    bank_name: string;
    account_no: string;
    ifsc_code: string;
    gross_salary: number;
    loan_emi: number;
    loan_disbursement: number;
    net_salary: number;
    days_paid: number;
};

type DisbursementData = {
    company: CompanyInfo;
    period: { from_date: string; to_date: string };
    summary: { total_employees: number; total_amount: number };
    employees: DisbursementEmployee[];
};

const SalaryDisbursement = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DisbursementData | null>(null);
    const [fromDate, setFromDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; });
    const [toDate, setToDate] = useState(() => { const d = new Date(); return d.toISOString().slice(0, 10); });
    const [isEditingCompany, setIsEditingCompany] = useState(false);
    const [editCompany, setEditCompany] = useState<CompanyInfo | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Salary Disbursement Statement'));
        fetchData();
    }, [dispatch]);

    const hdr = () => {
        const t = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (t) h['Authorization'] = `Bearer ${t}`;
        return h;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/app/salary-disbursement-statement/?from_date=${fromDate}&to_date=${toDate}`, { headers: hdr() });
            if (r.ok) {
                const json = await r.json();
                setData(json);
                setEditCompany(json.company);
            } else {
                const err = await r.json();
                console.error('API Error:', err);
                Swal.fire('Error', err.error || 'Failed to fetch disbursement data', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCompany = async () => {
        if (!editCompany) return;
        try {
            const r = await fetch(`${API}/app/company-update/`, {
                method: 'POST',
                headers: hdr(),
                body: JSON.stringify(editCompany)
            });
            if (r.ok) {
                Swal.fire('Success', 'Company bank details updated', 'success');
                setIsEditingCompany(false);
                fetchData();
            } else {
                Swal.fire('Error', 'Failed to update company details', 'error');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadExcel = async () => {
        try {
            const r = await fetch(`${API}/app/salary-disbursement-statement/?from_date=${fromDate}&to_date=${toDate}&download_excel=true`, { headers: hdr() });
            if (r.ok) {
                const blob = await r.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Salary_Disbursement_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                const err = await r.json();
                Swal.fire('Error', err.error || 'Failed to download excel', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Network error while downloading excel', 'error');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-6">

            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#14b8a6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Salary Disbursement Statement</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Generate and manage professional salary transfer letters for bank disbursements.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 mb-6 print:hidden">
                <div className="flex items-center gap-2">
                    <button onClick={handleDownloadExcel} className="btn btn-outline-success gap-2">
                        <IconDownload className="w-5 h-5" />
                        Download Excel
                    </button>
                    <button onClick={handlePrint} className="btn btn-primary gap-2">
                        <IconPrinter className="w-5 h-5" />
                        Print Letter
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="panel flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">From Date</label>
                        <input type="date" className="form-input py-1.5" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">To Date</label>
                        <input type="date" className="form-input py-1.5" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <button className="btn btn-primary mt-5" onClick={fetchData} disabled={loading}>
                        {loading ? 'Fetching...' : 'Generate Statement'}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-outline-primary" onClick={handlePrint}>
                        <IconPrinter className="mr-2" /> Print Letter
                    </button>
                </div>
            </div>

            {data && (
                <div className="panel p-0 overflow-hidden border-0 shadow-lg print:shadow-none print:m-0">
                    <div className="bg-white p-10 max-w-[900px] mx-auto min-h-[1000px] text-gray-800 font-serif leading-relaxed print:p-0 print:max-w-full">
                        {/* Letter Header */}
                        <div className="border-b-2 border-gray-100 pb-8 mb-8 flex justify-between items-start">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold text-primary uppercase tracking-tight">{data.company.name}</h1>
                                <p className="text-sm whitespace-pre-wrap max-w-md text-gray-600 italic">{data.company.address}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="font-bold">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                <p className="text-xs text-gray-400">Ref: ITL/PAY/{new Date().getFullYear()}/{new Date().getMonth()+1}</p>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="mb-8">
                            <p className="font-bold">To,</p>
                            <div className="flex items-center group relative">
                                <p className="font-bold">{data.company.bank_name || 'Bank Name Not Set'}, {data.company.branch_name || 'Branch Not Set'}</p>
                                {!isEditingCompany && (
                                    <button onClick={() => setIsEditingCompany(true)} className="ml-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                        <IconEdit className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-4 font-bold underline uppercase">Subject: Request for salary transfer for the period {formatDate(data.period.from_date)} to {formatDate(data.period.to_date)}</p>
                        </div>

                        {/* Company Details Edit */}
                        {isEditingCompany && (
                            <div className="bg-primary/5 p-4 rounded-lg mb-8 border border-primary/20 print:hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-primary">Edit Company Bank Details</h3>
                                    <button onClick={() => setIsEditingCompany(false)}><IconX /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold uppercase">Bank Name</label><input className="form-input" value={editCompany?.bank_name} onChange={e => setEditCompany({...editCompany!, bank_name: e.target.value})} /></div>
                                    <div><label className="text-xs font-bold uppercase">Branch Name</label><input className="form-input" value={editCompany?.branch_name} onChange={e => setEditCompany({...editCompany!, branch_name: e.target.value})} /></div>
                                    <div><label className="text-xs font-bold uppercase">Account Number</label><input className="form-input" value={editCompany?.account_no} onChange={e => setEditCompany({...editCompany!, account_no: e.target.value})} /></div>
                                    <div><label className="text-xs font-bold uppercase">IFSC Code</label><input className="form-input" value={editCompany?.ifsc_code} onChange={e => setEditCompany({...editCompany!, ifsc_code: e.target.value})} /></div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button className="btn btn-primary" onClick={handleUpdateCompany}><IconSave className="mr-2" /> Save Details</button>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="mb-6">
                            <p>Dear Sir/Madam,</p>
                            <p className="mt-2 text-justify">
                                We request you to kindly debit our company account number <strong>{data.company.account_no || '_________________'}</strong> and credit the salaries to the following employee bank accounts for the month of {new Date(data.period.from_date).toLocaleString('default', { month: 'long', year: 'numeric' })}.
                            </p>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto border rounded-lg mb-8">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-3 text-left border-r w-10">Sl.</th>
                                        <th className="p-3 text-left border-r">Employee Name</th>
                                        <th className="p-3 text-left border-r">Emp ID</th>
                                        <th className="p-3 text-left border-r">Bank Details</th>
                                        <th className="p-3 text-left border-r">Account No</th>
                                        <th className="p-3 text-right border-r">Loan EMI</th>
                                        <th className="p-3 text-right border-r">Loan Disb.</th>
                                        <th className="p-3 text-right">Net Credit (INR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.employees.map((emp, idx) => (
                                        <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50/50">
                                            <td className="p-3 border-r text-center">{idx + 1}</td>
                                            <td className="p-3 border-r font-bold">{emp.full_name}</td>
                                            <td className="p-3 border-r text-gray-500 uppercase">{emp.employee_id || 'N/A'}</td>
                                            <td className="p-3 border-r">
                                                <div className="text-xs font-bold">{emp.bank_name || 'N/A'}</div>
                                                <div className="text-[10px] text-gray-400">IFSC: {emp.ifsc_code || 'N/A'}</div>
                                            </td>
                                            <td className="p-3 border-r font-mono tracking-wider">{emp.account_no || 'N/A'}</td>
                                            <td className="p-3 border-r text-right text-red-500 font-bold">
                                                {emp.loan_emi > 0 ? `−₹${emp.loan_emi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="p-3 border-r text-right text-emerald-600 font-bold">
                                                {emp.loan_disbursement > 0 ? `+₹${emp.loan_disbursement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="p-3 text-right font-bold text-primary">₹{emp.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50/50">
                                    <tr className="font-bold border-t-2">
                                        <td colSpan={5} className="p-4 text-right uppercase tracking-wider text-gray-500">Total Disbursement Amount:</td>
                                        <td className="p-4 text-right text-xl text-primary">₹{data.summary.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="grid grid-cols-2 gap-8 mb-16">
                            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Disbursement Summary</h4>
                                <div className="flex justify-between text-sm">
                                    <span>Total Employees:</span>
                                    <span className="font-bold">{data.summary.total_employees}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Currency:</span>
                                    <span className="font-bold text-primary">INR (Indian Rupee)</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end text-right">
                                <p className="font-bold italic">For {data.company.name},</p>
                                <div className="mt-12">
                                    <div className="w-48 h-px bg-gray-300 ml-auto mb-1"></div>
                                    <p className="font-bold">(Authorized Signatory)</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center text-[10px] text-gray-300 italic border-t pt-2">
                            This is a computer-generated statement and does not require a physical signature.
                        </div>
                    </div>
                </div>
            )}

            {!data && !loading && (
                <div className="panel py-20 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconPrinter className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">No Statement Data</h2>
                        <p className="text-gray-500">Select a date range and click "Generate Statement".</p>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 1cm; }
                    body { background: white !important; }
                    .main-container { padding: 0 !important; }
                    .panel { border: none !important; box-shadow: none !important; padding: 0 !important; }
                }
            ` }} />
        </div>
    );
};

export default SalaryDisbursement;
