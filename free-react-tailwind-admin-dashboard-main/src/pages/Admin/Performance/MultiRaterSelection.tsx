import { useState, useEffect } from 'react';
import axios from 'axios';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';

// Interfaces for DB Models
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
    id: number; // The mapping ID in Django DB
    employee: number;
    reviewer: number;
    relationship: 'Peer' | 'Subordinate' | 'External Partner';
    status: 'nominated' | 'approved' | 'completed';
    created_at: string;
    reviewer_name: string;
    reviewer_designation: string;
    reviewer_initials: string;
    reviewer_avatar_bg: string;
}

const MultiRaterSelection = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [reviewers, setReviewers] = useState<PeerReviewerMapping[]>([]);
    
    // UI States
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [loadingReviewers, setLoadingReviewers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPeerId, setSelectedPeerId] = useState('');
    const [relationship, setRelationship] = useState<'Peer' | 'Subordinate' | 'External Partner'>('Peer');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch Auth Headers
    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        return {
            Authorization: `Bearer ${token}`,
        };
    };

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // 1. Fetch all employees on mount
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoadingEmployees(true);
                const response = await axios.get(`${API_BASE}/employee/all-employees-list/`, {
                    headers: getHeaders(),
                });
                setEmployees(response.data);
                if (response.data.length > 0) {
                    setSelectedEmployee(response.data[0]);
                }
            } catch (err: any) {
                console.error('Error fetching employees:', err);
                setErrorMsg('Failed to load employee list from database.');
            } finally {
                setLoadingEmployees(false);
            }
        };

        fetchEmployees();
    }, []);

    // 2. Fetch mapped reviewers whenever selected employee changes
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchReviewers = async () => {
            try {
                setLoadingReviewers(true);
                const response = await axios.get(`${API_BASE}/employee/multirater/?employee_id=${selectedEmployee.id}`, {
                    headers: getHeaders(),
                });
                setReviewers(response.data);
            } catch (err: any) {
                console.error('Error fetching peer mappings:', err);
                setErrorMsg('Failed to load nominated peer reviewers.');
            } finally {
                setLoadingReviewers(false);
            }
        };

        fetchReviewers();
    }, [selectedEmployee]);

    // Nominate Peer Reviewer
    const handleAddReviewer = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!selectedEmployee || !selectedPeerId) return;

        const peerId = parseInt(selectedPeerId);

        // Find details of nominated peer to check business rules on client-side too
        const nominatedPeer = employees.find(emp => emp.id === peerId);
        if (!nominatedPeer) return;

        // Enforce same department filter rule
        if (selectedEmployee.department !== nominatedPeer.department) {
            setErrorMsg('Nominated peer reviewer must belong to the same department.');
            return;
        }

        try {
            const payload = {
                employee: selectedEmployee.id,
                reviewer: peerId,
                relationship: relationship,
                status: 'nominated'
            };

            await axios.post(`${API_BASE}/employee/multirater/`, payload, {
                headers: getHeaders(),
            });

            // Re-fetch mappings on success
            const response = await axios.get(`${API_BASE}/employee/multirater/?employee_id=${selectedEmployee.id}`, {
                headers: getHeaders(),
            });
            setReviewers(response.data);
            setSelectedPeerId('');
        } catch (err: any) {
            console.error('Error adding peer mapping:', err);
            const serverMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to nominate peer reviewer.';
            setErrorMsg(serverMsg);
        }
    };

    // Remove Peer Reviewer
    const handleRemoveReviewer = async (mappingId: number) => {
        setErrorMsg('');
        if (!selectedEmployee) return;

        try {
            await axios.delete(`${API_BASE}/employee/multirater/${mappingId}/`, {
                headers: getHeaders(),
            });

            // Re-fetch mappings on success
            const response = await axios.get(`${API_BASE}/employee/multirater/?employee_id=${selectedEmployee.id}`, {
                headers: getHeaders(),
            });
            setReviewers(response.data);
        } catch (err: any) {
            console.error('Error removing peer mapping:', err);
            setErrorMsg('Failed to remove nominated peer reviewer.');
        }
    };

    // Filter employees in the directory on the left
    const filteredEmployees = employees.filter(emp => 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.designation_name && emp.designation_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Filter potential peers shown in the nomination select dropdown:
    // MUST NOT be the selected employee themselves AND MUST be in the same department
    const potentialPeers = selectedEmployee 
        ? employees.filter(emp => 
            emp.id !== selectedEmployee.id && 
            emp.department === selectedEmployee.department
          )
        : [];

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Multi-Rater Review Selection</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Map peer reviewers to employees for cyclical 360-degree feedback. Reviewers are filtered to the selected employee's department.
                </p>
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
                                    onClick={() => { setSelectedEmployee(emp); setErrorMsg(''); }}
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

                {/* Right Panel: Selected Employee Peer Review Mappings */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 flex flex-col justify-between h-[520px]">
                    
                    {selectedEmployee ? (
                        <>
                            {/* Selected Employee Info Banner */}
                            <div>
                                <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                            {selectedEmployee.initials}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{selectedEmployee.full_name}</h3>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                                                {selectedEmployee.designation_name || 'Designation Not Set'} • <strong className="text-teal-600 dark:text-teal-400">{selectedEmployee.department_name || 'Department Not Set'}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-teal-600 bg-teal-500/10 px-3 py-1 rounded-full">
                                        Department peers selection
                                    </span>
                                </div>

                                {/* Form: Nominate Peer Reviewer (Filtered by Department) */}
                                <form onSubmit={handleAddReviewer} className="flex flex-wrap gap-4 items-end bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 p-4 rounded-2xl mb-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            Nominate Peer (Same Dept Only)
                                        </label>
                                        <select
                                            value={selectedPeerId}
                                            onChange={(e) => setSelectedPeerId(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                            required
                                        >
                                            <option value="">-- Select Department Peer --</option>
                                            {potentialPeers.map(e => (
                                                <option key={e.id} value={e.id}>
                                                    {e.full_name} ({e.designation_name || 'No Desig'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="min-w-[150px]">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Relationship</label>
                                        <select
                                            value={relationship}
                                            onChange={(e) => setRelationship(e.target.value as PeerReviewerMapping['relationship'])}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                                        >
                                            <option value="Peer">Peer</option>
                                            <option value="Subordinate">Subordinate</option>
                                            <option value="External Partner">External Partner</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!selectedPeerId}
                                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 transition duration-300"
                                    >
                                        Nominate Peer
                                    </button>
                                </form>
                            </div>

                            {/* Mappings Table */}
                            <div className="flex-1 overflow-y-auto mb-4 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/40 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                            <th className="p-3 pl-4">Nominated Reviewer</th>
                                            <th className="p-3">Relationship</th>
                                            <th className="p-3">Evaluation Status</th>
                                            <th className="p-3 text-center pr-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {loadingReviewers ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-10 text-gray-400">Loading mappings...</td>
                                            </tr>
                                        ) : reviewers.map((rev) => (
                                            <tr key={rev.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                                <td className="p-3 pl-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${rev.reviewer_avatar_bg}`}>
                                                            {rev.reviewer_initials}
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold leading-tight">{rev.reviewer_name}</span>
                                                            <span className="block text-[8px] text-gray-400 mt-0.5">{rev.reviewer_designation}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">{rev.relationship}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                        rev.status === 'completed' 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                        : rev.status === 'approved'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                                    }`}>
                                                        {rev.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center pr-4">
                                                    <button 
                                                        onClick={() => handleRemoveReviewer(rev.id)}
                                                        className="text-[9px] font-bold text-rose-500 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {!loadingReviewers && reviewers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-10 text-gray-400 italic">
                                                    No nominated peer reviewers found in the database.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full">
                            <IconUsers className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400">Reviewer Workspace</h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                                Select an employee from the directory on the left to manage their nominated peer mappings.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiRaterSelection;
