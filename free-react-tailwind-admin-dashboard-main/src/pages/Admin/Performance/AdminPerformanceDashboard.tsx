import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';

interface MetricGroup {
    title: string;
    desc: string;
    badge: string;
    features: string[];
}

const groups: MetricGroup[] = [
    {
        title: 'User Specific Operations',
        desc: 'Perform individual workforce management, search profile histories, assign custom KRAs/goals, and review manager recording summaries.',
        badge: 'Individual',
        features: ['Search Profiles', 'Assign KRAs & Goals', 'Track Feedback Logs', 'Manager Summaries'],
    },
    {
        title: 'Methods & Setup Templates',
        desc: 'Configure bulk templates, build review questionnaires, and map bulk competency requirements across departments.',
        badge: 'Setup Templates',
        features: ['Bulk Map KRAs', 'Review Questions', 'Summary Evaluation Questions'],
    },
    {
        title: 'Appraisals Lifecycle',
        desc: 'Launch review cycles, map self-appraisal scorecards, allocate multi-rater peer reviewers, and structure salary hike parameters.',
        badge: 'Cycles',
        features: ['Create Cycles', 'Configure Salary Hikes', 'Review Grace Extensions', 'Multi-Rater Mapping'],
    },
    {
        title: 'Continuous Review',
        desc: 'Coordinate ongoing checkpoints, check mid-year milestones, and authorize grace extensions for missed deadlines.',
        badge: 'Continuous',
        features: ['Ongoing Progress', 'Manage Extensions', 'Checkpoint Calendars'],
    },
    {
        title: 'Goals / KRAs / Competencies Registry',
        desc: 'Establish master corporate directories, assign designations to specific KRA indices, and register behavioral rubrics.',
        badge: 'Master Registries',
        features: ['Import Corporate Goals', 'KRA Registry', 'Competency Mapping'],
    },
    {
        title: 'Data Utilities & Multi-Rater Logs',
        desc: 'Import historical reviews database, export system ratings matrices, and track complete multi-rater peer groupings.',
        badge: 'Utilities',
        features: ['Import Reviews', 'Export Metrics', 'Multi-Rater Master Log'],
    },
];

const AdminPerformanceDashboard = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('Performance Overview'));
    }, [dispatch]);

    return (
        <div className="min-h-[75vh] flex flex-col gap-8 py-2 animate__animated animate__fadeIn">
            {/* Top Overview Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-8 shadow-xl shadow-teal-500/10">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
                
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                        <IconTrendingUp className="w-4 h-4" />
                        Admin Performance Control
                    </div>
                    <h1 className="text-3xl font-extrabold mb-2">Performance Management Systems</h1>
                    <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                        Control employee appraisals, structure KPIs & OKRs, manage multi-rater peer mappings, and analyze talent growth records from this central console.
                    </p>
                </div>
            </div>

            {/* Sub-sections Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map((g, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start gap-4 mb-3">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{g.title}</h2>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">
                                    {g.badge}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{g.desc}</p>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
                            <ul className="flex flex-wrap gap-1.5">
                                {g.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-2 py-0.5 rounded-lg">
                                        <div className="w-1 h-1 rounded-full bg-teal-500" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Under Dev Notice */}
            <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 max-w-max mx-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">All Admin Performance sub-modules are under active development — Launching soon!</span>
            </div>
        </div>
    );
};

export default AdminPerformanceDashboard;
