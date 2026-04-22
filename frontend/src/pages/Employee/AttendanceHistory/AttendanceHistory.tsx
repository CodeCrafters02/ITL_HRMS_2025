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
            const fallbackCount = response.monthly_data?.length || 0;
            setTotalCount(fallbackCount);
            setTotalPages(Math.max(1, Math.ceil(fallbackCount / pageSize)));
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
            <div className="panel bg-gradient-to-r from-[#220fb6] via-[#4f6be5] to-[#0f52af] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <IconCalendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Attendance History</h1>
                            <p className="mt-1 text-white/75">View day-wise attendance, time logs, and status records.</p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={loadAttendance}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Working Days</p><p className="text-2xl font-bold mt-2">{summary?.working_days ?? 0}</p></div>
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Present</p><p className="text-2xl font-bold mt-2 text-success">{summary?.present ?? 0}</p></div>
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Absent</p><p className="text-2xl font-bold mt-2 text-danger">{summary?.absent ?? 0}</p></div>
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Leave</p><p className="text-2xl font-bold mt-2 text-info">{summary?.leave ?? 0}</p></div>
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Half Day</p><p className="text-2xl font-bold mt-2 text-warning">{summary?.half_day ?? 0}</p></div>
                <div className="panel"><p className="text-white-dark text-xs uppercase tracking-wide">Late Entries</p><p className="text-2xl font-bold mt-2 text-secondary">{summary?.late ?? 0}</p></div>
            </div>

            <div className="panel p-0 overflow-hidden">
                <div className="p-5 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <select className="form-select sm:w-[160px]" value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}>
                                {(attendanceData?.months || []).map((month) => (
                                    <option key={month.value} value={month.value}>{month.name}</option>
                                ))}
                            </select>
                            <select className="form-select sm:w-[120px]" value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}>
                                {(attendanceData?.years || []).map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select className="form-select sm:w-[170px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                                <option value="all">All Statuses</option>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="leave">Leave</option>
                                <option value="half_day">Half Day</option>
                                <option value="weekend">Weekend</option>
                                <option value="checked_in">Checked In</option>
                                <option value="no_data">No Data</option>
                            </select>

                            <div className="relative sm:w-[260px]">
                                <input
                                    type="text"
                                    className="form-input pl-10"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search by date, day or shift..."
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                    <IconSearch className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                        <div className="flex items-center gap-6">
                            <div className="text-xs text-white-dark">
                                Showing <span className="text-primary font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
                                <span className="text-primary font-semibold">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                <span className="text-primary font-semibold">{totalCount}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white-dark">Per page:</span>
                                <select
                                    className="form-select w-16 text-xs"
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>

                        <ul className="inline-flex items-center gap-1">
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                                    disabled={page === 1}
                                >
                                    Prev
                                </button>
                            </li>
                            {getPageNumbers().map((p, idx) =>
                                p === '...' ? (
                                    <li key={`dots-${idx}`} className="px-1 text-white-dark">...</li>
                                ) : (
                                    <li key={p}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'} min-w-[34px]`}
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
                                    className="btn btn-sm btn-outline-primary px-2.5"
                                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Table Data */}
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Status</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th className="text-center">Hours</th>
                                <th className="text-center">Break</th>
                                <th>Late</th>
                                <th>Shift</th>
                                <th className="text-center">Overtime</th>
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
                                    <tr key={row.date}>
                                        <td>
                                            <span className="font-semibold">{formatDate(row.date)}</span>
                                        </td>
                                        <td>{row.day_name}</td>
                                        <td>
                                            <span className={`badge ${statusClassMap[row.status]}`}>
                                                {statusLabelMap[row.status]}
                                            </span>
                                        </td>
                                        <td className="font-mono text-xs">{row.check_in}</td>
                                        <td className="font-mono text-xs">{row.check_out}</td>
                                        <td className="text-center">
                                            <span className={row.total_hours !== '-' && Number(row.total_hours) < 8 ? 'text-warning font-semibold' : ''}>
                                                {row.total_hours}
                                            </span>
                                        </td>
                                        <td className="text-center text-xs text-white-dark">{row.break_time}</td>
                                        <td>
                                            {row.is_late ? (
                                                <span className="text-danger text-xs font-semibold">{row.late_duration}</span>
                                            ) : (
                                                <span className="text-white-dark text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="max-w-[140px] truncate text-xs" title={row.shift}>{row.shift}</td>
                                        <td className="text-center text-xs font-semibold text-success">
                                            {row.overtime_hours !== 0 && row.overtime_hours !== '-' ? `+${row.overtime_hours}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default AttendanceHistory;
