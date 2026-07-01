import { useState, useEffect } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department: number | null;
    department_name: string | null;
    designation_name: string | null;
    avatarBg: string;
    initials: string;
}

interface PeerReviewerMapping {
    id: number;
    employee: number;
    reviewer: number;
    cycle: number;
    status: 'nominated' | 'approved' | 'completed';
    created_at: string;
    reviewer_name: string;
    reviewer_designation: string;
    reviewer_initials: string;
    reviewer_avatar_bg: string;
}

interface Cycle {
    id: number;
    name: string;
    status: 'draft' | 'active' | 'completed';
}

const MultiRaterSelection = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [reviewers, setReviewers] = useState<PeerReviewerMapping[]>([]);

    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingReviewers, setLoadingReviewers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch Auth Headers
    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        return {
            Authorization: `Bearer ${token}`,
        };
    };

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // 1. Fetch cycles + employees on mount
    useEffect(() => {
        const init = async () => {
            try {
                setLoadingEmployees(true);
                const [cyclesRes, empsRes] = await Promise.all([
                    axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: getHeaders() }),
                    axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: getHeaders() }),
                ]);
                const cycleList: Cycle[] = Array.isArray(cyclesRes.data) ? cyclesRes.data : cyclesRes.data.results ?? [];
                setCycles(cycleList);
                const active = cycleList.find(c => c.status === 'active');
                if (active) setSelectedCycleId(active.id);
                else if (cycleList.length) setSelectedCycleId(cycleList[0].id);

                setEmployees(empsRes.data);
                if (empsRes.data.length > 0) setSelectedEmployee(empsRes.data[0]);
            } catch {
                setErrorMsg('Failed to load data.');
            } finally {
                setLoadingEmployees(false);
            }
        };
        init();
    }, []);

    // 2. Fetch mapped reviewers whenever selected employee OR cycle changes
    useEffect(() => {
        if (!selectedEmployee || !selectedCycleId) return;
        const fetchReviewers = async () => {
            try {
                setLoadingReviewers(true);
                const res = await axios.get(
                    `${API_BASE}/employee/multirater/?employee_id=${selectedEmployee.id}&cycle_id=${selectedCycleId}`,
                    { headers: getHeaders() }
                );
                setReviewers(Array.isArray(res.data) ? res.data : res.data.results ?? []);
            } catch {
                setErrorMsg('Failed to load peer reviewers.');
            } finally {
                setLoadingReviewers(false);
            }
        };
        fetchReviewers();
    }, [selectedEmployee, selectedCycleId]);

    const handleAssignPeer = async (peerId: number) => {
        if (!selectedEmployee || !selectedCycleId) return;
        setErrorMsg(''); setAssigningId(peerId);
        try {
            const res = await axios.post(`${API_BASE}/employee/multirater/`, {
                employee: selectedEmployee.id,
                reviewer: peerId,
                cycle: selectedCycleId,
                status: 'nominated',
            }, { headers: getHeaders() });
            setReviewers(prev => [...prev, res.data]);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to assign peer.');
        } finally {
            setAssigningId(null);
        }
    };

    const handleRemoveReviewer = async (mappingId: number, peerId: number) => {
        setErrorMsg(''); setRemovingId(peerId);
        try {
            await axios.delete(`${API_BASE}/employee/multirater/${mappingId}/`, { headers: getHeaders() });
            setReviewers(prev => prev.filter(r => r.id !== mappingId));
        } catch {
            setErrorMsg('Failed to remove peer reviewer.');
        } finally {
            setRemovingId(null);
        }
    };

    // Filter employees in the directory on the left
    const filteredEmployees = employees.filter(emp => 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.designation_name && emp.designation_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const [peerSearch, setPeerSearch] = useState('');

    const potentialPeers = selectedEmployee
        ? employees.filter(emp =>
            emp.id !== selectedEmployee.id &&
            emp.department === selectedEmployee.department &&
            (peerSearch === '' ||
                emp.full_name.toLowerCase().includes(peerSearch.toLowerCase()) ||
                (emp.designation_name && emp.designation_name.toLowerCase().includes(peerSearch.toLowerCase())))
          )
        : [];

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Multi-Rater Review Selection</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Map peer reviewers to employees for 360° feedback. Assignments are cycle-specific.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Cycle</label>
                    <select value={selectedCycleId ?? ''} onChange={e => setSelectedCycleId(Number(e.target.value))}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none">
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.status === 'active' ? '● Active' : c.status === 'draft' ? '○ Draft' : '✓ Done'}
                            </option>
                        ))}
                        {cycles.length === 0 && <option value="">No cycles found</option>}
                    </select>
                </div>
            </div>

            {/* Error Message Panel */}
            {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-xs font-bold animate__animated animate__shakeX">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Split Screen Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* Left Panel: Employee List Directory */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex flex-col h-[520px]">
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="Search employee..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 select-none block">
                        Workforce Directory ({filteredEmployees.length})
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loadingEmployees ? (
                            <div className="text-center py-10 text-xs text-gray-400">Loading directory...</div>
                        ) : filteredEmployees.map((emp) => {
                            const isSelected = selectedEmployee?.id === emp.id;
                            
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => { setSelectedEmployee(emp); setErrorMsg(''); setPeerSearch(''); }}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition duration-200 select-none ${
                                        isSelected 
                                        ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-white' 
                                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-teal-600 text-white shadow-sm shrink-0`}>
                                            {emp.initials}
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold leading-tight">{emp.full_name}</span>
                                            <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{emp.designation_name || 'Designation Not Set'}</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
                                        {emp.department_name || 'No Dept'}
                                    </span>
                                </div>
                            );
                        })}

                        {!loadingEmployees && filteredEmployees.length === 0 && (
                            <div className="text-center py-10 text-xs text-gray-400 italic">No employees found.</div>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col h-[520px]">
                    {selectedEmployee ? (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-4 mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                        {selectedEmployee.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{selectedEmployee.full_name}</h3>
                                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                                            {selectedEmployee.designation_name || 'Designation Not Set'} · <strong className="text-teal-600 dark:text-teal-400">{selectedEmployee.department_name || 'No Dept'}</strong>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-600 bg-teal-500/10 px-3 py-1 rounded-full">
                                            Peer Role · Same Department
                                        </span>
                                        <span className="text-[9px] text-gray-400">
                                            {reviewers.length} assigned
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search peers..."
                                            value={peerSearch}
                                            onChange={e => setPeerSearch(e.target.value)}
                                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-7 pr-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800 dark:text-white focus:outline-none w-44"
                                        />
                                        <IconSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Peer grid */}
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {loadingReviewers ? (
                                    <div className="text-center py-10 text-xs text-gray-400">Loading...</div>
                                ) : (() => {
                                    const allDeptPeers = employees.filter(e => e.id !== selectedEmployee.id && e.department === selectedEmployee.department);
                                    const assignedPeers = allDeptPeers.filter(p => reviewers.find(r => r.reviewer === p.id));
                                    const unassignedPeers = potentialPeers.filter(p => !reviewers.find(r => r.reviewer === p.id));

                                    const PeerCard = ({ peer }: { peer: Employee }) => {
                                        const mapping = reviewers.find(r => r.reviewer === peer.id);
                                        const isAssigned = !!mapping;
                                        const isActioning = assigningId === peer.id || removingId === peer.id;
                                        return (
                                            <div className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition ${
                                                isAssigned
                                                    ? 'border-teal-300 dark:border-teal-700 bg-teal-500/5'
                                                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                            }`}>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${peer.avatarBg}`}>
                                                        {peer.initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block text-xs font-bold text-gray-800 dark:text-white truncate leading-tight">{peer.full_name}</span>
                                                        <span className="block text-[9px] text-gray-400 truncate">{peer.designation_name || 'No Designation'}</span>
                                                    </div>
                                                </div>
                                                {isAssigned ? (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                            mapping.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            : mapping.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                                            : 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                                                        }`}>{mapping.status}</span>
                                                        <button onClick={() => handleRemoveReviewer(mapping.id, peer.id)} disabled={isActioning}
                                                            className="text-[9px] font-bold text-rose-500 hover:text-rose-700 disabled:opacity-40">
                                                            {isActioning ? '...' : 'Remove'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleAssignPeer(peer.id)} disabled={isActioning}
                                                        className="shrink-0 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white rounded-xl text-[9px] font-black transition">
                                                        {isActioning ? '...' : '+ Assign'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {/* Assigned peers block */}
                                            {assignedPeers.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Assigned Peers</span>
                                                        <span className="text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full">{assignedPeers.length}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {assignedPeers.map(peer => <PeerCard key={peer.id} peer={peer} />)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Unassigned peers block */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Available Peers</span>
                                                    <span className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{unassignedPeers.length}</span>
                                                </div>
                                                {unassignedPeers.length === 0 ? (
                                                    <div className="text-center py-6 text-xs text-gray-400 italic border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                                        {allDeptPeers.length === assignedPeers.length ? 'All department peers are assigned.' : 'No peers match your search.'}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {unassignedPeers.map(peer => <PeerCard key={peer.id} peer={peer} />)}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full">
                            <IconUsers className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Reviewer Workspace</h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                                Select an employee from the directory on the left to manage their peer reviewers.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiRaterSelection;
