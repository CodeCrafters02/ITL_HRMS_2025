import { useState } from 'react';

interface Cycle {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    selfDeadline: string;
    managerDeadline: string;
    status: 'draft' | 'active' | 'completed';
}

const mockCycles: Cycle[] = [
    { id: 1, name: 'Annual Evaluation 2025', startDate: '2025-01-01', endDate: '2025-12-31', selfDeadline: '2025-12-15', managerDeadline: '2025-12-30', status: 'completed' },
    { id: 2, name: 'Mid-Year Review 2026', startDate: '2026-01-01', endDate: '2026-06-30', selfDeadline: '2026-06-15', managerDeadline: '2026-06-25', status: 'active' },
    { id: 3, name: 'Q3 Target Appraisal 2026', startDate: '2026-07-01', endDate: '2026-09-30', selfDeadline: '2026-09-15', managerDeadline: '2026-09-28', status: 'draft' },
];

const AppraisalCycles = () => {
    const [cycles, setCycles] = useState<Cycle[]>(mockCycles);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New cycle form states
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selfDeadline, setSelfDeadline] = useState('');
    const [managerDeadline, setManagerDeadline] = useState('');
    const [status, setStatus] = useState<'draft' | 'active' | 'completed'>('draft');

    const handleCreateCycle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !startDate || !endDate) return;

        const newCycle: Cycle = {
            id: Date.now(),
            name,
            startDate,
            endDate,
            selfDeadline: selfDeadline || endDate,
            managerDeadline: managerDeadline || endDate,
            status,
        };

        setCycles([newCycle, ...cycles]);
        setIsModalOpen(false);
        // Reset form
        setName('');
        setStartDate('');
        setEndDate('');
        setSelfDeadline('');
        setManagerDeadline('');
        setStatus('draft');
    };

    const toggleStatus = (id: number) => {
        setCycles(cycles.map(c => {
            if (c.id === id) {
                const nextStatus: Record<Cycle['status'], Cycle['status']> = {
                    'draft': 'active',
                    'active': 'completed',
                    'completed': 'draft'
                };
                return { ...c, status: nextStatus[c.status] };
            }
            return c;
        }));
    };

    const deleteCycle = (id: number) => {
        setCycles(cycles.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header section */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Cycles Manager</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Configure cyclical performance evaluations, map self-assessments, and launch reviews organizational-wide.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-md shadow-teal-500/10 transition duration-300"
                >
                    + Create New Cycle
                </button>
            </div>

            {/* Cycles List Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">All Active & Planned Cycles</span>
                    <span className="text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full">
                        {cycles.length} Total Cycles
                    </span>
                </div>

                <div className="table-responsive">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/40 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="p-4 pl-6">Cycle Name</th>
                                <th className="p-4">Start / End Date</th>
                                <th className="p-4">Self Appraisal Deadline</th>
                                <th className="p-4">Manager Review Deadline</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                            {cycles.map((cycle) => (
                                <tr key={cycle.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition duration-150">
                                    <td className="p-4 pl-6 font-bold text-gray-800 dark:text-white">{cycle.name}</td>
                                    <td className="p-4">{cycle.startDate} to {cycle.endDate}</td>
                                    <td className="p-4">{cycle.selfDeadline}</td>
                                    <td className="p-4">{cycle.managerDeadline}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            cycle.status === 'active' 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                            : cycle.status === 'completed'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {cycle.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center pr-6 flex justify-center gap-3">
                                        <button 
                                            onClick={() => toggleStatus(cycle.id)}
                                            className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                            title="Cycle status transitions"
                                        >
                                            Transition Status
                                        </button>
                                        <span className="text-gray-300 dark:text-gray-700">|</span>
                                        <button 
                                            onClick={() => deleteCycle(cycle.id)}
                                            className="text-[10px] font-bold text-rose-500 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {cycles.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-gray-400 italic">
                                        No appraisal cycles configured yet. Click "+ Create New Cycle" above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Cycle Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate__animated animate__fadeIn">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate__animated animate__zoomIn">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
                            <h3 className="text-lg font-black text-gray-800 dark:text-white">Create New Appraisal Cycle</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateCycle} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Cycle Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Q4 Target Appraisal 2026"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">End Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Self Deadline</label>
                                    <input 
                                        type="date" 
                                        value={selfDeadline}
                                        onChange={(e) => setSelfDeadline(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Manager Deadline</label>
                                    <input 
                                        type="date" 
                                        value={managerDeadline}
                                        onChange={(e) => setManagerDeadline(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Initial Status</label>
                                <select 
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as Cycle['status'])}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold"
                                >
                                    Save Cycle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppraisalCycles;
