import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconUsers from '../../../components/Icon/IconUsers';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    department_name: string | null;
    designation_name: string | null;
    initials: string;
}

interface Cycle {
    id: number;
    name: string;
    status: string;
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    max_score: number;
}

const AdminAppraisal = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answersMap, setAnswersMap] = useState<Record<number, { rating: number | null; comment: string }>>({});
    
    // UI state
    const [loadingList, setLoadingList] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
    const asArray = (d: any) => Array.isArray(d) ? d : d?.results ?? [];

    useEffect(() => {
        dispatch(setPageTitle('Admin/HR Appraisal'));
        fetchInitialData();
    }, [dispatch]);

    const fetchInitialData = async () => {
        try {
            setLoadingList(true);
            setErrorMsg(null);

            // 1. Fetch active appraisal cycle
            const cycleRes = await axios.get(`${API_BASE}/employee/appraisal-cycles/`, { headers: getHeaders() });
            const cycles = asArray(cycleRes.data);
            const active = cycles.find((c: Cycle) => c.status === 'active');
            if (!active) {
                setErrorMsg('There is currently no active appraisal cycle configured. Please launch a cycle first.');
                setLoadingList(false);
                return;
            }
            setActiveCycle(active);

            // 2. Fetch employee list
            const empRes = await axios.get(`${API_BASE}/employee/all-employees-list/`, { headers: getHeaders() });
            setEmployees(empRes.data);
        } catch (err: any) {
            console.error('Error fetching initial appraisal data:', err);
            setErrorMsg(err.response?.data?.detail || 'Failed to load employee list or active cycle.');
        } finally {
            setLoadingList(false);
        }
    };

    const handleSelectEmployee = async (emp: Employee) => {
        if (!activeCycle) return;
        setSelectedEmployee(emp);
        setSuccessMsg(null);
        setErrorMsg(null);
        setLoadingQuestions(true);

        try {
            // 1. Fetch HR-specific questions for active cycle
            const qRes = await axios.get(`${API_BASE}/employee/appraisal-questions/?cycle=${activeCycle.id}&role_type=hr`, { headers: getHeaders() });
            const qList = asArray(qRes.data);
            setQuestions(qList);

            // 2. Fetch evaluation if it exists to get any existing HR answers
            const evalRes = await axios.get(`${API_BASE}/employee/appraisal-evaluations/?employee=${emp.id}&cycle=${activeCycle.id}`, { headers: getHeaders() });
            const evalList = asArray(evalRes.data);
            const evalObj = evalList[0] || null;

            // Prepare answers map
            const initialAnswers: Record<number, { rating: number | null; comment: string }> = {};
            qList.forEach((q: Question) => {
                initialAnswers[q.id] = { 
                    rating: q.question_type === 'yes_no' ? null : (q.max_score ?? 5), 
                    comment: '' 
                };
            });

            if (evalObj?.answers) {
                // filter answers submitted by the logged in user under HR role
                evalObj.answers.forEach((ans: any) => {
                    if (ans.question_role_type === 'hr' || initialAnswers[ans.question]) {
                        initialAnswers[ans.question] = {
                            rating: ans.rating_score ?? null,
                            comment: ans.comment || ''
                        };
                    }
                });
            }
            setAnswersMap(initialAnswers);
        } catch (err: any) {
            console.error('Error loading employee questions:', err);
            setErrorMsg('Failed to retrieve questions or evaluation records.');
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleRatingChange = (qId: number, val: number | null) => {
        setAnswersMap(prev => ({ 
            ...prev, 
            [qId]: { ...prev[qId], rating: val } 
        }));
    };

    const handleCommentChange = (qId: number, val: string) => {
        setAnswersMap(prev => ({ 
            ...prev, 
            [qId]: { ...prev[qId], comment: val } 
        }));
    };

    const handleSubmitHRAppraisal = async () => {
        if (!selectedEmployee || !activeCycle) return;

        if (!window.confirm(`Are you sure you want to submit the Admin/HR evaluation for ${selectedEmployee.full_name}?`)) {
            return;
        }

        setSaving(true);
        setSuccessMsg(null);
        setErrorMsg(null);

        const answersPayload = Object.entries(answersMap).map(([qId, val]) => ({
            question_id: parseInt(qId),
            rating_score: val.rating,
            comment: val.comment,
        }));

        try {
            await axios.post(
                `${API_BASE}/employee/appraisal-evaluations/submit_feedback/`,
                {
                    target_employee_id: selectedEmployee.id,
                    cycle_id: activeCycle.id,
                    role_type: 'hr',
                    answers: answersPayload,
                },
                { headers: getHeaders() }
            );

            setSuccessMsg(`Admin/HR Appraisal evaluation successfully submitted for ${selectedEmployee.full_name}!`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.response?.data?.detail || 'Failed to submit appraisal answers.');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const query = searchQuery.toLowerCase();
        return emp.full_name.toLowerCase().includes(query) || 
               emp.employee_id.toLowerCase().includes(query) ||
               (emp.designation_name && emp.designation_name.toLowerCase().includes(query)) ||
               (emp.department_name && emp.department_name.toLowerCase().includes(query));
    });

    return (
        <div className="space-y-6 py-2 animate__animated animate__fadeIn">
            {/* Top header banner */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Admin/HR Appraisal Reviews</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Submit overall Admin/HR ratings and detailed questionnaire reviews for employees in the active cycle.
                </p>
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-4 py-3 rounded-xl text-xs font-bold">
                    ✓ {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-4 py-3 rounded-xl text-xs font-bold">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Directory Selector list */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm space-y-4 h-[calc(100vh-250px)] flex flex-col">
                    <div className="relative shrink-0">
                        <input 
                            type="text" 
                            placeholder="Search by name, ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-9 pr-4 py-2.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none"
                        />
                        <IconSearch className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800 pr-1">
                        {loadingList ? (
                            <div className="text-center py-20 text-xs text-gray-400">Loading directory...</div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="text-center py-10 text-xs text-gray-400 italic">
                                No employees found.
                            </div>
                        ) : (
                            filteredEmployees.map(emp => {
                                const isSelected = selectedEmployee?.id === emp.id;
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => handleSelectEmployee(emp)}
                                        className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 my-1.5 ${
                                            isSelected 
                                                ? 'bg-teal-500/10 border-l-4 border-teal-500' 
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-850'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-teal-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm shrink-0">
                                            {emp.initials}
                                        </div>
                                        <div className="min-w-0">
                                            <span className={`block font-bold text-xs truncate ${isSelected ? 'text-teal-650 dark:text-teal-400' : 'text-gray-850 dark:text-white'}`}>{emp.full_name}</span>
                                            <span className="block text-[9px] text-gray-400 truncate">{emp.designation_name || 'Designation Not Set'} • ID: {emp.employee_id}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: The Questionnaire review panel or empty state */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 h-[calc(100vh-250px)] flex flex-col">
                    {!selectedEmployee ? (
                        <div className="m-auto text-center py-12 max-w-sm space-y-3">
                            <div className="text-4xl">👥</div>
                            <h3 className="text-xs font-black text-gray-400">Select Employee to Evaluate</h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                                Select an employee from the directory on the left to load active cycle appraisal questions and submit reviews.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Employee summary header */}
                            <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                                        {selectedEmployee.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-gray-800 dark:text-white">{selectedEmployee.full_name}</h3>
                                        <span className="text-[10px] text-gray-450">{selectedEmployee.designation_name} • {selectedEmployee.department_name} • ID: {selectedEmployee.employee_id}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[9px] uppercase tracking-wider text-gray-450 font-bold">Active Cycle</span>
                                    <span className="text-teal-600 dark:text-teal-400 font-extrabold text-[10px]">{activeCycle?.name}</span>
                                </div>
                            </div>

                            {/* Questionnaire scrolling area */}
                            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
                                {loadingQuestions ? (
                                    <div className="text-center py-20 text-xs text-gray-400">Loading questions data...</div>
                                ) : questions.length === 0 ? (
                                    <div className="text-center py-20 text-xs text-gray-400 italic">
                                        No Admin/HR appraisal questions configured for the cycle "{activeCycle?.name}".
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {questions.map((q, idx) => {
                                            const currentRating = answersMap[q.id]?.rating ?? null;
                                            const currentComment = answersMap[q.id]?.comment ?? '';

                                            return (
                                                <div key={q.id} className="bg-gray-50 dark:bg-gray-850/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/10 space-y-3.5">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex gap-2">
                                                            <span className="text-xs font-black text-teal-500">{idx + 1}.</span>
                                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-250 leading-relaxed">
                                                                {q.question_text}
                                                            </p>
                                                        </div>

                                                        {/* Rating inputs based on question type */}
                                                        {q.question_type === 'scale' && (
                                                            <div className="flex gap-1 shrink-0">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => handleRatingChange(q.id, star)}
                                                                        className={`text-base font-bold transition-all ${
                                                                            currentRating && star <= currentRating 
                                                                                ? 'text-amber-400 scale-110' 
                                                                                : 'text-gray-300 dark:text-gray-700 hover:text-amber-300'
                                                                        }`}
                                                                    >
                                                                        ★
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {q.question_type === 'yes_no' && (
                                                            <div className="flex gap-2 shrink-0">
                                                                {[
                                                                    { val: 5, label: 'Yes' },
                                                                    { val: 1, label: 'No' }
                                                                ].map((btn) => (
                                                                    <button
                                                                        key={btn.val}
                                                                        type="button"
                                                                        onClick={() => handleRatingChange(q.id, btn.val)}
                                                                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition ${
                                                                            currentRating === btn.val
                                                                                ? btn.val === 5 
                                                                                    ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                                                                                    : 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                                                                : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700'
                                                                        }`}
                                                                    >
                                                                        {btn.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Text comment box */}
                                                    <div className="space-y-1.5">
                                                        <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">Remarks / Commentary</span>
                                                        <textarea
                                                            placeholder="Provide qualitative details, performance logs, or improvement recommendations..."
                                                            value={currentComment}
                                                            onChange={(e) => handleCommentChange(q.id, e.target.value)}
                                                            rows={2}
                                                            className="w-full bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Sticky footer action buttons */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmployee(null)}
                                    className="btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-650 dark:text-gray-400 text-xs font-bold px-5 py-2.5 rounded-xl transition"
                                >
                                    Clear Selection
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitHRAppraisal}
                                    disabled={saving}
                                    className="btn bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-teal-500/10 transition"
                                >
                                    {saving ? 'Submitting...' : 'Submit Evaluation'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAppraisal;
