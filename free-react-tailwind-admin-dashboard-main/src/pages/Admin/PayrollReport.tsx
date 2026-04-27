import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconSave from '../../components/Icon/IconSave';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Employee = { id: number; employee_id: string; first_name: string; last_name: string; department_name: string | null; designation_name: string | null; basic_salary: number | string | null; gross_salary: number | string | null; active_loan_emi: number; active_loans_breakdown: any[]; };
type GComp = { id: number; name: string; calc_type: 'percentage' | 'fixed'; value: number; is_active: boolean; };
type DComp = { id: number; name: string; calc_type: 'percentage' | 'fixed'; value: number; deduct_from: 'basic' | 'gross'; has_threshold: boolean; threshold_on: 'basic' | 'gross'; threshold_amount: number; is_active: boolean; };
type AttSummary = {
    total_days: number;
    expected_working_days: number;
    present_days: number;
    half_days: number;
    full_day_leaves: number;
    checked_in_days: number;
    absent_days: number;
    overtime_hours: number;
    paid_leaves: number;
    unpaid_leaves: number;
    total_leaves: number;
    leave_details: any[];
    total_reimbursement: number;
    reimbursement_details: any[];
    total_asset_deduction: number;
    asset_deduction_details: any[];
};
type Chk = Record<string, boolean>;

const PayrollReport = () => {
    const dispatch = useDispatch();
    const [emps, setEmps] = useState<Employee[]>([]);
    const [gComps, setGComps] = useState<GComp[]>([]);
    const [dComps, setDComps] = useState<DComp[]>([]);
    const [selId, setSelId] = useState<number | null>(null);
    const [gChk, setGChk] = useState<Chk>({});
    const [dChk, setDChk] = useState<Chk>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; });
    const [toDate, setToDate] = useState(() => { const d = new Date(); return d.toISOString().slice(0, 10); });
    const [att, setAtt] = useState<AttSummary | null>(null);
    const [attLoading, setAttLoading] = useState(false);
    const [otEnabled, setOtEnabled] = useState(false);
    const [showReimb, setShowReimb] = useState(false);
    const [showLoanBreakdown, setShowLoanBreakdown] = useState(false);
    const [showAssetBreakdown, setShowAssetBreakdown] = useState(false);

    useEffect(() => { dispatch(setPageTitle('Payroll Report')); fetchData(); }, [dispatch]);

    const hdr = () => { const t = localStorage.getItem('access_token'); const h: Record<string, string> = { 'Content-Type': 'application/json' }; if (t) h['Authorization'] = `Bearer ${t}`; return h; };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eR, gR, dR] = await Promise.all([
                fetch(`${API}/app/employee/?page_size=10000`, { headers: hdr() }),
                fetch(`${API}/app/gross-components/?page_size=1000`, { headers: hdr() }),
                fetch(`${API}/app/deduction-components/?page_size=1000`, { headers: hdr() }),
            ]);
            if (eR.ok) { const d = await eR.json(); setEmps(d.results || d); }
            if (gR.ok) { const d = await gR.json(); setGComps((d.results || d).filter((c: GComp) => c.is_active)); }
            if (dR.ok) { const d = await dR.json(); setDComps((d.results || d).filter((c: DComp) => c.is_active)); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchAtt = async (empId: number) => {
        setAttLoading(true); setAtt(null);
        try {
            const r = await fetch(`${API}/app/payroll-attendance-summary/?employee_id=${empId}&from_date=${fromDate}&to_date=${toDate}`, { headers: hdr() });
            if (r.ok) setAtt(await r.json());
        } catch (e) { console.error(e); }
        finally { setAttLoading(false); }
    };

    const sel = useMemo(() => emps.find(e => e.id === selId) || null, [emps, selId]);
    const basic = useMemo(() => sel ? parseFloat(String(sel.basic_salary || 0)) : 0, [sel]);

    useEffect(() => {
        if (!sel) return;

        const loadConfig = async () => {
            // 1. Try backend first
            try {
                const savedR = await fetch(`${API}/app/finalized-salary/?employee=${sel.id}&from_date=${fromDate}&to_date=${toDate}`, { headers: hdr() });
                const savedData = await savedR.json();
                const serverSaved = savedData.results?.[0] || (Array.isArray(savedData) ? savedData[0] : null);

                if (serverSaved && serverSaved.config) {
                    setGChk(serverSaved.config.gChk || {});
                    setDChk(serverSaved.config.dChk || {});
                    setOtEnabled(!!serverSaved.config.otEnabled);
                    fetchAtt(sel.id);
                    return;
                }
            } catch (e) { console.error("Error loading server payroll", e); }

            // 2. Fallback to localStorage
            const key = `payroll_${sel.id}_${fromDate}_${toDate}`;
            const localSaved = localStorage.getItem(key);
            if (localSaved) {
                try {
                    const data = JSON.parse(localSaved);
                    setGChk(data.gChk || {});
                    setDChk(data.dChk || {});
                    setOtEnabled(!!data.otEnabled);
                    fetchAtt(sel.id);
                    return;
                } catch (e) { console.error("Error loading local payroll", e); }
            }

            // 3. Default: use all active components
            const gc: Chk = {}; gComps.forEach(c => gc[`g-${c.id}`] = true); setGChk(gc);
            const dc: Chk = {}; dComps.forEach(c => {
                if (c.has_threshold) { const b = c.threshold_on === 'basic' ? basic : parseFloat(String(sel.gross_salary || 0)); dc[`d-${c.id}`] = b >= c.threshold_amount; }
                else dc[`d-${c.id}`] = true;
            }); setDChk(dc);
            setOtEnabled(false);
            fetchAtt(sel.id);
        };

        loadConfig();
    }, [sel, gComps, dComps, basic, fromDate, toDate]);

    const earnedBasic = useMemo(() => {
        if (!att || att.expected_working_days === 0) return basic;
        const halfDays = att.half_days || 0;
        const payableDays = att.present_days + (halfDays * 0.5) + att.paid_leaves;
        return (basic / att.expected_working_days) * payableDays;
    }, [basic, att]);

    const otPay = useMemo(() => {
        if (!otEnabled || !att || att.expected_working_days === 0) return 0;
        // Standard hourly rate: (Monthly Basic / Working Days) / 8 hours
        const hourlyRate = (basic / att.expected_working_days) / 8;
        return hourlyRate * att.overtime_hours;
    }, [otEnabled, basic, att]);

    const parseLocDate = (s: string) => {
        if (!s) return new Date();
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const loanDisbAmount = useMemo(() => {
        if (!sel || !sel.active_loans_breakdown) return 0;
        const fDate = parseLocDate(fromDate);
        const tDate = parseLocDate(toDate);
        tDate.setHours(23, 59, 59, 999);
        return sel.active_loans_breakdown.reduce((sum: number, loan: any) => {
            const loanDate = parseLocDate(loan.date);
            if (loanDate >= fDate && loanDate <= tDate) {
                return sum + Number(loan.requested_amount);
            }
            return sum;
        }, 0);
    }, [sel, fromDate, toDate]);

    const grossItems = useMemo(() => {
        const items = [];
        // Show Full Basic for reference
        items.push({ label: 'Fixed Basic Salary', amount: basic, key: 'fixed-basic', secondary: true });
        // Show Earned Basic
        items.push({
            label: `Earned Basic Salary (${att ? (att.present_days + ((att.half_days || 0) * 0.5) + att.paid_leaves).toFixed(1) : 0} Days)`,
            amount: Math.round(earnedBasic * 100) / 100,
            key: 'earned-basic',
            highlight: true
        });

        if (otEnabled && otPay > 0) {
            items.push({ label: 'Overtime Pay', amount: Math.round(otPay * 100) / 100, key: 'ot-pay' });
        }

        gComps.forEach(c => {
            if (!gChk[`g-${c.id}`]) return;
            // Usually allowances are calculated on Fixed Basic, but some companies use Earned Basic.
            // We'll use Fixed Basic for the rule calculation as per standard HRMS patterns unless specified.
            const a = c.calc_type === 'percentage' ? (earnedBasic * c.value) / 100 : c.value;
            items.push({ label: c.name, amount: Math.round(a * 100) / 100, key: `g-${c.id}` });
        });

        if (att && att.total_reimbursement > 0) {
            items.push({ label: 'Reimbursement', amount: att.total_reimbursement, key: 'reimbursement', highlight: true });
        }

        if (loanDisbAmount > 0) {
            items.push({ label: 'Loan Credit', amount: loanDisbAmount, key: 'loan-credit', highlight: true });
        }

        return items;
    }, [basic, earnedBasic, otEnabled, otPay, gComps, gChk, att, loanDisbAmount]);

    const totGross = useMemo(() => {
        // Only sum items that are not 'secondary'
        return grossItems.filter(i => !i.secondary).reduce((s, i) => s + i.amount, 0);
    }, [grossItems]);

    const dedItems = useMemo(() => {
        const items: { label: string; amount: number; key: string }[] = [];
        dComps.forEach(c => {
            if (!dChk[`d-${c.id}`]) return;
            const base = c.deduct_from === 'basic' ? earnedBasic : totGross;
            const a = c.calc_type === 'percentage' ? (base * c.value) / 100 : c.value;
            items.push({ label: c.name, amount: Math.round(a * 100) / 100, key: `d-${c.id}` });
        });

        if (sel && sel.active_loans_breakdown) {
            let periodLoanEMI = 0;
            const matchedDates: string[] = [];
            const getOrdinal = (n: number) => {
                const s = ["th", "st", "nd", "rd"], v = n % 100;
                return s[(v - 20) % 10] || s[v] || s[0];
            };
            const fDate = parseLocDate(fromDate);
            const tDate = parseLocDate(toDate);

            sel.active_loans_breakdown.forEach((loan: any) => {
                const loanStart = parseLocDate(loan.date);
                const repaymentDay = loanStart.getDate();

                // Calculate end month
                const endMonthDate = new Date(loanStart);
                endMonthDate.setMonth(endMonthDate.getMonth() + loan.repayment_months);

                // Use the last day of the end month as the cutoff
                const endCutoff = new Date(endMonthDate.getFullYear(), endMonthDate.getMonth() + 1, 0);

                if (fDate <= endCutoff) {
                    // Check if repayment day falls between fDate and tDate
                    let match = false;
                    let curr = new Date(fDate);
                    // Reset time to avoid comparison issues
                    curr.setHours(0, 0, 0, 0);
                    const tDateCompare = new Date(tDate);
                    tDateCompare.setHours(23, 59, 59, 999);

                    while (curr <= tDateCompare) {
                        const lastDayInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
                        let isMatchDay = (curr.getDate() === repaymentDay);
                        if (!isMatchDay && repaymentDay > lastDayInMonth && curr.getDate() === lastDayInMonth) {
                            isMatchDay = true;
                        }

                        if (isMatchDay) {
                            periodLoanEMI += Number(loan.emi);
                            matchedDates.push(`${curr.getDate()}${getOrdinal(curr.getDate())} ${curr.toLocaleString('default', { month: 'short' })} ${curr.getFullYear()}`);
                        }
                        curr.setDate(curr.getDate() + 1);
                    }
                }
            });

            if (periodLoanEMI > 0) {
                const uniqueDates = Array.from(new Set(matchedDates)).join(', ');
                items.push({ label: `Loan EMI Deduction (${uniqueDates})`, amount: Math.round(periodLoanEMI * 100) / 100, key: 'loan-emi' });
            }
        }

        if (att && att.total_asset_deduction > 0) {
            items.push({ label: 'Asset Deduction', amount: Math.round(att.total_asset_deduction * 100) / 100, key: 'asset-deduction' });
        }

        return items;
    }, [dComps, dChk, earnedBasic, totGross, sel, fromDate, toDate, att]);

    const totDed = useMemo(() => dedItems.reduce((s, i) => s + i.amount, 0), [dedItems]);
    const net = useMemo(() => totGross - totDed, [totGross, totDed]);

    const filtered = useMemo(() => {
        if (!search.trim()) return emps;
        const q = search.toLowerCase();
        return emps.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q) || e.department_name?.toLowerCase().includes(q) || e.designation_name?.toLowerCase().includes(q));
    }, [emps, search]);

    const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleSave = async () => {
        if (!sel) return;
        setSaving(true);
        try {
            const payload = {
                employee: sel.id,
                from_date: fromDate,
                to_date: toDate,
                basic_salary: basic,
                earned_basic: Math.round(earnedBasic * 100) / 100,
                ot_pay: Math.round(otPay * 100) / 100,
                ot_hours: Math.round((att?.overtime_hours || 0) * 100) / 100,
                total_gross: Math.round(totGross * 100) / 100,
                total_deductions: Math.round(totDed * 100) / 100,
                loan_emi: Math.round((sel.active_loan_emi || 0) * 100) / 100,
                loan_disbursement: Math.round(loanDisbAmount * 100) / 100,
                asset_deduction: Math.round((att?.total_asset_deduction || 0) * 100) / 100,
                net_salary: Math.round(net * 100) / 100,
                days_paid: att ? (att.present_days + ((att.half_days || 0) * 0.5) + att.paid_leaves) : 0,
                config: { gChk, dChk, otEnabled }
            };

            // First check if a record exists for this employee/period to decide between POST or PUT
            // For simplicity in this demo, we'll try a specialized "upsert" logic or just POST and handle uniqueness in backend
            // But since we have unique_together, we should ideally find the ID first.
            // Simplified: we'll use a POST and if it fails with 400 (duplicate), we could try to find and PUT.
            // Better: use a dedicated endpoint or just handle it here.

            const r = await fetch(`${API}/app/finalized-salary/`, {
                method: 'POST',
                headers: hdr(),
                body: JSON.stringify(payload)
            });

            if (!r.ok) {
                const errData = await r.json();
                if (r.status === 400 && JSON.stringify(errData).includes('unique')) {
                    // Try to find the existing one to update
                    const searchR = await fetch(`${API}/app/finalized-salary/?employee=${sel.id}&from_date=${fromDate}&to_date=${toDate}`, { headers: hdr() });
                    const existing = await searchR.json();
                    const existingId = existing.results?.[0]?.id || existing[0]?.id;
                    if (existingId) {
                        await fetch(`${API}/app/finalized-salary/${existingId}/`, {
                            method: 'PUT',
                            headers: hdr(),
                            body: JSON.stringify(payload)
                        });
                    }
                } else {
                    throw new Error('Failed to save');
                }
            }

            // Also keep local storage for UI state persistence
            const key = `payroll_${sel.id}_${fromDate}_${toDate}`;
            localStorage.setItem(key, JSON.stringify({ ...payload, grossItems, dedItems, attendance: att }));

            Swal.fire({ title: 'Saved!', text: `Payroll finalized and saved for ${sel.first_name} ${sel.last_name}`, icon: 'success', timer: 2000, showConfirmButton: false, customClass: { popup: 'sweet-alerts' } });
        } catch (e) {
            Swal.fire({ title: 'Error', text: 'Failed to save payroll to server.', icon: 'error', customClass: { popup: 'sweet-alerts' } });
        } finally { setSaving(false); }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2563eb] to-[#7c3aed] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Payroll Report</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">Select an employee to view and configure their salary breakdown.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Employee List */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="panel p-0 overflow-hidden h-[calc(100vh-220px)] flex flex-col">
                        <div className="p-3 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-2">Employees</h3>
                            <input className="form-input text-sm" placeholder="Search by name, ID, dept..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? <div className="flex items-center justify-center py-16"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-8 h-8"></span></div>
                                : filtered.length === 0 ? <p className="text-center text-gray-400 text-sm py-8">No employees found.</p>
                                    : filtered.map(emp => (
                                        <button key={emp.id} onClick={() => setSelId(emp.id)} className={`w-full text-left px-4 py-3 border-b border-[#e0e6ed] dark:border-[#1b2e4b] transition-all duration-150 hover:bg-primary/5 ${selId === emp.id ? 'bg-primary/10 border-l-4 !border-l-primary' : ''}`}>
                                            <p className="font-semibold text-sm text-gray-800 dark:text-white">{emp.first_name} {emp.last_name}</p>
                                            <p className="text-xs text-gray-500">{emp.designation_name || '—'} • {emp.department_name || '—'}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">ID: {emp.employee_id}</p>
                                        </button>
                                    ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {!sel ? (
                        <div className="panel flex flex-col items-center justify-center py-24 text-center">
                            <svg className="w-20 h-20 text-gray-200 dark:text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400">Select an Employee</h3>
                            <p className="text-sm text-gray-400 mt-1">Choose an employee from the list to view their payroll breakdown.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Employee Info + Date Range */}
                            <div className="panel">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">{sel.first_name?.[0]}{sel.last_name?.[0]}</div>
                                    <div className="flex-1 min-w-[200px]">
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{sel.first_name} {sel.last_name}</h2>
                                        <p className="text-sm text-gray-500">{sel.designation_name} • {sel.department_name} • ID: {sel.employee_id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div><label className="text-xs font-semibold text-gray-500 block mb-1">From</label><input type="date" className="form-input form-input-sm text-xs" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                                        <div><label className="text-xs font-semibold text-gray-500 block mb-1">To</label><input type="date" className="form-input form-input-sm text-xs" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Summary */}
                            <div className="panel p-0 overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-3"><h3 className="text-white font-bold text-sm">Attendance Summary</h3></div>
                                <div className="p-4">
                                    {attLoading ? <div className="flex justify-center py-12"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12"></span></div>
                                        : !att ? <div className="flex flex-col items-center justify-center py-12 text-gray-400"><svg className="w-16 h-16 opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg><p>No attendance data available.</p></div>
                                            : (
                                                <div className="space-y-6">
                                                    {/* Overview Stats */}
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">Overview & Working Days</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                            {[
                                                                { label: 'Total Days', val: att.total_days, icon: '📅', color: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50', text: 'text-gray-700 dark:text-gray-300' },
                                                                { label: 'Working Days', val: att.expected_working_days, icon: '💼', color: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10', text: 'text-blue-700 dark:text-blue-400' },
                                                                { label: 'Present Days', val: att.present_days, icon: '✅', color: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-400' },
                                                                { label: 'Overtime (hrs)', val: att.overtime_hours, icon: '🕒', color: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10', text: 'text-purple-700 dark:text-purple-400' },
                                                                { label: 'Reimbursement', val: `₹${att.total_reimbursement}`, icon: '💰', color: 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10', text: 'text-green-700 dark:text-green-400' },
                                                                ...(loanDisbAmount > 0 ? [{ label: 'Loan Credit', val: `₹${loanDisbAmount.toLocaleString('en-IN')}`, icon: '🏦', color: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-400' }] : []),
                                                            ].map(s => (
                                                                <div key={s.label} className={`relative overflow-hidden group bg-gradient-to-br ${s.color} rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-white/50 dark:border-gray-700/30`}>
                                                                    <div className="flex items-center justify-between relative z-10">
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{s.label}</p>
                                                                            <p className={`text-2xl font-black ${s.text}`}>{s.val}</p>
                                                                        </div>
                                                                        <span className="text-2xl filter grayscale-[0.5] group-hover:grayscale-0 transition-all duration-300">{s.icon}</span>
                                                                    </div>
                                                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Status & Exceptions */}
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">Attendance Status & Exceptions</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                                            {[
                                                                { label: 'Half Days', val: att.half_days || 0, icon: '🌓', color: 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10', text: 'text-amber-700 dark:text-amber-400' },
                                                                { label: 'Full Day Leave', val: att.full_day_leaves || 0, icon: '🏠', color: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10', text: 'text-orange-700 dark:text-orange-400' },
                                                                { label: 'Checked In', val: att.checked_in_days || 0, icon: '📍', color: 'from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-900/10', text: 'text-sky-700 dark:text-sky-400' },
                                                                { label: 'Absent Days', val: att.absent_days, icon: '❌', color: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10', text: 'text-red-700 dark:text-red-400' },
                                                                { label: 'Total Leaves', val: att.paid_leaves + att.unpaid_leaves, icon: '📄', color: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-900/10', text: 'text-indigo-700 dark:text-indigo-400' },
                                                            ].map(s => (
                                                                <div key={s.label} className={`relative overflow-hidden group bg-gradient-to-br ${s.color} rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 border border-white/50 dark:border-gray-700/30`}>
                                                                    <div className="flex items-center justify-between relative z-10">
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{s.label}</p>
                                                                            <p className={`text-xl font-bold ${s.text}`}>{s.val}</p>
                                                                        </div>
                                                                        <span className="text-xl filter grayscale-[0.5] group-hover:grayscale-0 transition-all duration-300">{s.icon}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Leave Breakdown (Sub-stats) */}
                                                    <div className="flex flex-wrap gap-4 px-1">
                                                        <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 rounded-full border border-blue-100/50 dark:border-blue-800/20">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Paid Leaves: {att.paid_leaves}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-amber-50/50 dark:bg-amber-900/10 px-3 py-1.5 rounded-full border border-amber-100/50 dark:border-amber-800/20">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Unpaid Leaves: {att.unpaid_leaves}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 justify-end mt-2 p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/20">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" className="form-checkbox text-purple-600 rounded" checked={otEnabled} onChange={e => setOtEnabled(e.target.checked)} />
                                                            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Enable Overtime Payment</span>
                                                        </label>
                                                    </div>

                                                    {att.reimbursement_details.length > 0 && (
                                                        <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                                            <button
                                                                onClick={() => setShowReimb(!showReimb)}
                                                                className="flex items-center justify-between w-full group"
                                                            >
                                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Approved Reimbursements ({att.reimbursement_details.length})</h4>
                                                                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider group-hover:underline">
                                                                    {showReimb ? 'Hide Details' : 'Show Details'}
                                                                    <svg className={`w-4 h-4 transition-transform ${showReimb ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                </div>
                                                            </button>

                                                            {showReimb && (
                                                                <div className="table-responsive mt-3 animate-fade-in-down">
                                                                    <table className="min-w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                                                <th className="px-3 py-2 text-left">Date</th>
                                                                                <th className="px-3 py-2 text-left">Category</th>
                                                                                <th className="px-3 py-2 text-left">Description</th>
                                                                                <th className="px-3 py-2 text-right">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {att.reimbursement_details.map((r, i) => (
                                                                                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                                                    <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                                                                                    <td className="px-3 py-2 font-medium">{r.category}</td>
                                                                                    <td className="px-3 py-2 text-gray-500">{r.description}</td>
                                                                                    <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{r.amount}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {att.leave_details.length > 0 && (
                                                        <div className="mt-4">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Leave Details</h4>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead><tr className="border-b border-[#e0e6ed] dark:border-[#1b2e4b]"><th className="text-left py-2 px-2 font-semibold text-gray-500">Type</th><th className="text-left py-2 px-2 font-semibold text-gray-500">From</th><th className="text-left py-2 px-2 font-semibold text-gray-500">To</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Days</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Paid/Unpaid</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Status</th></tr></thead>
                                                                    <tbody>{att.leave_details.map((l: any, i: number) => (
                                                                        <tr key={i} className="border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                                            <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{l.leave_type}</td>
                                                                            <td className="py-2 px-2 text-gray-500">{l.from_date}</td>
                                                                            <td className="py-2 px-2 text-gray-500">{l.to_date}</td>
                                                                            <td className="py-2 px-2 text-center font-bold">{l.days}</td>
                                                                            <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{l.is_paid ? 'Paid' : 'Unpaid'}</span></td>
                                                                            <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span></td>
                                                                        </tr>
                                                                    ))}</tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                </div>
                            </div>

                            {/* Gross & Deductions side by side */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                <div className="panel p-0 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3"><h3 className="text-white font-bold text-sm">Gross Salary Components</h3></div>
                                    <div className="p-4 space-y-2">
                                        {grossItems.map((item: any) => (
                                            <div key={item.key} className={`flex items-center justify-between py-2 px-3 rounded-lg ${item.secondary ? 'opacity-60 bg-gray-50 dark:bg-gray-800/20 italic' : item.highlight ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20' : 'bg-gray-50 dark:bg-[#1b2e4b]'}`}>
                                                <div className="flex items-center gap-3">
                                                    {!item.highlight && !item.secondary && !item.key.startsWith('ot') && (
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox text-primary rounded"
                                                            checked={!!gChk[item.key]}
                                                            onChange={e => setGChk(p => ({ ...p, [item.key]: e.target.checked }))}
                                                        />
                                                    )}
                                                    {item.highlight && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                                    {item.secondary && <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                                                    {item.key.startsWith('ot') && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}

                                                    <span className={`text-sm font-semibold ${item.secondary ? 'text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>{item.label}</span>

                                                    {item.highlight && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">EARNED</span>}
                                                    {item.secondary && <span className="text-[10px] text-gray-400">(Monthly Fixed)</span>}
                                                </div>
                                                <span className={`font-mono font-bold text-sm ${item.secondary ? 'text-gray-500' : item.highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                    {fmt(item.amount)}
                                                </span>
                                            </div>
                                        ))}

                                        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-[#1b2e4b]">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dynamic Components</h4>
                                            {gComps.filter(c => !grossItems.find(i => i.key === `g-${c.id}`)).map(c => {
                                                const ch = !!gChk[`g-${c.id}`];
                                                const a = c.calc_type === 'percentage' ? (basic * c.value) / 100 : c.value;
                                                return (
                                                    <label key={c.id} className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all ${ch ? 'bg-gray-50 dark:bg-[#1b2e4b]' : 'opacity-40 grayscale bg-gray-50/50 dark:bg-gray-800/20'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" className="form-checkbox text-primary rounded" checked={ch} onChange={e => setGChk(p => ({ ...p, [`g-${c.id}`]: e.target.checked }))} />
                                                            <span className={`text-sm font-medium ${ch ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 line-through'}`}>{c.name}</span>
                                                            <span className="text-[10px] text-gray-400">{c.calc_type === 'percentage' ? `${c.value}% of Basic` : 'Fixed'}</span>
                                                        </div>
                                                        <span className={`font-mono text-sm font-bold ${ch ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300'}`}>{fmt(Math.round(a * 100) / 100)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-dashed border-emerald-200 dark:border-emerald-800/30">
                                            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Total Gross</span>
                                            <span className="font-mono font-extrabold text-lg text-emerald-700 dark:text-emerald-400">{fmt(totGross)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="panel p-0 overflow-hidden">
                                    <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3"><h3 className="text-white font-bold text-sm">Deduction Components</h3></div>
                                    <div className="p-4 space-y-2">
                                        {dedItems.length === 0 && <p className="text-sm text-gray-400 italic py-4 text-center">No deductions active.</p>}
                                        {dedItems.map((item: any) => (
                                             <div key={item.key} className="flex flex-col gap-1">
                                                 <div
                                                     onClick={() => {
                                                         if (item.key === 'loan-emi') setShowLoanBreakdown(!showLoanBreakdown);
                                                         if (item.key === 'asset-deduction') setShowAssetBreakdown(!showAssetBreakdown);
                                                     }}
                                                     className={`flex items-center justify-between py-2.5 px-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 ${(item.key === 'loan-emi' || item.key === 'asset-deduction') ? 'cursor-pointer hover:bg-red-100/50 transition-colors' : ''}`}
                                                 >
                                                     <div className="flex items-center gap-3">
                                                         {item.key.startsWith('d-') ? (
                                                             <input
                                                                 type="checkbox"
                                                                 className="form-checkbox text-danger rounded"
                                                                 checked={!!dChk[item.key]}
                                                                 onChange={e => setDChk(p => ({ ...p, [item.key]: e.target.checked }))}
                                                             />
                                                         ) : (
                                                             <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                         )}
                                                         <div>
                                                             <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</span>
                                                             {(item.key === 'loan-emi' || item.key === 'asset-deduction') && (
                                                                 <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                     {(item.key === 'loan-emi' ? showLoanBreakdown : showAssetBreakdown) ? 'Hide Breakdown' : 'Click to see breakdown'}
                                                                     <svg className={`w-3 h-3 transition-transform ${(item.key === 'loan-emi' ? showLoanBreakdown : showAssetBreakdown) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                 </p>
                                                             )}
                                                         </div>
                                                     </div>
                                                     <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">−{fmt(item.amount)}</span>
                                                 </div>

                                                 {item.key === 'loan-emi' && showLoanBreakdown && sel?.active_loans_breakdown && (
                                                     <div className="mx-3 mb-2 p-3 bg-white dark:bg-gray-800 rounded-b-lg border-x border-b border-red-100 dark:border-red-900/30 animate-fade-in-down shadow-inner">
                                                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Loans Detail</h5>
                                                         <div className="space-y-2">
                                                             {sel.active_loans_breakdown.map((loan: any) => (
                                                                  <div key={loan.id} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-gray-700 pb-1 last:border-0">
                                                                      <div>
                                                                          <p className="font-bold text-indigo-600">{loan.category}</p>
                                                                          <p className="text-[9px] text-gray-400">Approved: {loan.date}</p>
                                                                      </div>
                                                                      <div className="text-right">
                                                                          <p className="font-bold text-red-500">{fmt(loan.emi)}</p>
                                                                          <p className="text-[9px] text-gray-400">Principal: {fmt(loan.requested_amount)}</p>
                                                                      </div>
                                                                  </div>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 )}

                                                 {item.key === 'asset-deduction' && showAssetBreakdown && att?.asset_deduction_details && (
                                                     <div className="mx-3 mb-2 p-3 bg-white dark:bg-gray-800 rounded-b-lg border-x border-b border-red-100 dark:border-red-900/30 animate-fade-in-down shadow-inner">
                                                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Asset Charges Detail</h5>
                                                         <div className="space-y-2">
                                                             {att.asset_deduction_details.map((as: any) => (
                                                                 <div key={as.id} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-gray-700 pb-1 last:border-0">
                                                                     <div>
                                                                         <p className="font-bold text-red-600 uppercase tracking-tighter">{as.asset_name}</p>
                                                                         <p className="text-[9px] text-gray-400">Action: {as.action_type} • {as.date}</p>
                                                                     </div>
                                                                     <div className="text-right">
                                                                         <p className="font-bold text-red-500">{fmt(as.amount)}</p>
                                                                     </div>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                        ))}

                                        {/* Show inactive deductions for potential activation */}
                                        {dComps.filter(c => !dChk[`d-${c.id}`]).map(c => (
                                            <label key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer opacity-40 grayscale bg-gray-50/50 dark:bg-gray-800/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" className="form-checkbox text-danger rounded" checked={false} onChange={e => setDChk(p => ({ ...p, [`d-${c.id}`]: e.target.checked }))} />
                                                    <span className="text-sm font-medium text-gray-400 line-through">{c.name}</span>
                                                </div>
                                                <span className="font-mono text-sm font-bold text-gray-300">−{fmt(c.calc_type === 'percentage' ? ((c.deduct_from === 'basic' ? earnedBasic : totGross) * c.value / 100) : c.value)}</span>
                                            </label>
                                        ))}
                                        {dComps.length > 0 && <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-dashed border-red-200 dark:border-red-800/30"><span className="font-bold text-sm text-red-600 dark:text-red-400">Total Deductions</span><span className="font-mono font-extrabold text-lg text-red-600 dark:text-red-400">−{fmt(totDed)}</span></div>}
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary + Save */}
                            <div className="panel bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <p className="text-white/70 text-sm font-medium">Net Salary (Take Home)</p>
                                        <p className="text-3xl font-extrabold tracking-tight mt-1">{fmt(net)}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right space-y-1">
                                            <div className="flex items-center gap-3 justify-end"><span className="text-white/60 text-sm">Gross:</span><span className="font-mono font-bold text-sm text-emerald-300">{fmt(totGross)}</span></div>
                                            <div className="flex items-center gap-3 justify-end"><span className="text-white/60 text-sm">Deductions:</span><span className="font-mono font-bold text-sm text-red-300">−{fmt(totDed)}</span></div>
                                        </div>
                                        <button onClick={handleSave} disabled={saving} className={`btn bg-white text-primary font-bold px-6 py-2.5 rounded-lg shadow-lg hover:bg-gray-100 transition-all gap-2 ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
                                            {saving ? <span className="animate-spin border-2 border-primary border-l-transparent rounded-full w-4 h-4"></span> : <IconSave className="w-5 h-5" />}
                                            Save Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PayrollReport;
