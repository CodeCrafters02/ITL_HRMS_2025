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
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceHistoryResponse | null>(null);

    const loadAttendance = useCallback(async (month: number, year: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchAttendanceHistory(month, year);
            setAttendanceData(response);
            setSelectedMonth(response.selected_month);
            setSelectedYear(response.selected_year);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load attendance history';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Attendance History'));
    }, [dispatch]);

    useEffect(() => {
        loadAttendance(selectedMonth, selectedYear);
    }, [selectedMonth, selectedYear, loadAttendance]);

    const filteredRows = useMemo(() => {
        const rows = attendanceData?.monthly_data || [];
        const lowered = search.trim().toLowerCase();
        return rows.filter((row: AttendanceDayRecord) => {
            const statusMatch = statusFilter === 'all' || row.status === statusFilter;
            const searchMatch =
                !lowered ||
                row.date.toLowerCase().includes(lowered) ||
                row.day_name.toLowerCase().includes(lowered) ||
                statusLabelMap[row.status].toLowerCase().includes(lowered);
            return statusMatch && searchMatch;
        });
    }, [attendanceData, search, statusFilter]);

    const summary = attendanceData?.summary;

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Attendance History</h1>
                        <p className="mt-1 text-white/80">Monitor monthly attendance, late entries, and work duration details.</p>
                    </div>
                    <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={() => loadAttendance(selectedMonth, selectedYear)}>
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Working Days</p>
                        <p className="text-2xl font-bold mt-2">{summary.working_days}</p>
                    </div>
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Present</p>
                        <p className="text-2xl font-bold mt-2 text-success">{summary.present}</p>
                    </div>
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Absent</p>
                        <p className="text-2xl font-bold mt-2 text-danger">{summary.absent}</p>
                    </div>
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Leaves</p>
                        <p className="text-2xl font-bold mt-2 text-info">{summary.leave}</p>
                    </div>
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Half Day</p>
                        <p className="text-2xl font-bold mt-2 text-warning">{summary.half_day}</p>
                    </div>
                    <div className="panel">
                        <p className="text-white-dark text-xs uppercase tracking-wide">Late Days</p>
                        <p className="text-2xl font-bold mt-2 text-primary">{summary.late}</p>
                    </div>
                </div>
            )}

            <div className="panel">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div>
                        <label className="form-label">Month</label>
                        <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                            {(attendanceData?.months || []).map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Year</label>
                        <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {(attendanceData?.years || []).map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Status</label>
                        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                            <option value="all">All Statuses</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="half_day">Half Day</option>
                            <option value="weekend">Weekend</option>
                            <option value="checked_in">Checked In</option>
                            <option value="no_data">No Data</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="form-input pl-10"
                                placeholder="Date/day/status"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                <IconSearch className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="panel p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white-light dark:border-[#1b2e4b]">
                    <div className="flex items-center gap-2">
                        <IconCalendar className="w-5 h-5 text-primary" />
                        <h3 className="font-bold">
                            {attendanceData?.selected_month_name || 'Month'} {attendanceData?.selected_year || ''}
                        </h3>
                    </div>
                    <span className="text-sm text-white-dark">{filteredRows.length} records</span>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Status</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Total Hours</th>
                                <th>Break</th>
                                <th>Late</th>
                                <th>Shift</th>
                                <th>Overtime</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-white-dark">
                                        Loading attendance history...
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-white-dark">
                                        No attendance records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => (
                                    <tr key={row.date}>
                                        <td>{formatDate(row.date)}</td>
                                        <td>{row.day_name}</td>
                                        <td>
                                            <span className={`badge ${statusClassMap[row.status]}`}>{statusLabelMap[row.status]}</span>
                                        </td>
                                        <td>{row.check_in}</td>
                                        <td>{row.check_out}</td>
                                        <td>{row.total_hours}</td>
                                        <td>{row.break_time}</td>
                                        <td>{row.is_late ? <span className="text-danger">{row.late_duration || 'Late'}</span> : '-'}</td>
                                        <td className="max-w-[180px] truncate" title={row.shift}>
                                            {row.shift}
                                        </td>
                                        <td>{row.overtime_hours}</td>
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
