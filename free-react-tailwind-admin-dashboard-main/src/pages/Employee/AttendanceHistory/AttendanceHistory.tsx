import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconSearch from '../../../components/Icon/IconSearch';
import { AttendanceHistoryResponse, AttendanceStatus, fetchAttendanceHistory, fetchCompanyHolidays } from './api';

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

const weekDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceHistory = () => {
    const dispatch = useDispatch();
    const now = new Date();
    
    // Selection State
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceHistoryResponse | null>(null);
    const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchAttendanceHistory({
                month: selectedMonth,
                year: selectedYear,
                search: search.trim(),
                status: statusFilter,
                page: 1,
                page_size: 100
            });
            setAttendanceData(response);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load attendance history';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, search, statusFilter]);

    useEffect(() => {
        dispatch(setPageTitle('Attendance History'));
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAttendance();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadAttendance]);

    useEffect(() => {
        const loadHolidays = async () => {
            try {
                const events = await fetchCompanyHolidays();
                const filtered = events.filter((event) => {
                    const d = new Date(event.date);
                    return !Number.isNaN(d.getTime()) && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                });
                const mapped: Record<string, string> = {};
                filtered.forEach((event) => {
                    mapped[event.date] = event.name || 'Holiday';
                });
                setHolidayMap(mapped);
            } catch {
                setHolidayMap({});
            }
        };

        loadHolidays();
    }, [selectedMonth, selectedYear]);

    const summary = attendanceData?.summary;

    const recordsByDate = useMemo(() => {
        const map = new Map<string, AttendanceHistoryResponse['monthly_data'][number]>();
        (attendanceData?.monthly_data || []).forEach((row) => map.set(row.date, row));
        return map;
    }, [attendanceData]);

    const calendarWeeks = useMemo(() => {
        const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
        const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        const cells: ({ day: number; dateKey: string } | null)[] = [];

        for (let i = 0; i < firstDayIndex; i++) cells.push(null);

        for (let day = 1; day <= totalDays; day++) {
            const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cells.push({ day, dateKey });
        }

        while (cells.length % 7 !== 0) cells.push(null);

        const weeks: ({ day: number; dateKey: string } | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }
        return weeks;
    }, [selectedYear, selectedMonth]);

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
                            <select className="form-select sm:w-[160px]" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                {(attendanceData?.months || []).map((month) => (
                                    <option key={month.value} value={month.value}>{month.name}</option>
                                ))}
                            </select>
                            <select className="form-select sm:w-[120px]" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                {(attendanceData?.years || []).map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select className="form-select sm:w-[170px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
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
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by date, day or shift..."
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                                    <IconSearch className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-[#ebedf2] dark:border-[#1b2e4b] flex flex-wrap gap-2">
                    {(Object.keys(statusLabelMap) as AttendanceStatus[]).filter((status) => status !== 'no_data').map((status) => (
                        <span key={status} className={`badge ${statusClassMap[status]}`}>
                            {statusLabelMap[status]}
                        </span>
                    ))}
                </div>

                {loading && (!attendanceData || attendanceData.monthly_data.length === 0) ? (
                    <div className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <span className="text-sm font-semibold text-white-dark tracking-wide">Syncing attendance data...</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {weekDayHeaders.map((label) => (
                                <div key={label} className="text-center text-xs font-bold uppercase text-white-dark py-2">
                                    {label}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarWeeks.flat().map((cell, idx) => {
                                if (!cell) {
                                    return <div key={`blank-${idx}`} className="min-h-[128px] rounded-lg bg-transparent" />;
                                }

                                const row = recordsByDate.get(cell.dateKey);
                                const holidayName = holidayMap[cell.dateKey];
                                const status = row?.status || 'no_data';
                                return (
                                    <div
                                        key={cell.dateKey}
                                        className="min-h-[128px] rounded-lg border border-[#ebedf2] dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726] p-2.5 flex flex-col gap-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold">{cell.day}</span>
                                            {!holidayName && status !== 'no_data' && <span className={`badge ${statusClassMap[status]}`}>{statusLabelMap[status]}</span>}
                                        </div>
                                        <p className="text-[11px] text-white-dark truncate">{row?.day_name || '-'}</p>
                                        {holidayName ? (
                                            <div className="mt-1">
                                                <span className="badge bg-info-light text-info">Holiday</span>
                                                <p className="text-[11px] font-semibold text-info truncate mt-1" title={holidayName}>
                                                    {holidayName}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] space-y-0.5 text-white-dark">
                                                <p><span className="font-semibold">In:</span> {row?.check_in || '-'}</p>
                                                <p><span className="font-semibold">Out:</span> {row?.check_out || '-'}</p>
                                                <p><span className="font-semibold">Hours:</span> {row?.total_hours ?? '-'}</p>
                                            </div>
                                        )}
                                        {row?.is_late && row.late_duration && <p className="text-[11px] font-semibold text-danger mt-auto">Late: {row.late_duration}</p>}
                                    </div>
                                );
                            })}
                        </div>
                        {!loading && attendanceData && attendanceData.monthly_data.length === 0 && (
                            <div className="text-center py-8">
                                <span className="text-sm font-bold text-gray-400">No records found for this period</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceHistory;
