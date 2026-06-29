import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';

interface MetricCard {
    title: string;
    desc: string;
    badge: string;
    features: string[];
}

const metrics: MetricCard[] = [
    {
        title: 'Core Responsibilities & Metrics',
        desc: 'Review assigned Key Result Areas (KRAs), link new self-mapped KRAs, and track personal goals with interactive progress gauges.',
        badge: 'KRA & Goals',
        features: ['KRAs Mapping', 'Self-Mapped KRAs', 'Goals & Target Gauges'],
    },
    {
        title: 'Talent & Capability Development',
        desc: 'View expected behavioral competencies, maintain your skill sets inventory, and request proficiency upgrades.',
        badge: 'Competency & Skills',
        features: ['Core Competencies', 'Skill Sets Inventory', 'Skill Level Upgrades'],
    },
    {
        title: 'Social & Evaluation Feedback Loops',
        desc: 'See peer praise and coaching tips from managers, and track feedback given to other team members.',
        badge: 'Feedback Loops',
        features: ['Feedback Received', 'Feedback Provided', 'Peer Recognitions'],
    },
    {
        title: 'Appraisals & Active Reviews',
        desc: 'Submit self-ratings and comments, look over historical appraisal scorecards, and check deadline extension grace periods.',
        badge: 'Appraisals',
        features: ['Add Self-Appraisal', 'Appraisal Records', 'Extension Status'],
    },
];

const PerformanceDashboard = () => {
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
                        Performance Hub
                    </div>
                    <h1 className="text-3xl font-extrabold mb-2">Performance Management Systems</h1>
                    <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                        Track metrics, build capabilities, exchange constructive feedback, and participate in periodic reviews to accelerate your professional growth.
                    </p>
                </div>
            </div>

            {/* Sub-sections Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.map((m, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start gap-4 mb-3">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{m.title}</h2>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full shrink-0">
                                    {m.badge}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{m.desc}</p>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
                            <ul className="flex flex-wrap gap-2">
                                {m.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-2.5 py-1 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
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
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">All Performance sub-modules are under active development — Launching soon!</span>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
