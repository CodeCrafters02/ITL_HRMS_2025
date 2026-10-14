import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconOpenBook from '../../components/Icon/IconOpenBook';

import HeroBanner from '../../components/Common/HeroBanner';
interface HubCard {
    label: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    tint: string;
    accent: string;
    route: string;
    available: boolean;
    features: string[];
}

const cards: HubCard[] = [
    {
        label: 'HR Management',
        subtitle: 'Core Operations & Workforce',
        description: 'Manage employee profiles, handle shift assignments, configure attendance policies, track check-ins, approve leaves, and calculate automated bulk payroll.',
        icon: <IconUsersGroup className="w-6 h-6" />,
        tint: 'bg-brand/10 text-brand',
        accent: 'text-brand',
        route: '/admin/dashboard',
        available: true,
        features: ['Employee Directory', 'Attendance & Shifts', 'Leave Approvals', 'Bulk Payroll & Tax'],
    },
    {
        label: 'Performance Management',
        subtitle: 'Goals, KPIs & Reviews',
        description: 'Establish Key Performance Indicators (KPIs), launch 360° feedback appraisal cycles, manage review extensions, and track manager evaluations.',
        icon: <IconTrendingUp className="w-6 h-6" />,
        tint: 'bg-brand-mid/10 text-brand-mid',
        accent: 'text-brand-mid',
        route: '/admin/performance/appraisal-cycles',
        available: true,
        features: ['Appraisal Cycles', 'KPI & OKR Setter', 'Manager Reviews', 'Multi-Rater Log'],
    },
    {
        label: 'Learning Management',
        subtitle: 'Training & Skill Dev',
        description: 'Organize company course catalog, create video and document modules, administer quizzes, and monitor employee training compliance.',
        icon: <IconOpenBook className="w-6 h-6" />,
        tint: 'bg-brand-accent/15 text-brand-dark',
        accent: 'text-brand-dark',
        route: '/admin/learning-management/course-catalog',
        available: true,
        features: ['Course Catalog', 'Quizzes & Grading', 'Compliance Training', 'Progress Reports'],
    },
];

const AdminHub = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const fullName = [localStorage.getItem('first_name'), localStorage.getItem('last_name')].filter(Boolean).join(' ');
    const displayName =
        fullName ||
        (localStorage.getItem('username') || 'Administrator')
            .split('@')[0]
            .split(/[._\s]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        dispatch(setPageTitle('Admin Workspace'));
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [dispatch]);

    // Back-button behavior: refresh this page itself instead of navigating back or signing out
    useEffect(() => {
        try {
            sessionStorage.setItem('tab_session_active', 'true');
            localStorage.setItem('hrms_tab_heartbeat', String(Date.now()));
        } catch {}

        // Push barrier state so going back in history stays on /admin/hub
        window.history.pushState({ hubBarrier: true, page: 'admin-hub' }, '', '/admin/hub');

        let isReloading = false;
        const handlePopState = () => {
            // Immediately restore the barrier so URL and history stay locked on /admin/hub
            window.history.pushState({ hubBarrier: true, page: 'admin-hub' }, '', '/admin/hub');

            try {
                sessionStorage.setItem('tab_session_active', 'true');
                localStorage.setItem('hrms_tab_heartbeat', String(Date.now()));
            } catch {}

            if (isReloading) return;
            isReloading = true;

            // Refresh this page itself safely
            setTimeout(() => {
                if (window.location.pathname !== '/admin/hub') {
                    window.location.replace('/admin/hub');
                } else {
                    window.location.reload();
                }
            }, 50);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const activeHour = currentTime.getHours();
    const greeting = activeHour < 12 ? 'Good morning' : activeHour < 18 ? 'Good afternoon' : 'Good evening';

    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return (
        <div className="mx-auto w-full max-w-[85rem] space-y-8 px-1 py-2 sm:px-2">
            {/* Welcome banner (follows the company brand theme) */}
            <HeroBanner
                eyebrow="People Suite · Admin Workspace Hub"
                title={
                    <>
                        {greeting}, {displayName}
                    </>
                }
                subtitle="Coordinate workforce operations, review performance appraisal cycles, and manage training programs from a single secure workspace."
                aside={
                    <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 backdrop-blur-md md:text-right">
                        <p className="text-xs font-medium text-white/80">{formattedDate}</p>
                        <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formattedTime}</p>
                    </div>
                }
            />

            {/* Workspaces Section */}
            <div>
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your workspaces</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Choose where you want to work today.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {cards.map((card) => (
                        <button
                            key={card.label}
                            onClick={() => navigate(card.route)}
                            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-[#1b2e4b] dark:bg-[#0e1726]"
                        >
                            <div className="flex w-full items-start justify-between gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tint}`}>{card.icon}</div>
                                {card.available ? (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Available</span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">Coming soon</span>
                                )}
                            </div>

                            <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{card.subtitle}</p>
                            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{card.label}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{card.description}</p>

                            <ul className="mt-5 grid w-full grid-cols-1 gap-2 border-t border-slate-100 pt-5 dark:border-white/5 sm:grid-cols-2">
                                {card.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <svg className={`h-3.5 w-3.5 shrink-0 ${card.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="truncate">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className={`mt-auto flex items-center gap-2 pt-6 text-sm font-semibold ${card.available ? 'text-brand' : 'text-slate-400'}`}>
                                {card.available ? 'Open' : 'Launching soon'}
                                {card.available && (
                                    <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminHub;
