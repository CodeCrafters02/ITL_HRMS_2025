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
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
import Button, { IconButton } from '../../components/Common/Button';
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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<RegistrationRequest | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Registration Requests'));
    }, [dispatch]);

    const load = async (query?: string) => {
        setLoading(true);
        try {
            const currentSearch = query !== undefined ? query : search;
            const url = new URL(API);
            url.searchParams.append('status', tab);
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (currentSearch.trim()) {
                url.searchParams.append('search', currentSearch.trim());
            }
            const res = await authFetch(url.toString());
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setRows(data.results);
                    setTotalCount(data.count ?? 0);
                } else {
                    const arr = Array.isArray(data) ? data : [];
                    setRows(arr);
                    setTotalCount(arr.length);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                setRows([]);
                setTotalCount(0);
                if (res.status === 403) Swal.fire('Access denied', err.detail || 'Only company admins can review registrations.', 'warning');
            }
        } catch {
            Swal.fire('Error', 'Could not load registration requests.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        const handler = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, page, pageSize, search]);

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

    const columns: Column<RegistrationRequest>[] = [
        {
            key: 'full_name',
            title: 'Applicant',
            sortable: true,
            render: (_val, r) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-brand-accent text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {r.first_name.charAt(0).toUpperCase()}
                        {(r.last_name || '').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white-light">{r.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">
                            {r.gender || '—'}
                            {r.date_of_birth ? ` · ${fmt(r.date_of_birth)}` : ''}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            title: 'Contact',
            render: (_val, r) => (
                <div>
                    <p className="text-xs font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-300">
                        <IconMail className="w-3.5 h-3.5 text-brand" />
                        {r.email}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <IconPhone className="w-3.5 h-3.5 text-emerald-500" />
                        {r.mobile}
                    </p>
                </div>
            ),
        },
        {
            key: 'desired_designation',
            title: 'Requested Role',
            sortable: true,
            render: (_val, r) => (
                <div>
                    <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{r.desired_designation || '—'}</p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mt-0.5">
                        {r.desired_department || '—'}
                    </span>
                </div>
            ),
        },
        {
            key: 'total_experience_years',
            title: 'Experience',
            render: (_val, r) => (
                <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-300">
                        {r.total_experience_years ? `${Number(r.total_experience_years)} yrs` : 'Fresher'}
                    </p>
                    {r.previous_employer && <p className="text-xs text-gray-400">{r.previous_employer}</p>}
                </div>
            ),
        },
        {
            key: 'created_at',
            title: tab === 'pending' ? 'Submitted' : 'Accepted',
            sortable: true,
            render: (_val, r) =>
                tab === 'pending' ? (
                    <span className="badge badge-outline-warning font-bold" title={fmt(r.created_at, true)}>
                        {ago(r.created_at)}
                    </span>
                ) : (
                    <div className="text-xs">
                        <p className="font-bold text-gray-800 dark:text-gray-300">{fmt(r.approved_at, true)}</p>
                        <p className="text-gray-400">by {r.approved_by_name || '—'}</p>
                    </div>
                ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, r) => (
                <div className="flex items-center justify-center gap-2">
                    <IconButton tone="primary"
                        onClick={() => setSelected(r)}
                        
                        title="View details"
                    >
                        <IconEye className="w-4 h-4" />
                    </IconButton>
                    {tab === 'pending' && (
                        <>
                            <button
                                onClick={() => approve(r)}
                                disabled={busyId === r.id}
                                className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all shadow-sm disabled:opacity-50"
                                title="Accept into my company"
                            >
                                <IconChecks className="w-4 h-4" />
                            </button>
                            <IconButton tone="danger"
                                onClick={() => dismiss(r)}
                                disabled={busyId === r.id}
                                
                                title="Dismiss for my company"
                            >
                                <IconX className="w-4 h-4" />
                            </IconButton>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col space-y-4">
            {/* Header Banner */}
            <PageHeader
                icon={<IconUserPlus />}
                title="Registration Requests"
                subtitle="People who registered from the mobile app. The first company admin to accept a request adds that person to their company."
                variant="rose"
            />

            {/* Reusable Data Table */}
            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                }}
                search={search}
                searchPlaceholder="Search name, email, role…"
                onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                }}
                onRefresh={load}
                filters={
                    <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 p-1 h-10 border border-gray-200 dark:border-gray-700">
                        {(['pending', 'approved'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => {
                                    setTab(t);
                                    setLoading(true);
                                }}
                                className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center ${
                                    tab === t
                                        ? 'bg-brand text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {t === 'pending' ? 'Pending' : 'Accepted by us'}
                                {t === tab && !loading && (
                                    <span className="ml-1.5 bg-white/20 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                                        {rows.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                }
            />

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
                                <Button variant="outline-danger" onClick={() => dismiss(selected)} disabled={busyId === selected.id} >
                                    Dismiss
                                </Button>
                                <Button variant="success" onClick={() => approve(selected)} disabled={busyId === selected.id} >
                                    <IconChecks className="w-4 h-4" />
                                    Accept into my company
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationRequests;
