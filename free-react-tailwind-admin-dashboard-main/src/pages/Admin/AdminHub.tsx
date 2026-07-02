import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconOpenBook from '../../components/Icon/IconOpenBook';

interface HubCard {
    label: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    hoverGradient: string;
    glowColor: string;
    iconBg: string;
    borderColor: string;
    route: string;
    available: boolean;
    features: string[];
}

const cards: HubCard[] = [
    {
        label: 'HR Management',
        subtitle: 'Core Operations & Workforce',
        description: 'Manage employee profiles, handle shift assignments, configure attendance policies, track check-ins, approve leaves, and calculate automated bulk payroll.',
        icon: <IconUsersGroup className="w-10 h-10" />,
        gradient: 'from-blue-600 to-indigo-600',
        hoverGradient: 'group-hover:from-blue-700 group-hover:to-indigo-700',
        glowColor: 'shadow-blue-500/20 dark:shadow-blue-500/10',
        iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        borderColor: 'border-blue-100 dark:border-blue-900/30',
        route: '/admin/dashboard',
        available: true,
        features: ['Employee Directory', 'Attendance & Shifts', 'Bulk Payroll & Tax', 'Asset Management'],
    },
    {
        label: 'Performance Management',
        subtitle: 'Goals, KPIs & Reviews',
        description: 'Establish Key Performance Indicators (KPIs), set Objectives & Key Results (OKRs), launch 360° feedback appraisal cycles, and map talent potential.',
        icon: <IconTrendingUp className="w-10 h-10" />,
        gradient: 'from-emerald-500 to-teal-600',
        hoverGradient: 'group-hover:from-emerald-600 group-hover:to-teal-700',
        glowColor: 'shadow-emerald-500/20 dark:shadow-emerald-500/10',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        borderColor: 'border-emerald-100 dark:border-emerald-900/30',
        route: '/admin/performance',
        available: false,
        features: ['KPI & OKR Setter', '360° Appraisal Forms', '1-on-1 Feedback logs', '9-Box Talent Matrix'],
    },
    {
        label: 'Learning Management',
        subtitle: 'Training & Skill Dev',
        description: 'Organize training curricula, deploy interactive video and document lessons, set quizzes with passing scores, and reward completion with certificates.',
        icon: <IconOpenBook className="w-10 h-10" />,
        gradient: 'from-violet-500 to-purple-600',
        hoverGradient: 'group-hover:from-violet-600 group-hover:to-purple-700',
        glowColor: 'shadow-violet-500/20 dark:shadow-violet-500/10',
        iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
        borderColor: 'border-violet-100 dark:border-violet-900/30',
        route: '/admin/learning-management/course-catalog',
        available: true,
        features: ['Structured Courses', 'Quizzes & Grading', 'Progress Reports', 'PDF Certificates'],
    },
];

const AdminHub = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const userName = localStorage.getItem('username') || 'Admin';
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        dispatch(setPageTitle('Admin Workspace'));
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [dispatch]);

    const activeHour = currentTime.getHours();
    let greeting = 'Good Evening';
    let greetingEmoji = '🌙';
    if (activeHour < 12) {
        greeting = 'Good Morning';
        greetingEmoji = '☀️';
    } else if (activeHour < 18) {
        greeting = 'Good Afternoon';
        greetingEmoji = '🌤️';
    }

    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return (
        <div className="relative min-h-[85vh] flex flex-col justify-between overflow-hidden py-4">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-[85rem] mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start gap-8 z-10">
                {/* ── Top Premium Welcome Card ── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/10">
                    <div className="absolute top-0 right-0 w-80 h-full bg-cover bg-center opacity-10 pointer-events-none" />
                    {/* Decorative Circle Elements */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

                    <div className="p-8 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-10 relative">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full mb-3">
                                <span>{greetingEmoji}</span>
                                <span className="text-sm font-semibold tracking-wide uppercase text-white/95">{greeting}, {formattedName}</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                                ITL Digital Workspace Hub
                            </h1>
                            <p className="text-white/80 text-sm sm:text-base max-w-xl">
                                Access and coordinate employee directories, performance cycles, and course training programs from a single secure workspace.
                            </p>
                        </div>
                        <div className="flex flex-col sm:items-end bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 self-stretch sm:self-auto justify-center">
                            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold mb-0.5">{formattedDate}</span>
                            <span className="text-2xl font-black tracking-widest tabular-nums">{formattedTime}</span>
                        </div>
                    </div>
                </div>

                {/* ── Wide Grid Section ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                    {cards.map((card) => (
                        <button
                            key={card.label}
                            onClick={() => navigate(card.route)}
                            className={`
                                group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 ${card.borderColor}
                                bg-white dark:bg-gray-800/40 backdrop-blur-md text-left p-8 min-h-[380px]
                                transition-all duration-500 ease-out
                                hover:shadow-2xl hover:${card.glowColor} hover:scale-[1.03] hover:-translate-y-2
                                focus:outline-none focus:ring-4 focus:ring-primary/20
                            `}
                        >
                            {/* Decorative Top Accent Line */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.gradient} ${card.hoverGradient} transition-all duration-300`} />

                            <div>
                                {/* Icon Container with Inner/Outer Glows */}
                                <div className={`
                                    w-16 h-16 rounded-2xl ${card.iconBg} text-white
                                    flex items-center justify-center mb-6
                                    shadow-lg ${card.glowColor}
                                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                                `}>
                                    {card.icon}
                                </div>

                                {/* Header */}
                                <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-widest mb-1.5 block">
                                    {card.subtitle}
                                </span>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-3 transition-colors duration-200">
                                    {card.label}
                                </h2>

                                {/* Description */}
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                                    {card.description}
                                </p>

                                {/* Features List */}
                                <div className="border-t border-gray-100 dark:border-gray-700/50 pt-5 mb-8">
                                    <ul className="grid grid-cols-2 gap-x-2 gap-y-2.5">
                                        {card.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${card.gradient}`} />
                                                <span className="truncate">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Footer Action Area */}
                            <div className="flex items-center justify-between mt-auto">
                                {card.available ? (
                                    <span className={`
                                        inline-flex items-center gap-2 text-sm font-extrabold
                                        bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent
                                        transition-all duration-300 group-hover:gap-3
                                    `}>
                                        Launch System
                                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'inherit' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-100 dark:border-amber-900/30">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Coming Soon</span>
                                    </span>
                                )}
                            </div>

                            {/* Corner Wave Background Element */}
                            <div className={`
                                absolute -bottom-12 -right-12 w-40 h-40 rounded-full
                                bg-gradient-to-br ${card.gradient} opacity-5
                                transition-all duration-700 group-hover:opacity-10 group-hover:scale-125
                            `} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminHub;
