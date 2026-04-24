import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconSave from '../../components/Icon/IconSave';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Employee = { id: number; employee_id: string; first_name: string; last_name: string; department_name: string|null; designation_name: string|null; basic_salary: number|string|null; gross_salary: number|string|null; };
type GComp = { id: number; name: string; calc_type: 'percentage'|'fixed'; value: number; is_active: boolean; };
type DComp = { id: number; name: string; calc_type: 'percentage'|'fixed'; value: number; deduct_from: 'basic'|'gross'; has_threshold: boolean; threshold_on: 'basic'|'gross'; threshold_amount: number; is_active: boolean; };
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
};
type Chk = Record<string, boolean>;

const PayrollReport = () => {
    const dispatch = useDispatch();
    const [emps, setEmps] = useState<Employee[]>([]);
    const [gComps, setGComps] = useState<GComp[]>([]);
    const [dComps, setDComps] = useState<DComp[]>([]);
    const [selId, setSelId] = useState<number|null>(null);
    const [gChk, setGChk] = useState<Chk>({});
    const [dChk, setDChk] = useState<Chk>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; });
    const [toDate, setToDate] = useState(() => { const d = new Date(); return d.toISOString().slice(0,10); });
    const [att, setAtt] = useState<AttSummary|null>(null);
    const [attLoading, setAttLoading] = useState(false);
    const [otEnabled, setOtEnabled] = useState(false);

    useEffect(() => { dispatch(setPageTitle('Payroll Report')); fetchData(); }, [dispatch]);

    const hdr = () => { const t = localStorage.getItem('access_token'); const h: Record<string,string> = {'Content-Type':'application/json'}; if(t) h['Authorization']=`Bearer ${t}`; return h; };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eR, gR, dR] = await Promise.all([
                fetch(`${API}/app/employee/?page_size=10000`, {headers: hdr()}),
                fetch(`${API}/app/gross-components/?page_size=1000`, {headers: hdr()}),
                fetch(`${API}/app/deduction-components/?page_size=1000`, {headers: hdr()}),
            ]);
            if(eR.ok){ const d=await eR.json(); setEmps(d.results||d); }
            if(gR.ok){ const d=await gR.json(); setGComps((d.results||d).filter((c:GComp)=>c.is_active)); }
            if(dR.ok){ const d=await dR.json(); setDComps((d.results||d).filter((c:DComp)=>c.is_active)); }
        } catch(e){ console.error(e); }
        finally{ setLoading(false); }
    };

    const fetchAtt = async (empId: number) => {
        setAttLoading(true); setAtt(null);
        try {
            const r = await fetch(`${API}/app/payroll-attendance-summary/?employee_id=${empId}&from_date=${fromDate}&to_date=${toDate}`, {headers: hdr()});
            if(r.ok) setAtt(await r.json());
        } catch(e){ console.error(e); }
        finally{ setAttLoading(false); }
    };

    const sel = useMemo(() => emps.find(e => e.id === selId)||null, [emps, selId]);
    const basic = useMemo(() => sel ? parseFloat(String(sel.basic_salary||0)) : 0, [sel]);

    useEffect(() => {
        if(!sel) return;
        
        // Try to load saved configuration
        const key = `payroll_${sel.id}_${fromDate}_${toDate}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.gChk && data.dChk) {
                    setGChk(data.gChk);
                    setDChk(data.dChk);
                    setOtEnabled(!!data.otEnabled);
                    fetchAtt(sel.id);
                    return;
                }
            } catch (e) { console.error("Error loading saved payroll", e); }
        }

        // Default: use all active components
        const gc: Chk = {}; gComps.forEach(c => gc[`g-${c.id}`]=true); setGChk(gc);
        const dc: Chk = {}; dComps.forEach(c => {
            if(c.has_threshold){ const b = c.threshold_on==='basic'? basic : parseFloat(String(sel.gross_salary||0)); dc[`d-${c.id}`]= b>=c.threshold_amount; }
            else dc[`d-${c.id}`]=true;
        }); setDChk(dc);
        setOtEnabled(false);
        fetchAtt(sel.id);
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

    const grossItems = useMemo(() => {
        const items = [];
        // Show Full Basic for reference
        items.push({label:'Fixed Basic Salary', amount: basic, key:'fixed-basic', secondary: true});
        // Show Earned Basic
        items.push({
            label: `Earned Basic Salary (${att ? (att.present_days + ((att.half_days || 0)*0.5) + att.paid_leaves).toFixed(1) : 0} Days)`, 
            amount: Math.round(earnedBasic * 100) / 100, 
            key:'earned-basic', 
            highlight: true
        });

        if (otEnabled && otPay > 0) {
            items.push({label:'Overtime Pay', amount: Math.round(otPay * 100) / 100, key:'ot-pay'});
        }

        gComps.forEach(c => { 
            if(!gChk[`g-${c.id}`]) return; 
            // Usually allowances are calculated on Fixed Basic, but some companies use Earned Basic.
            // We'll use Fixed Basic for the rule calculation as per standard HRMS patterns unless specified.
            const a = c.calc_type==='percentage'?(basic*c.value)/100:c.value; 
            items.push({label:c.name, amount:Math.round(a*100)/100, key:`g-${c.id}`}); 
        });
        return items;
    }, [basic, earnedBasic, otEnabled, otPay, gComps, gChk]);

    const totGross = useMemo(() => {
        // Only sum items that are not 'secondary'
        return grossItems.filter(i => !i.secondary).reduce((s,i)=>s+i.amount,0);
    }, [grossItems]);

    const dedItems = useMemo(() => {
        const items: {label:string;amount:number;key:string}[] = [];
        dComps.forEach(c => { if(!dChk[`d-${c.id}`]) return; const b = c.deduct_from==='basic'?basic:totGross; const a = c.calc_type==='percentage'?(b*c.value)/100:c.value; items.push({label:c.name, amount:Math.round(a*100)/100, key:`d-${c.id}`}); });
        return items;
    }, [dComps, dChk, basic, totGross]);

    const totDed = useMemo(() => dedItems.reduce((s,i)=>s+i.amount,0), [dedItems]);
    const net = useMemo(() => totGross - totDed, [totGross, totDed]);

    const filtered = useMemo(() => {
        if(!search.trim()) return emps;
        const q = search.toLowerCase();
        return emps.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q) || e.department_name?.toLowerCase().includes(q) || e.designation_name?.toLowerCase().includes(q));
    }, [emps, search]);

    const fmt = (n: number) => '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2, maximumFractionDigits:2});

    const handleSave = async () => {
        if(!sel) return;
        setSaving(true);
        try {
            const payload = {
                employee_id: sel.id, from_date: fromDate, to_date: toDate,
                gChk, dChk, otEnabled,
                gross_components: grossItems.filter(i => !i.secondary),
                deduction_components: dedItems,
                basic_salary: basic,
                earned_basic: earnedBasic,
                ot_pay: otPay,
                total_gross: totGross, total_deductions: totDed, net_salary: net,
                attendance: att,
            };
            // Store in localStorage for now until a dedicated backend endpoint is created
            const key = `payroll_${sel.id}_${fromDate}_${toDate}`;
            localStorage.setItem(key, JSON.stringify(payload));
            Swal.fire({title:'Saved!', text:`Payroll report saved for ${sel.first_name} ${sel.last_name}`, icon:'success', timer:2000, showConfirmButton:false, customClass:{popup:'sweet-alerts'}});
        } catch(e) {
            Swal.fire({title:'Error', text:'Failed to save.', icon:'error', customClass:{popup:'sweet-alerts'}});
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
                            <input className="form-input text-sm" placeholder="Search by name, ID, dept..." value={search} onChange={e=>setSearch(e.target.value)} />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? <div className="flex items-center justify-center py-16"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-8 h-8"></span></div>
                            : filtered.length===0 ? <p className="text-center text-gray-400 text-sm py-8">No employees found.</p>
                            : filtered.map(emp => (
                                <button key={emp.id} onClick={()=>setSelId(emp.id)} className={`w-full text-left px-4 py-3 border-b border-[#e0e6ed] dark:border-[#1b2e4b] transition-all duration-150 hover:bg-primary/5 ${selId===emp.id?'bg-primary/10 border-l-4 !border-l-primary':''}`}>
                                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{emp.first_name} {emp.last_name}</p>
                                    <p className="text-xs text-gray-500">{emp.designation_name||'—'} • {emp.department_name||'—'}</p>
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
                                        <div><label className="text-xs font-semibold text-gray-500 block mb-1">From</label><input type="date" className="form-input form-input-sm text-xs" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></div>
                                        <div><label className="text-xs font-semibold text-gray-500 block mb-1">To</label><input type="date" className="form-input form-input-sm text-xs" value={toDate} onChange={e=>setToDate(e.target.value)}/></div>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Summary */}
                            <div className="panel p-0 overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-3"><h3 className="text-white font-bold text-sm">Attendance Summary</h3></div>
                                <div className="p-4">
                                    {attLoading ? <div className="flex justify-center py-6"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-8 h-8"></span></div>
                                    : !att ? <p className="text-gray-400 text-sm text-center py-4">No attendance data available.</p>
                                    : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
                                                {[
                                                  {label:'Total Days', val:att.total_days, color:'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'},
                                                  {label:'Working Days', val:att.expected_working_days, color:'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'},
                                                  {label:'Present Days', val:att.present_days, color:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'},
                                                  {label:'Half Days', val:att.half_days || 0, color:'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'},
                                                  {label:'Full Day Leave', val:att.full_day_leaves || 0, color:'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'},
                                                  {label:'Checked In', val:att.checked_in_days || 0, color:'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'},
                                                  {label:'Absent Days', val:att.absent_days, color:'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'},
                                                  {label:'Overtime (hrs)', val:att.overtime_hours, color:'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'},
                                                  {label:'Paid Leaves', val:att.paid_leaves, color:'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'},
                                                  {label:'Unpaid Leaves', val:att.unpaid_leaves, color:'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'},
                                                ].map(s => (
                                                    <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                                                        <p className="text-2xl font-extrabold">{s.val}</p>
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide mt-1 opacity-70 leading-tight">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3 justify-end mt-2 p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/20">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox text-purple-600 rounded" checked={otEnabled} onChange={e => setOtEnabled(e.target.checked)} />
                                                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Enable Overtime Payment</span>
                                                </label>
                                            </div>
                                            {att.leave_details.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Leave Details</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead><tr className="border-b border-[#e0e6ed] dark:border-[#1b2e4b]"><th className="text-left py-2 px-2 font-semibold text-gray-500">Type</th><th className="text-left py-2 px-2 font-semibold text-gray-500">From</th><th className="text-left py-2 px-2 font-semibold text-gray-500">To</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Days</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Paid/Unpaid</th><th className="text-center py-2 px-2 font-semibold text-gray-500">Status</th></tr></thead>
                                                            <tbody>{att.leave_details.map((l:any,i:number) => (
                                                                <tr key={i} className="border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                                                                    <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{l.leave_type}</td>
                                                                    <td className="py-2 px-2 text-gray-500">{l.from_date}</td>
                                                                    <td className="py-2 px-2 text-gray-500">{l.to_date}</td>
                                                                    <td className="py-2 px-2 text-center font-bold">{l.days}</td>
                                                                    <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.is_paid?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{l.is_paid?'Paid':'Unpaid'}</span></td>
                                                                    <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status==='Approved'?'bg-green-100 text-green-700':l.status==='Rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{l.status}</span></td>
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
                                                            onChange={e => setGChk(p => ({...p, [item.key]: e.target.checked}))}
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
                                                            <input type="checkbox" className="form-checkbox text-primary rounded" checked={ch} onChange={e => setGChk(p => ({...p, [`g-${c.id}`]: e.target.checked}))}/>
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
                                        {dComps.length===0 && <p className="text-sm text-gray-400 italic py-4 text-center">No deductions configured.</p>}
                                        {dComps.map(c => { const ch=!!dChk[`d-${c.id}`]; const b=c.deduct_from==='basic'?basic:totGross; const a=c.calc_type==='percentage'?(b*c.value)/100:c.value; return (
                                            <label key={c.id} className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all ${ch?'bg-red-50/50 dark:bg-red-900/10':'opacity-50 bg-gray-50/50 dark:bg-gray-800/20'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" className="form-checkbox text-danger rounded" checked={ch} onChange={e=>setDChk(p=>({...p,[`d-${c.id}`]:e.target.checked}))}/>
                                                    <div>
                                                        <span className={`text-sm font-medium ${ch?'text-gray-700 dark:text-gray-200':'text-gray-400 line-through'}`}>{c.name}</span>
                                                        <p className="text-[10px] text-gray-400">{c.calc_type==='percentage'?`${c.value}%`:'₹ Fixed'} of {c.deduct_from==='basic'?'Basic':'Gross'}{c.has_threshold?` • Threshold: ${c.threshold_on} ≥ ₹${c.threshold_amount.toLocaleString('en-IN')}`:''}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-mono text-sm font-bold ${ch?'text-red-600 dark:text-red-400':'text-gray-300'}`}>−{fmt(Math.round(a*100)/100)}</span>
                                            </label>
                                        );})}
                                        {dComps.length>0 && <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-dashed border-red-200 dark:border-red-800/30"><span className="font-bold text-sm text-red-600 dark:text-red-400">Total Deductions</span><span className="font-mono font-extrabold text-lg text-red-600 dark:text-red-400">−{fmt(totDed)}</span></div>}
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
                                        <button onClick={handleSave} disabled={saving} className={`btn bg-white text-primary font-bold px-6 py-2.5 rounded-lg shadow-lg hover:bg-gray-100 transition-all gap-2 ${saving?'opacity-60 pointer-events-none':''}`}>
                                            {saving ? <span className="animate-spin border-2 border-primary border-l-transparent rounded-full w-4 h-4"></span> : <IconSave className="w-5 h-5"/>}
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
