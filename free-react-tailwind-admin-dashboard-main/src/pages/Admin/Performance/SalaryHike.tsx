import { useState } from 'react';

interface HikeConfig {
    id: number;
    minRating: number;
    maxRating: number;
    recommendedHike: number;
}

const mockConfigs: HikeConfig[] = [
    { id: 1, minRating: 4.5, maxRating: 5.0, recommendedHike: 15.0 },
    { id: 2, minRating: 4.0, maxRating: 4.49, recommendedHike: 10.0 },
    { id: 3, minRating: 3.5, maxRating: 3.99, recommendedHike: 7.5 },
    { id: 4, minRating: 3.0, maxRating: 3.49, recommendedHike: 5.0 },
    { id: 5, minRating: 1.0, maxRating: 2.99, recommendedHike: 0.0 },
];

const SalaryHike = () => {
    const [configs, setConfigs] = useState<HikeConfig[]>(mockConfigs);
    const [selectedCycle, setSelectedCycle] = useState('Mid-Year Review 2026');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form inputs
    const [minRating, setMinRating] = useState('');
    const [maxRating, setMaxRating] = useState('');
    const [recommendedHike, setRecommendedHike] = useState('');

    const handleCreateConfig = (e: React.FormEvent) => {
        e.preventDefault();
        const minVal = parseFloat(minRating);
        const maxVal = parseFloat(maxRating);
        const hikeVal = parseFloat(recommendedHike);

        if (isNaN(minVal) || isNaN(maxVal) || isNaN(hikeVal)) return;

        const newConfig: HikeConfig = {
            id: Date.now(),
            minRating: minVal,
            maxRating: maxVal,
            recommendedHike: hikeVal,
        };

        setConfigs([...configs, newConfig].sort((a, b) => b.minRating - a.minRating));
        setIsFormOpen(false);
        // Reset form
        setMinRating('');
        setMaxRating('');
        setRecommendedHike('');
    };

    const deleteConfig = (id: number) => {
        setConfigs(configs.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header with Cycle Selector */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Configure Salary Hikes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Map final appraisal score ratings directly to recommended salary hike increments.
                    </p>
                </div>
                
                <div className="flex gap-3 items-center shrink-0 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-400 uppercase select-none">Active Cycle:</span>
                    <select
                        value={selectedCycle}
                        onChange={(e) => setSelectedCycle(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none"
                    >
                        <option value="Annual Evaluation 2025">Annual Evaluation 2025</option>
                        <option value="Mid-Year Review 2026">Mid-Year Review 2026</option>
                        <option value="Q3 Target Appraisal 2026">Q3 Target Appraisal 2026</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Hike Configuration Table */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">Hike Mappings Matrix</span>
                        <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full">
                            {configs.length} Bands Configured
                        </span>
                    </div>

                    <div className="table-responsive">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/40 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                    <th className="p-4 pl-6">Rating Min Score</th>
                                    <th className="p-4">Rating Max Score</th>
                                    <th className="p-4">Recommended Hike (%)</th>
                                    <th className="p-4 text-center pr-6">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                {configs.map((cfg) => (
                                    <tr key={cfg.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition duration-150">
                                        <td className="p-4 pl-6 font-bold text-teal-600 dark:text-teal-400">{cfg.minRating.toFixed(2)}</td>
                                        <td className="p-4 font-bold text-teal-600 dark:text-teal-400">{cfg.maxRating.toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className="font-extrabold text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                                {cfg.recommendedHike.toFixed(1)}% Hike
                                            </span>
                                        </td>
                                        <td className="p-4 text-center pr-6">
                                            <button 
                                                onClick={() => deleteConfig(cfg.id)}
                                                className="text-[10px] font-bold text-rose-500 hover:underline"
                                            >
                                                Remove Band
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {configs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-gray-400 italic">
                                            No rating bands mapped yet. Map a band in the right sidebar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Map New Hike Band Sidebar Form */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm h-fit">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                        Map Salary Hike Band
                    </h3>
                    
                    <form onSubmit={handleCreateConfig} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Minimum Score Rating</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="5"
                                required
                                placeholder="e.g. 4.00"
                                value={minRating}
                                onChange={(e) => setMinRating(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Maximum Score Rating</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="5"
                                required
                                placeholder="e.g. 4.49"
                                value={maxRating}
                                onChange={(e) => setMaxRating(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Recommended Hike Percentage (%)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                min="0"
                                required
                                placeholder="e.g. 10.0"
                                value={recommendedHike}
                                onChange={(e) => setRecommendedHike(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full btn bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold py-3 mt-2 shadow-md shadow-teal-500/10 transition duration-300"
                        >
                            Save Rating Band Mapping
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SalaryHike;
