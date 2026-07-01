import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';

interface Employee {
    id: number;
    employee_id: string;
    full_name: string;
    department_name: string | null;
    designation_name: string | null;
    initials: string;
    status: 'Completed' | 'Pending';
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    max_score: number;
    rating_score: number | null;
    comment: string;
}

const HRAppraisalDirect = () => {
    const dispatch = useDispatch();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answersMap, setAnswersMap] = useState<Record<number, { rating: number | null; comment: string }>>({});
    const [isCompleted, setIsCompleted] = useState(false);

    // UI state
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

    useEffect(() => {
        dispatch(setPageTitle('Direct HR Appraisal'));
        fetchEmployees();
    }, [dispatch]);

    const fetchEmployees = async () => {
        try {
            setLoadingList(true);
            setErrorMsg(null);
            const res = await axios.get(`${API_BASE}/employee/hr-direct-appraisal/`, { headers: getHeaders() });
            setEmployees(res.data);
        } catch (err: any) {
            console.error('Error fetching employees:', err);
            setErrorMsg(err.response?.data?.detail || 'Failed to load employee list.');
        } finally {
            setLoadingList(false);
        }
    };

    const handleSelectEmployee = async (emp: Employee) => {
        setSelectedEmployee(emp);
        setSuccessMsg(null);
        setErrorMsg(null);
        setLoadingDetails(true);
        setQuestions([]);
        setAnswersMap({});
        setIsCompleted(false);

        try {
            const res = await axios.get(`${API_BASE}/employee/hr-direct-appraisal/?employee_id=${emp.id}`, { headers: getHeaders() });
            const data = res.data;
            setQuestions(data.questions || []);
            setIsCompleted(data.is_completed || false);

            // Populate initial responses map
            const initialMap: Record<number, { rating: number | null; comment: string }> = {};
            (data.questions || []).forEach((q: Question) => {
                initialMap[q.id] = {
                    rating: q.rating_score !== null ? Number(q.rating_score) : (q.question_type === 'yes_no' ? null : (q.max_score ?? 5)),
                    comment: q.comment || ''
                };
            });
            setAnswersMap(initialMap);
        } catch (err: any) {
            console.error('Error fetching employee appraisal details:', err);
            setErrorMsg('Failed to load appraisal details.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleRatingChange = (qId: number, val: number | null) => {
        if (isCompleted) return;
        setAnswersMap(prev => ({
            ...prev,
            [qId]: { ...prev[qId], rating: val }
        }));
    };

    const handleCommentChange = (qId: number, val: string) => {
        if (isCompleted) return;
        setAnswersMap(prev => ({
            ...prev,
            [qId]: { ...prev[qId], comment: val }
        }));
    };

    const handleSubmitHRAppraisal = async () => {
        if (!selectedEmployee) return;

        if (!window.confirm(`Are you sure you want to submit the HR appraisal for ${selectedEmployee.full_name}?`)) {
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
                `${API_BASE}/employee/hr-direct-appraisal/`,
                {
                    employee_id: selectedEmployee.id,
                    answers: answersPayload,
                },
                { headers: getHeaders() }
            );

            setSuccessMsg(`HR Appraisal successfully submitted for ${selectedEmployee.full_name}!`);
            setIsCompleted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Refresh employee status in list
            fetchEmployees();
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
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">HR Appraisal System</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Evaluate employee performance and submit final ratings directly.
                </p>
            </div>

            {successMsg && (
                <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-4 py-3 rounded-xl text-xs font-bold animate__animated animate__fadeIn">
                    ✓ {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-4 py-3 rounded-xl text-xs font-bold animate__animated animate__fadeIn">
                    ⚠️ {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Directory list */}
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
                                        className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 my-1.5 ${isSelected
                                            ? 'bg-teal-500/10 border-l-4 border-teal-500'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-850'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-teal-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm shrink-0">
                                                {emp.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <span className={`block font-bold text-xs truncate ${isSelected ? 'text-teal-650 dark:text-teal-400' : 'text-gray-850 dark:text-white'}`}>{emp.full_name}</span>
                                                <span className="block text-[9px] text-gray-400 truncate">{emp.designation_name || 'Designation Not Set'} • ID: {emp.employee_id}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                            emp.status === 'Completed'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                        }`}>
                                            {emp.status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Questionnaire panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm p-6 h-[calc(100vh-250px)] flex flex-col">
                    {!selectedEmployee ? (
                        <div className="m-auto text-center py-12 max-w-sm space-y-3">
                            <div className="text-4xl">👥</div>
                            <h3 className="text-xs font-black text-gray-400">Select Employee to Evaluate</h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                                Choose an employee from the directory list on the left to review their direct HR appraisal.
                            </p>
                        </div>
                    ) : loadingDetails ? (
                        <div className="m-auto text-center py-12">
                            <div className="text-xs text-gray-400">Loading appraisal details...</div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col overflow-hidden">
                            {/* Employee summary header */}
                            <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                                        {selectedEmployee.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-gray-800 dark:text-white">{selectedEmployee.full_name}</h3>
                                        <span className="text-[10px] text-gray-455">{selectedEmployee.designation_name} • {selectedEmployee.department_name} • ID: {selectedEmployee.employee_id}</span>
                                    </div>
                                </div>
                                {isCompleted && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                                        <span>🔒</span> Completed & Locked
                                    </div>
                                )}
                            </div>

                            {/* Scrolling questions area */}
                            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
                                {questions.length === 0 ? (
                                    <div className="text-center py-20 text-xs text-gray-400 italic">
                                        No appraisal questions configured for this cycle.
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

                                                        {/* Rating scale */}
                                                        {q.question_type === 'scale' && (
                                                            <div className="flex gap-1 shrink-0">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => handleRatingChange(q.id, star)}
                                                                        disabled={isCompleted}
                                                                        className={`text-base font-bold transition-all ${isCompleted ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${
                                                                            currentRating && star <= currentRating ? 'text-amber-400 scale-110' : 'text-gray-300 dark:text-gray-700 hover:text-amber-300'
                                                                        }`}
                                                                    >
                                                                        ★
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Yes/No choices */}
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
                                                                        disabled={isCompleted}
                                                                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition ${isCompleted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${
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

                                                    {/* Commentary text area */}
                                                    <div className="space-y-1.5">
                                                        <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">Remarks / Commentary</span>
                                                        <textarea
                                                            placeholder="Provide qualitative details, performance logs, or improvement recommendations..."
                                                            value={currentComment}
                                                            onChange={(e) => handleCommentChange(q.id, e.target.value)}
                                                            rows={2}
                                                            disabled={isCompleted}
                                                            className={`w-full bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none ${isCompleted ? 'cursor-not-allowed opacity-70 bg-gray-50 dark:bg-gray-850' : ''}`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-3 shrink-0">
                                {isCompleted && (
                                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                        <span className="text-emerald-500 text-base">🔒</span>
                                        <div>
                                            <span className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                                            <span className="block text-[9px] text-emerald-500/70">This appraisal has been locked and cannot be edited.</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEmployee(null)}
                                        className="btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-650 dark:text-gray-400 text-xs font-bold px-5 py-2.5 rounded-xl transition"
                                    >
                                        Clear Selection
                                    </button>
                                    {!isCompleted && (
                                        <button
                                            type="button"
                                            onClick={handleSubmitHRAppraisal}
                                            disabled={saving}
                                            className="btn bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-teal-500/10 transition"
                                        >
                                            {saving ? 'Submitting...' : 'Submit Evaluation'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HRAppraisalDirect;
