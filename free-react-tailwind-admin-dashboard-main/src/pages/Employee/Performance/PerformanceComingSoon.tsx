import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';

interface ComingSoonProps {
    title: string;
    desc: string;
    plannedFeatures: string[];
}

const PerformanceComingSoon = ({ title, desc, plannedFeatures }: ComingSoonProps) => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle(title));
    }, [dispatch, title]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 animate__animated animate__fadeIn">
            {/* Pulsing Emerald Graphic */}
            <div className="relative mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <IconTrendingUp className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20 animate-ping" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-2">{title}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold mb-4">Upcoming Module</p>
            
            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-lg mb-8 leading-relaxed">
                {desc}
            </p>

            {/* planned features card */}
            <div className="w-full max-w-md bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm mb-8">
                <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Planned Capabilities</h2>
                <ul className="space-y-2.5">
                    {plannedFeatures.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-300 leading-normal">{f}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Development tag */}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Under Active Development</span>
            </div>
        </div>
    );
};

export default PerformanceComingSoon;
