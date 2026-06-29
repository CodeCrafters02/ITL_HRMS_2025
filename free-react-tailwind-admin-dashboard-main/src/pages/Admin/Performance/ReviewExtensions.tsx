import { useState } from 'react';

interface ExtensionRequest {
    id: number;
    employeeName: string;
    avatarBg: string;
    initials: string;
    cycleName: string;
    requesterRole: 'Employee' | 'Manager';
    originalDeadline: string;
    requestedDeadline: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

const mockRequests: ExtensionRequest[] = [
    { id: 1, employeeName: 'Vikram Singh', initials: 'VS', avatarBg: 'bg-rose-500', cycleName: 'Mid-Year Review 2026', requesterRole: 'Employee', originalDeadline: '2026-06-15', requestedDeadline: '2026-06-22', reason: 'Was on medical leave for 1 week during the review self-assessment opening.', status: 'pending' },
    { id: 2, employeeName: 'Rahul Verma', initials: 'RV', avatarBg: 'bg-amber-500', cycleName: 'Mid-Year Review 2026', requesterRole: 'Manager', originalDeadline: '2026-06-25', requestedDeadline: '2026-06-29', reason: 'Awaiting completion of multi-rater reviews for two reportees.', status: 'pending' },
    { id: 3, employeeName: 'Kirti Reddy', initials: 'KR', avatarBg: 'bg-pink-500', cycleName: 'Annual Evaluation 2025', requesterRole: 'Employee', originalDeadline: '2025-12-15', requestedDeadline: '2025-12-19', reason: 'Travel plans for corporate summit clashed with self review deadline.', status: 'approved' },
];

const ReviewExtensions = () => {
    const [requests, setRequests] = useState<ExtensionRequest[]>(mockRequests);

    const handleAction = (id: number, status: 'approved' | 'rejected') => {
        setRequests(requests.map(r => {
            if (r.id === id) {
                return { ...r, status };
            }
            return r;
        }));
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const approvedRequests = requests.filter(r => r.status === 'approved');
    const rejectedRequests = requests.filter(r => r.status === 'rejected');

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Appraisal Review Extensions</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Approve or reject grace extensions requested by employees or managers for missed evaluation deadlines.
                </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
                        {pendingRequests.length}
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Action</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">Requires immediate approval check</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
                        {approvedRequests.length}
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Extensions Approved</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">Granted extended appraisal grace</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center font-bold text-lg">
                        {rejectedRequests.length}
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Requests Rejected</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">Employees must stick to original cycle</span>
                    </div>
                </div>
            </div>

            {/* Extension Requests Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden animate__animated animate__fadeInUp">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">Active Extension Inbox</span>
                </div>

                <div className="table-responsive">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/40 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="p-4 pl-6">Employee</th>
                                <th className="p-4">Appraisal Cycle</th>
                                <th className="p-4">Requested Extended Date</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition duration-150">
                                    {/* Employee Profiler */}
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 ${req.avatarBg}`}>
                                                {req.initials}
                                            </div>
                                            <div>
                                                <span className="block font-bold text-gray-800 dark:text-white leading-tight">{req.employeeName}</span>
                                                <span className="block text-[9px] text-gray-400 mt-0.5">Role: {req.requesterRole}</span>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4 font-bold text-gray-800 dark:text-white">{req.cycleName}</td>
                                    
                                    <td className="p-4">
                                        <span className="block font-bold text-teal-600 dark:text-teal-400">{req.requestedDeadline}</span>
                                        <span className="block text-[9px] text-gray-400 mt-0.5">Original: {req.originalDeadline}</span>
                                    </td>

                                    <td className="p-4 max-w-xs leading-relaxed">{req.reason}</td>

                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            req.status === 'approved' 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                            : req.status === 'rejected'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>

                                    <td className="p-4 text-center pr-6">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleAction(req.id, 'approved')}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'rejected')}
                                                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow-sm"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Action Completed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-gray-400 italic">
                                        No grace period extension requests present in the database.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReviewExtensions;
