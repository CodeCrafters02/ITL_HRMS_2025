import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconSearch from '../../../components/Icon/IconSearch';
import { AttendanceDayRecord, AttendanceHistoryResponse, AttendanceStatus, fetchAttendanceHistory } from './api';

type StatusFilter = 'all' | AttendanceStatus;

const statusClassMap: Record<AttendanceStatus, string> = {
    present: 'bg-success-light text-success',
    absent: 'bg-danger-light text-danger',
    leave: 'bg-info-light text-info',
    half_day: 'bg-warning-light text-warning',
    weekend: 'bg-dark-light text-white-dark',
    checked_in: 'bg-primary-light text-primary',
    no_data: 'bg-secondary-light text-secondary',
};

const statusLabelMap: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    leave: 'Leave',
    half_day: 'Half Day',
    weekend: 'Weekend',
    checked_in: 'Checked In',
    no_data: 'No Data',
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString();
};

const AttendanceHistory = () => {
    const dispatch = useDispatch();
    const now = new Date();
    
    // Selection State
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    
    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceHistoryResponse | null>(null);

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchAttendanceHistory({
                month: selectedMonth,
                year: selectedYear,
                search: search.trim(),
                status: statusFilter,
                page,
                page_size: pageSize
            });
            setAttendanceData(response);
            setTotalCount(response.count || 0);
            setTotalPages(response.total_pages || 1);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load attendance history';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, search, statusFilter, page, pageSize]);

    useEffect(() => {
        dispatch(setPageTitle('Attendance History'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAttendance();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadAttendance]);

    const summary = attendanceData?.summary;

    // Smart Pagination logic
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* ─── Premium Header Banner ─── */}
            <div className="relative bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg border-0">
                {/* Decorative blurs */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-1/4 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
                            <IconCalendar className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Attendance History</h1>
                            <p className="text-white/80 mt-1 font-medium max-w-lg">
                                Comprehensive logs of your time, work durations, and shift details for the entire month.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        type="button" 
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white rounded-xl px-6 py-2.5 font-bold transition-all active:scale-95 flex items-center gap-2"
                        onClick={() => loadAttendance()}
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {/* ─── Summary Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                    { label: 'Working Days', value: summary?.working_days ?? 0, color: 'primary', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { label: 'Days Present', value: summary?.present ?? 0, color: 'success', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Days Absent', value: summary?.absent ?? 0, color: 'danger', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Leave Days', value: summary?.leave ?? 0, color: 'info', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Half Days', value: summary?.half_day ?? 0, color: 'warning', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                    { label: 'Late Entries', value: summary?.late ?? 0, color: 'secondary', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map((card, i) => (
                    <div key={i} className="panel p-5 bg-white dark:bg-[#111c2d] border-0 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 bg-${card.color}/10 rounded-xl`}>
                                <svg className={`w-5 h-5 text-${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white-dark">Stats</span>
                        </div>
                        <div className="mt-4">
                            <h4 className="text-2xl font-black text-gray-800 dark:text-white-light">{card.value}</h4>
                            <p className="text-xs font-bold text-white-dark mt-1 uppercase tracking-tight">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Filter & Table Section ─── */}
            <div className="panel p-0 border-0 overflow-hidden shadow-lg">
                {/* Header with Month/Year Selection & Filters */}
                <div className="p-5 border-b border-[#ebedf2] dark:border-[#1b2e4b] bg-white dark:bg-[#111c2d]">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Month</label>
                                <select 
                                    className="form-select border-0 bg-transparent py-0 h-6 text-xs font-bold min-w-[100px] focus:ring-0" 
                                    value={selectedMonth} 
                                    onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
                                >
                                    {(attendanceData?.months || []).map((month) => (
                                        <option key={month.value} value={month.value}>{month.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Year</label>
                                <select 
                                    className="form-select border-0 bg-transparent py-0 h-6 text-xs font-bold min-w-[80px] focus:ring-0" 
                                    value={selectedYear} 
                                    onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}
                                >
                                    {(attendanceData?.years || []).map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-white-dark uppercase tracking-wider">Status</label>
                                <select 
                                    className="form-select sm:w-[150px] text-xs py-1.5 h-9 rounded-xl border-gray-200 dark:border-gray-700" 
                                    value={statusFilter} 
                                    onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                                >
                                    <option value="all">Everywhere</option>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="leave">Leave</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="weekend">Weekend</option>
                                    <option value="checked_in">Checked In</option>
                                    <option value="no_data">No Data</option>
                                </select>
                            </div>

                            <div className="relative sm:w-[260px]">
                                <input
                                    type="text"
                                    className="form-input pl-9 text-xs py-1.5 h-9 rounded-xl border-gray-200 dark:border-gray-700 shadow-sm"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search by date, day or status..."
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                    <IconSearch className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Data */}
                <div className="table-responsive bg-white dark:bg-[#111c2d]">
                    <table className="table-hover text-sm">
                        <thead className="bg-[#f8faff] dark:bg-[#17243b]">
                            <tr>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Date Log</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Weekday</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Log Status</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Punch In</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Punch Out</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500 text-center">Net Hours</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500 text-center">Break</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Shortage/Late</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500">Shift Type</th>
                                <th className="!py-4 font-bold uppercase tracking-wider text-[11px] text-gray-500 text-center">OT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (!attendanceData || attendanceData.monthly_data.length === 0) ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                            <span className="text-sm font-semibold text-white-dark tracking-wide">Syncing attendance data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (!attendanceData || attendanceData.monthly_data.length === 0) ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                                                <IconCalendar className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                            </div>
                                            <span className="text-sm font-bold text-gray-400 mt-2">No records found for this period</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                attendanceData.monthly_data.map((row) => (
                                    <tr key={row.date} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                        <td className="!py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                <span className="font-bold text-gray-700 dark:text-gray-300">{formatDate(row.date)}</span>
                                            </div>
                                        </td>
                                        <td className="!py-4 font-medium">{row.day_name}</td>
                                        <td className="!py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${statusClassMap[row.status]}`}>
                                                {statusLabelMap[row.status]}
                                            </span>
                                        </td>
                                        <td className="!py-4 font-mono text-xs">{row.check_in}</td>
                                        <td className="!py-4 font-mono text-xs">{row.check_out}</td>
                                        <td className="!py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.total_hours !== '-' && Number(row.total_hours) < 8 ? 'text-orange-500' : ''}`}>
                                                {row.total_hours}
                                            </span>
                                        </td>
                                        <td className="!py-4 text-center text-xs font-semibold text-gray-500">{row.break_time}</td>
                                        <td className="!py-4">
                                            {row.is_late ? (
                                                <span className="flex items-center gap-1 text-danger font-bold text-[11px]">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {row.late_duration}
                                                </span>
                                            ) : (
                                                <span className="text-white-dark">—</span>
                                            )}
                                        </td>
                                        <td className="!py-4">
                                            <div className="max-w-[140px] truncate group-hover:text-indigo-600 font-medium text-xs transition-colors" title={row.shift}>
                                                {row.shift}
                                            </div>
                                        </td>
                                        <td className="!py-4 text-center font-bold text-success text-xs">
                                            {row.overtime_hours !== 0 && row.overtime_hours !== '-' ? `+${row.overtime_hours}` : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Integration */}
                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] bg-gray-50/50 dark:bg-[#0e1726]/40">
                        <div className="flex items-center gap-6">
                            <div className="text-xs text-white-dark font-bold">
                                Showing <span className="text-indigo-600">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="text-indigo-600">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                <span className="text-indigo-600">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-white-dark uppercase tracking-widest">Size:</span>
                                <select
                                    className="form-select border-gray-200 dark:border-gray-700 w-16 text-xs font-bold py-1 h-8 rounded-lg"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>
                        
                        <ul className="inline-flex items-center space-x-1.5 font-bold">
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center p-2 rounded-xl transition bg-white text-dark hover:text-white hover:bg-indigo-600 border border-gray-200 dark:border-gray-700 dark:bg-[#191e3a] disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? (
                                    <li key={`dots-${idx}`} className="px-1 text-white-dark font-black">…</li>
                                ) : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`flex justify-center px-3.5 h-9 min-w-[36px] rounded-xl transition border items-center text-xs ${
                                                page === p
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                                                    : 'bg-white text-dark hover:text-white hover:bg-indigo-600 border-gray-200 dark:border-gray-700 dark:text-white-light dark:bg-[#191e3a]'
                                            }`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                )
                            )}
                            <li>
                                <button
                                    type="button"
                                    className="flex justify-center p-2 rounded-xl transition bg-white text-dark hover:text-white hover:bg-indigo-600 border border-gray-200 dark:border-gray-700 dark:bg-[#191e3a] disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 items-center"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceHistory;
