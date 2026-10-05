import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { authFetch } from '../../utils/authFetch';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import IconEye from '../../components/Icon/IconEye';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconSearch from '../../components/Icon/IconSearch';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API = `${API_BASE_URL}/employee/registration-requests/`;

interface RegistrationRequest {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    full_name: string;
    email: string;
    mobile: string;
    gender: string;
    date_of_birth: string | null;
    temporary_address: string;
    permanent_address: string;
    aadhar_no: string;
    pan_no: string;
    desired_department: string;
    desired_designation: string;
    previous_employer: string;
    previous_designation: string;
    total_experience_years: string | null;
    message: string;
    status: 'pending' | 'approved';
    company_name: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    created_at: string;
}

const fmt = (d?: string | null, withTime = false) =>
    d ? new Date(d).toLocaleString('en-IN', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ago = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const h = Math.floor(mins / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const RegistrationRequests = () => {
    const dispatch = useDispatch();
    const [tab, setTab] = useState<'pending' | 'approved'>('pending');
    const [rows, setRows] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<RegistrationRequest | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Registration Requests'));
    }, [dispatch]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API}?status=${tab}`);
            if (res.ok) {
                setRows(await res.json());
            } else {
                const err = await res.json().catch(() => ({}));
                setRows([]);
                if (res.status === 403) Swal.fire('Access denied', err.detail || 'Only company admins can review registrations.', 'warning');
            }
        } catch {
            Swal.fire('Error', 'Could not load registration requests.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            [r.full_name, r.email, r.mobile, r.desired_designation, r.desired_department].some((v) => (v || '').toLowerCase().includes(q)),
        );
    }, [rows, search]);

    const approve = async (r: RegistrationRequest) => {
        const ok = await Swal.fire({
            title: `Accept ${r.full_name}?`,
            html: `<p class="text-sm">They will be added as an <b>employee of your company</b> and can sign in with <b>${r.email}</b>.<br/>Other companies will no longer see this request.</p>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, accept',
            confirmButtonColor: '#10B981',
        });
        if (!ok.isConfirmed) return;
        setBusyId(r.id);
        try {
            const res = await authFetch(`${API}${r.id}/approve/`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                await Swal.fire({
                    title: 'Employee added',
                    html: `${data.detail || 'Registration accepted.'}<br/><span class="text-sm text-gray-500">Employee ID: <b>${data.employee_id || '—'}</b>. Complete their department, designation and salary from Employee Register.</span>`,
                    icon: 'success',
                });
                setSelected(null);
            } else {
                Swal.fire(res.status === 409 ? 'Already taken' : 'Error', data.detail || 'Could not accept this request.', res.status === 409 ? 'info' : 'error');
            }
            load();
        } finally {
            setBusyId(null);
        }
    };

    const dismiss = async (r: RegistrationRequest) => {
        const ok = await Swal.fire({
            title: `Dismiss ${r.full_name}?`,
            text: 'The request will be hidden for your company. Other companies can still accept it.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Dismiss',
            confirmButtonColor: '#EF4444',
        });
        if (!ok.isConfirmed) return;
        setBusyId(r.id);
        try {
            const res = await authFetch(`${API}${r.id}/dismiss/`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSelected(null);
                load();
            } else {
                Swal.fire('Error', data.detail || 'Could not dismiss this request.', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const Detail = ({ label, value }: { label: string; value?: string | null }) => (
        <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white-light break-words">{value || '—'}</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(var(--app-vh)_-_90px)] space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-0.5">Registration Requests</h2>
                    <p className="text-white/80 text-sm font-medium">
                        People who registered from the mobile app. The first company admin to accept a request adds that person to their company.
                    </p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconUserPlus className="w-48 h-48" />
                </div>
            </div>

            <div className="panel flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                        {(['pending', 'approved'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${tab === t ? 'bg-white dark:bg-gray-900 text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t === 'pending' ? 'Pending' : 'Accepted by us'}
                                {t === tab && !loading && <span className="ml-2 badge bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px]">{rows.length}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, email, role…"
                                className="form-input pl-9 py-2 text-sm w-64"
                            />
                            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <button onClick={load} className="btn btn-outline-primary btn-sm flex items-center gap-2">
                            <IconRefresh className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="animate-spin border-4 border-primary border-t-transparent rounded-full w-10 h-10"></span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <IconCircleCheck className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="font-bold text-lg">{tab === 'pending' ? 'No pending registrations' : 'No accepted registrations yet'}</p>
                            <p className="text-sm">{search ? 'Try a different search.' : 'All caught up!'}</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Applicant</th>
                                        <th>Contact</th>
                                        <th>Requested role</th>
                                        <th>Experience</th>
                                        <th>{tab === 'pending' ? 'Submitted' : 'Accepted'}</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r) => (
                                        <tr key={r.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                        {r.first_name.charAt(0).toUpperCase()}
                                                        {(r.last_name || '').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{r.full_name}</p>
                                                        <p className="text-xs text-gray-400 capitalize">
                                                            {r.gender || '—'}
                                                            {r.date_of_birth ? ` · ${fmt(r.date_of_birth)}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-sm font-semibold flex items-center gap-1.5">
                                                    <IconMail className="w-3.5 h-3.5 text-gray-400" />
                                                    {r.email}
                                                </p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                                    <IconPhone className="w-3.5 h-3.5 text-gray-400" />
                                                    {r.mobile}
                                                </p>
                                            </td>
                                            <td>
                                                <p className="font-bold text-sm">{r.desired_designation || '—'}</p>
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">{r.desired_department || '—'}</p>
                                            </td>
                                            <td>
                                                <p className="text-sm font-bold">{r.total_experience_years ? `${Number(r.total_experience_years)} yrs` : 'Fresher'}</p>
                                                {r.previous_employer && <p className="text-xs text-gray-400">{r.previous_employer}</p>}
                                            </td>
                                            <td>
                                                {tab === 'pending' ? (
                                                    <span className="badge badge-outline-warning font-bold" title={fmt(r.created_at, true)}>
                                                        {ago(r.created_at)}
                                                    </span>
                                                ) : (
                                                    <div className="text-xs">
                                                        <p className="font-bold">{fmt(r.approved_at, true)}</p>
                                                        <p className="text-gray-400">by {r.approved_by_name || '—'}</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelected(r)}
                                                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                                                        title="View details"
                                                    >
                                                        <IconEye className="w-4 h-4" />
                                                    </button>
                                                    {tab === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => approve(r)}
                                                                disabled={busyId === r.id}
                                                                className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all shadow-sm disabled:opacity-50"
                                                                title="Accept into my company"
                                                            >
                                                                <IconChecks className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => dismiss(r)}
                                                                disabled={busyId === r.id}
                                                                className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all shadow-sm disabled:opacity-50"
                                                                title="Dismiss for my company"
                                                            >
                                                                <IconX className="w-4 h-4" />
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
                    )}
                </div>
            </div>

            {/* Details modal */}
            {selected && (
                <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="panel w-full max-w-2xl max-h-[90vh] overflow-auto p-0" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-5 text-white flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold">
                                    {selected.first_name.charAt(0).toUpperCase()}
                                    {(selected.last_name || '').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold">{selected.full_name}</h3>
                                    <p className="text-white/80 text-sm">
                                        {selected.desired_designation || '—'} · {selected.desired_department || '—'}
                                    </p>
                                    <p className="text-white/60 text-xs mt-1">Submitted {fmt(selected.created_at, true)}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <section>
                                <h6 className="font-bold text-sm mb-3 text-primary">Personal</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <Detail label="First name" value={selected.first_name} />
                                    <Detail label="Middle name" value={selected.middle_name} />
                                    <Detail label="Last name" value={selected.last_name} />
                                    <Detail label="Gender" value={selected.gender && selected.gender[0].toUpperCase() + selected.gender.slice(1)} />
                                    <Detail label="Date of birth" value={fmt(selected.date_of_birth)} />
                                </div>
                            </section>
                            <section>
                                <h6 className="font-bold text-sm mb-3 text-primary">Contact & identity</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <Detail label="Email" value={selected.email} />
                                    <Detail label="Mobile" value={selected.mobile} />
                                    <Detail label="Aadhaar" value={selected.aadhar_no} />
                                    <Detail label="PAN" value={selected.pan_no} />
                                    <div className="col-span-2 sm:col-span-3 grid sm:grid-cols-2 gap-4">
                                        <Detail label="Current address" value={selected.temporary_address} />
                                        <Detail label="Permanent address" value={selected.permanent_address} />
                                    </div>
                                </div>
                            </section>
                            <section>
                                <h6 className="font-bold text-sm mb-3 text-primary">Work</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <Detail label="Department" value={selected.desired_department} />
                                    <Detail label="Designation" value={selected.desired_designation} />
                                    <Detail label="Experience" value={selected.total_experience_years ? `${Number(selected.total_experience_years)} years` : 'Fresher'} />
                                    <Detail label="Previous employer" value={selected.previous_employer} />
                                    <Detail label="Previous designation" value={selected.previous_designation} />
                                </div>
                            </section>
                            {selected.message && (
                                <section>
                                    <h6 className="font-bold text-sm mb-2 text-primary">Note from applicant</h6>
                                    <p className="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3 whitespace-pre-wrap">{selected.message}</p>
                                </section>
                            )}
                            {selected.status === 'approved' && (
                                <div className="rounded-lg bg-success/10 text-success p-3 text-sm font-semibold">
                                    Accepted into {selected.company_name} by {selected.approved_by_name || '—'} on {fmt(selected.approved_at, true)}
                                </div>
                            )}
                        </div>

                        {selected.status === 'pending' && (
                            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 p-4">
                                <button onClick={() => dismiss(selected)} disabled={busyId === selected.id} className="btn btn-outline-danger">
                                    Dismiss
                                </button>
                                <button onClick={() => approve(selected)} disabled={busyId === selected.id} className="btn btn-success flex items-center gap-2">
                                    <IconChecks className="w-4 h-4" />
                                    Accept into my company
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationRequests;
