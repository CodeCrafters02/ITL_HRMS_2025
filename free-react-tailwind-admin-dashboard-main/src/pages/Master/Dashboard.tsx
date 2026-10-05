import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconServer from '../../components/Icon/IconServer';
import IconUser from '../../components/Icon/IconUser';
import IconListCheck from '../../components/Icon/IconListCheck';
import IconSettings from '../../components/Icon/IconSettings';
import IconRefresh from '../../components/Icon/IconRefresh';
import { apiRequest, Badge, EmptyState, Identity, MasterPage, SectionCard, StatCard, StatGrid, Tone, TONES } from '../../components/Master';

interface CompanyAdmin {
    username: string;
    email: string;
}

interface CompanyData {
    id: number;
    name: string;
    location: string | null;
    email: string;
    logo: string | null;
    admins: CompanyAdmin[];
}

interface DashboardStats {
    total_companies: number;
    total_admins: number;
    total_masters: number;
    total_employees: number;
    companies: CompanyData[];
}

const DONUT_LENGTH = 2 * Math.PI * 50;

const QUICK_ACTIONS: { label: string; description: string; to: string; tone: Tone; icon: JSX.Element }[] = [
    { label: 'Companies', description: 'Add or edit company profiles', to: '/master/company', tone: 'primary', icon: <IconServer className="h-5 w-5" /> },
    { label: 'Users', description: 'Browse every account on the platform', to: '/master/user-management', tone: 'success', icon: <IconUsersGroup className="h-5 w-5" /> },
    { label: 'Administrators', description: 'Manage company admin accounts', to: '/master/administration', tone: 'violet', icon: <IconSettings className="h-5 w-5" /> },
];

const MasterDashboard = () => {
    const dispatch = useDispatch();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const firstName = localStorage.getItem('first_name') || (localStorage.getItem('username') || 'Master').split(/[@._]/)[0];
    const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const loadStats = useCallback(() => {
        setLoading(true);
        setError('');
        apiRequest<DashboardStats>('/app/master-dashboard/')
            .then(setStats)
            .catch((err) => setError(err?.message || 'Failed to load the dashboard.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Master Dashboard'));
        loadStats();
    }, [dispatch, loadStats]);

    const totalUsers = stats ? stats.total_admins + stats.total_masters + stats.total_employees : 0;
    const roles: { label: string; value: number; tone: Tone; stroke: string }[] = stats
        ? [
              { label: 'Employees', value: stats.total_employees, tone: 'warning', stroke: '#f59e0b' },
              { label: 'Admins', value: stats.total_admins, tone: 'primary', stroke: '#3b82f6' },
              { label: 'Masters', value: stats.total_masters, tone: 'violet', stroke: '#8b5cf6' },
          ]
        : [];
    const withoutAdmin = stats ? stats.companies.filter((company) => company.admins.length === 0).length : 0;
    let donutOffset = 0;

    return (
        <MasterPage
            title={`${greeting}, ${displayName}`}
            description={`${today} · Platform overview across every company.`}
            actions={
                <button type="button" className="btn btn-outline-primary gap-2" onClick={loadStats} disabled={loading}>
                    <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            }
        >
            {error && !stats ? (
                <SectionCard>
                    <EmptyState
                        title="Could not load the dashboard"
                        description={error}
                        action={
                            <button type="button" className="btn btn-primary btn-sm" onClick={loadStats}>
                                Try again
                            </button>
                        }
                    />
                </SectionCard>
            ) : (
                <>
                    <StatGrid>
                        <StatCard label="Companies" value={stats?.total_companies} loading={!stats} tone="primary" icon={<IconServer className="h-5 w-5" />} hint={stats ? (withoutAdmin ? `${withoutAdmin} without an admin` : 'All have an admin') : undefined} to="/master/company" />
                        <StatCard label="Admins" value={stats?.total_admins} loading={!stats} tone="success" icon={<IconListCheck className="h-5 w-5" />} hint="Company administrators" to="/master/administration" />
                        <StatCard label="Employees" value={stats?.total_employees} loading={!stats} tone="warning" icon={<IconUsersGroup className="h-5 w-5" />} hint="Across all companies" to="/master/user-management" />
                        <StatCard label="Masters" value={stats?.total_masters} loading={!stats} tone="violet" icon={<IconUser className="h-5 w-5" />} hint="Platform owners" />
                    </StatGrid>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <SectionCard title="User distribution" description="Accounts by role" action={<Link to="/master/user-management">View users</Link>}>
                            {!stats ? (
                                <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                            ) : (
                                <>
                                    <div className="relative mx-auto h-40 w-40">
                                        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" role="img" aria-label={`${totalUsers} users in total`}>
                                            <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-white/5" />
                                            {totalUsers > 0 &&
                                                roles.map((role) => {
                                                    const length = (role.value / totalUsers) * DONUT_LENGTH;
                                                    const circle = <circle key={role.label} cx="60" cy="60" r="50" fill="none" stroke={role.stroke} strokeWidth="12" strokeDasharray={`${length} ${DONUT_LENGTH}`} strokeDashoffset={-donutOffset} />;
                                                    donutOffset += length;
                                                    return circle;
                                                })}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{totalUsers}</span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Total users</span>
                                        </div>
                                    </div>
                                    <ul className="mt-5 space-y-2.5">
                                        {roles.map((role) => (
                                            <li key={role.label} className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                    <span className={`h-2 w-2 rounded-full ${TONES[role.tone].dot}`} />
                                                    {role.label}
                                                </span>
                                                <span className="tabular-nums">
                                                    <span className="font-semibold text-slate-900 dark:text-white">{role.value}</span>
                                                    <span className="ml-2 text-xs text-slate-400">{totalUsers ? Math.round((role.value / totalUsers) * 100) : 0}%</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </SectionCard>

                        <SectionCard className="lg:col-span-2" title="Companies" description="Registered organisations and their administrators" action={<Link to="/master/company">Manage companies</Link>} flush>
                            {!stats ? (
                                <div className="space-y-3 p-5">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                                    ))}
                                </div>
                            ) : stats.companies.length === 0 ? (
                                <EmptyState
                                    title="No companies yet"
                                    description="Add the first company to start onboarding its administrator and employees."
                                    icon={<IconServer className="h-6 w-6" />}
                                    action={
                                        <Link to="/master/company" className="btn btn-primary btn-sm">
                                            Add company
                                        </Link>
                                    }
                                />
                            ) : (
                                <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
                                    {stats.companies.map((company) => (
                                        <li key={company.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                                            <Identity name={company.name} src={company.logo} square secondary={[company.location, company.email].filter(Boolean).join(' · ')} />
                                            {company.admins.length > 0 ? (
                                                <Badge tone="primary">{company.admins.length === 1 ? company.admins[0].username : `${company.admins.length} admins`}</Badge>
                                            ) : (
                                                <Badge tone="warning" dot>
                                                    No admin
                                                </Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>
                    </div>

                    <SectionCard title="Quick actions" description="Jump straight to the most common tasks">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {QUICK_ACTIONS.map((action) => (
                                <Link
                                    key={action.to}
                                    to={action.to}
                                    className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition duration-200 hover:border-primary/40 hover:bg-slate-50 dark:border-[#1b2e4b] dark:hover:bg-white/[0.03]"
                                >
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[action.tone].soft}`}>{action.icon}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-900 group-hover:text-primary dark:text-white">{action.label}</span>
                                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{action.description}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                </>
            )}
        </MasterPage>
    );
};

export default MasterDashboard;
