import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconSearch from '../../../components/Icon/IconSearch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const SESSIONS_API = `${API_BASE_URL}/employee/training-sessions/`;

type SessionType = {
    id: number;
    title: string;
    course_title?: string | null;
    session_type: 'classroom' | 'online' | 'webinar';
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location?: string;
    meeting_link?: string;
    max_attendees?: number;
    status: 'scheduled' | 'completed' | 'cancelled';
};

const EmployeeTrainingCalendar = () => {
    const dispatch = useDispatch();
    const [sessions, setSessions] = useState<SessionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Training Calendar'));
        fetchSessions();
    }, [dispatch]);

    const getHeaders = () => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await authFetch(SESSIONS_API, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                setSessions(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching training sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSessions = sessions.filter((s) => {
        const query = search.toLowerCase();
        const titleMatch = s.title.toLowerCase().includes(query);
        const courseMatch = (s.course_title || '').toLowerCase().includes(query);
        const locationMatch = (s.location || '').toLowerCase().includes(query);
        const typeMatch = s.session_type.toLowerCase().includes(query);
        return titleMatch || courseMatch || locationMatch || typeMatch;
    });

    const getSessionTypeColor = (type: string) => {
        switch (type) {
            case 'online':
            case 'webinar':
                return 'bg-blue-500 text-white';
            case 'classroom':
                return 'bg-indigo-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    return (
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0e1726] to-[#8b5cf6] p-6 rounded-xl shadow-lg mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Classroom & Webinar Schedules</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">
                        View scheduled masterclasses, join live training webinars, and find classroom location directives.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="relative w-72">
                    <input
                        type="text"
                        className="form-input pr-10 rounded-lg text-xs"
                        placeholder="Search schedules or locations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IconSearch className="w-4 h-4" />
                    </span>
                </div>
            </div>

            {/* Timelines Cards */}
            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400 font-semibold">Loading session timelines...</span>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="panel text-center py-10 text-gray-500 font-medium">No training sessions scheduled at this moment.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSessions.map((session) => (
                        <div
                            key={session.id}
                            className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-5 flex flex-col justify-between overflow-hidden bg-white dark:bg-[#0e1726]/40 shadow-sm"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${getSessionTypeColor(session.session_type)}`}>
                                        {session.session_type}
                                    </span>
                                    <span className={`badge text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                        session.status === 'scheduled'
                                            ? 'bg-success text-white'
                                            : session.status === 'completed'
                                            ? 'bg-gray-450 text-white'
                                            : 'bg-danger text-white'
                                    }`}>
                                        {session.status}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-gray-800 dark:text-white-light leading-snug line-clamp-1">
                                    {session.title}
                                </h3>
                                {session.course_title && (
                                    <span className="block text-[11px] text-primary font-semibold mt-1">
                                        Course: {session.course_title}
                                    </span>
                                )}
                                <div className="text-xs text-gray-500 mt-3 font-medium">
                                    Date: <strong>{new Date(session.scheduled_date).toLocaleDateString()}</strong>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 font-medium">
                                    Time: <strong>{session.start_time} - {session.end_time}</strong>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {session.session_type === 'classroom' ? (
                                    <div className="text-xs text-gray-650 dark:text-gray-300 font-bold">
                                        📍 Room/Location: <span className="text-indigo-600 dark:text-indigo-400">{session.location || 'Training Room A'}</span>
                                    </div>
                                ) : (
                                    <div>
                                        {session.meeting_link ? (
                                            <a
                                                href={session.meeting_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-outline-primary btn-sm w-full text-xs font-bold py-1.5 rounded-lg text-center block"
                                            >
                                                Join Live Webinar / Call
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic block text-center">Meeting link will be shared soon</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeTrainingCalendar;
