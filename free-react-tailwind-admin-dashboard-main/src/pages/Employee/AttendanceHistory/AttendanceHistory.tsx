import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCalendar from '../../../components/Icon/IconCalendar';
import PageHeader from '../../../components/Common/PageHeader';
import { AttendanceHistoryResponse, AttendanceStatus, fetchAttendanceHistory, fetchCompanyHolidays, fetchPresenceForDate } from './api';
import { Dot, type Summary as PresenceSummary } from '../PresenceCard';

import Button from '../../../components/Common/Button';
import Modal from '../../../components/Common/Modal';
const statusClassMap: Record<AttendanceStatus, string> = {
    present: 'bg-success-light text-success',
    absent: 'bg-danger-light text-danger',
    leave: 'bg-info-light text-info',
    half_day: 'bg-warning-light text-warning',
    weekend: 'bg-dark-light text-white-dark',
    holiday: 'bg-info-light text-info',
    checked_in: 'bg-primary-light text-primary',
    no_data: 'bg-secondary-light text-secondary',
};

const statusLabelMap: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    leave: 'Leave',
    half_day: 'Half Day',
    weekend: 'Weekend',
    holiday: 'Holiday',
    checked_in: 'Checked In',
    no_data: 'No Data',
};

const statusDotMap: Record<AttendanceStatus, string> = {
    present: 'bg-success',
    absent: 'bg-danger',
    leave: 'bg-info',
    half_day: 'bg-warning',
    weekend: 'bg-dark-light',
    holiday: 'bg-info',
    checked_in: 'bg-primary',
    no_data: 'bg-secondary',
};

const weekDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceHistory = () => {
    const dispatch = useDispatch();
    const today = useMemo(() => new Date(), []);
    
    // Selection State
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceHistoryResponse | null>(null);
    const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [teams, setTeams] = useState<PresenceSummary | null>(null);
    const [teamsLoading, setTeamsLoading] = useState(false);

    useEffect(() => {
        if (!isDetailsModalOpen || !selectedDateKey) return;
        let stop = false;
        setTeams(null);
        setTeamsLoading(true);
        fetchPresenceForDate(selectedDateKey)
            .then((d) => !stop && setTeams(d))
            .catch(() => !stop && setTeams(null))
            .finally(() => !stop && setTeamsLoading(false));
        return () => {
            stop = true;
        };
    }, [isDetailsModalOpen, selectedDateKey]);

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchAttendanceHistory({
                month: selectedMonth,
                year: selectedYear,
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
    }, [selectedMonth, selectedYear]);

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

    const selectedDayRow = selectedDateKey ? recordsByDate.get(selectedDateKey) : undefined;
    const selectedHolidayName = selectedDateKey ? holidayMap[selectedDateKey] : undefined;
    const selectedStatus: AttendanceStatus = selectedDayRow?.status || 'no_data';

    const selectedDateLabel = useMemo(() => {
        if (!selectedDateKey) return '-';
        const parsed = new Date(`${selectedDateKey}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return selectedDateKey;
        return parsed.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }, [selectedDateKey]);

    useEffect(() => {
        if (!calendarWeeks.length) {
            setSelectedDateKey(null);
            return;
        }

        const firstAvailable = calendarWeeks.flat().find((cell) => cell !== null)?.dateKey ?? null;
        if (!firstAvailable) {
            setSelectedDateKey(null);
            return;
        }

        const todayKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const shouldSelectToday =
            selectedYear === today.getFullYear() &&
            selectedMonth === today.getMonth() + 1 &&
            recordsByDate.has(todayKey);

        const nextSelection = shouldSelectToday ? todayKey : firstAvailable;
        if (!selectedDateKey || !recordsByDate.has(selectedDateKey)) {
            setSelectedDateKey(nextSelection);
        }
    }, [calendarWeeks, recordsByDate, selectedDateKey, selectedMonth, selectedYear, today]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <PageHeader
                title="Attendance History"
                subtitle="View day-wise check-in and check-out logs, worked hours, punctuality records, and monthly attendance calendar."
                icon={<IconCalendar />}
                badge="Time & Attendance"
                variant="indigo"
                actions={
                    <Button variant="outline" type="button"  onClick={loadAttendance}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                }
            />

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Working Days</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2">{summary?.working_days ?? 0}</p></div>
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Present</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-success">{summary?.present ?? 0}</p></div>
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Absent</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-danger">{summary?.absent ?? 0}</p></div>
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Leave</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-info">{summary?.leave ?? 0}</p></div>
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Half Day</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-warning">{summary?.half_day ?? 0}</p></div>
                <div className="panel p-3 sm:p-4"><p className="text-white-dark text-[10px] sm:text-xs uppercase tracking-wide">Late Entries</p><p className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-secondary">{summary?.late ?? 0}</p></div>
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
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
                            <span className="text-sm font-semibold text-white-dark tracking-wide">Syncing attendance data...</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <div className="sm:min-w-[720px]">
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                    {weekDayHeaders.map((label) => (
                                        <div key={label} className="text-center text-[10px] sm:text-xs font-bold uppercase text-white-dark py-1.5 sm:py-2">
                                            {label}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                    {calendarWeeks.flat().map((cell, idx) => {
                                if (!cell) {
                                        return <div key={`blank-${idx}`} className="min-h-[58px] sm:min-h-[92px] md:min-h-[128px] rounded-lg bg-transparent" />;
                                }

                                const row = recordsByDate.get(cell.dateKey);
                                const holidayName = holidayMap[cell.dateKey];
                                const status = row?.status || 'no_data';
                                const isSelected = selectedDateKey === cell.dateKey;
                                return (
                                    <button
                                        type="button"
                                        key={cell.dateKey}
                                        onClick={() => {
                                            setSelectedDateKey(cell.dateKey);
                                            setIsDetailsModalOpen(true);
                                        }}
                                        className={`min-h-[58px] sm:min-h-[92px] md:min-h-[128px] min-w-0 overflow-hidden rounded-lg border bg-white dark:bg-[#0e1726] p-1 sm:p-2 md:p-2.5 flex flex-col gap-0.5 sm:gap-1 text-left transition ${
                                            isSelected
                                                ? 'border-primary ring-1 ring-primary/40 shadow-md shadow-primary/10'
                                                : 'border-[#ebedf2] dark:border-[#1b2e4b] hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="flex w-full min-w-0 items-center justify-between gap-1">
                                            <span className="text-xs sm:text-sm font-bold">{cell.day}</span>
                                            {!holidayName && status !== 'no_data' && <span className={`badge min-w-0 truncate hidden sm:inline-block ${statusClassMap[status]}`}>{statusLabelMap[status]}</span>}
                                            {(holidayName || status !== 'no_data') && <span className={`sm:hidden h-2 w-2 shrink-0 rounded-full ${holidayName ? 'bg-info' : statusDotMap[status]}`} />}
                                        </div>
                                        <p className="hidden sm:block w-full text-[11px] text-white-dark truncate">{row?.day_name || '-'}</p>
                                        {holidayName ? (
                                            <div className="mt-1 hidden w-full min-w-0 sm:block">
                                                <span className="badge bg-info-light text-info">Holiday</span>
                                                <p className="text-[11px] font-semibold text-info truncate mt-1" title={holidayName}>
                                                    {holidayName}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="w-full min-w-0 text-[10px] sm:text-[11px] space-y-0.5 text-white-dark">
                                                <p className="hidden sm:flex items-center justify-between gap-1">
                                                    <span className="shrink-0 font-semibold">In</span>
                                                    <span className="min-w-0 truncate font-bold" title={row?.check_in || undefined}>{row?.check_in || '-'}</span>
                                                </p>
                                                <p className="hidden sm:flex items-center justify-between gap-1">
                                                    <span className="shrink-0 font-semibold">Out</span>
                                                    <span className="min-w-0 truncate font-bold" title={row?.check_out || undefined}>{row?.check_out || '-'}</span>
                                                </p>
                                                <p className="flex items-center justify-between gap-1">
                                                    <span className="hidden shrink-0 font-semibold sm:inline">Hrs</span>
                                                    <span className="min-w-0 truncate font-bold text-primary" title="Working hours">
                                                        {typeof row?.total_hours === 'number' ? `${row.total_hours}h` : '-'}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        {row?.is_late && row.late_duration && <p className="hidden sm:block w-full truncate text-[11px] font-semibold text-danger mt-auto" title={`Late: ${row.late_duration}`}>Late: {row.late_duration}</p>}
                                    </button>
                                );
                                    })}
                                </div>
                            </div>
                        </div>
                        {!loading && attendanceData && attendanceData.monthly_data.length === 0 && (
                            <div className="text-center py-8">
                                <span className="text-sm font-bold text-gray-400">No records found for this period</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isDetailsModalOpen && selectedDateKey && (
                <Modal open onClose={() => setIsDetailsModalOpen(false)} title="Attendance Details" subtitle={selectedDateLabel} size="3xl" bodyClassName="!p-0">
                        <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedStatus !== 'no_data' && (
                                    <span className={`badge ${statusClassMap[selectedStatus]}`}>{statusLabelMap[selectedStatus]}</span>
                                )}
                                {selectedHolidayName && <span className="badge bg-info-light text-info">Holiday</span>}
                            </div>

                            {selectedHolidayName ? (
                                <div className="mt-4 rounded-md bg-info-light/40 p-3">
                                    <p className="text-sm font-semibold text-info">{selectedHolidayName}</p>
                                </div>
                            ) : (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                                    <div><span className="text-white-dark">Day:</span> <span className="font-semibold">{selectedDayRow?.day_name || '-'}</span></div>
                                    <div><span className="text-white-dark">In:</span> <span className="font-semibold">{selectedDayRow?.check_in || '-'}</span></div>
                                    <div><span className="text-white-dark">Out:</span> <span className="font-semibold">{selectedDayRow?.check_out || '-'}</span></div>
                                    <div><span className="text-white-dark">Working Hours:</span> <span className="font-semibold">{selectedDayRow?.total_hours ?? '-'}</span></div>
                                    <div>
                                        <span className="text-white-dark">Tracked by:</span>{' '}
                                        <span className="font-semibold">{selectedDayRow?.source === 'teams' ? 'Microsoft Teams status' : 'Manual punch'}</span>
                                    </div>
                                    <div><span className="text-white-dark">Total Break:</span> <span className="font-semibold">{selectedDayRow?.break_time || '-'}</span></div>
                                    <div><span className="text-white-dark">Shift:</span> <span className="font-semibold">{selectedDayRow?.shift || '-'}</span></div>
                                    <div><span className="text-white-dark">Overtime:</span> <span className="font-semibold">{selectedDayRow?.overtime_hours ?? '-'}</span></div>
                                    {selectedDayRow?.required_full_hours !== undefined && (
                                        <div className="sm:col-span-2">
                                            <span className="text-white-dark">Required that day:</span>{' '}
                                            <span className="font-semibold">Present ≥ {selectedDayRow.required_full_hours}h · Half day ≥ {selectedDayRow.required_half_hours}h</span>
                                        </div>
                                    )}
                                    <div><span className="text-white-dark">Late:</span> <span className="font-semibold">{selectedDayRow?.late_duration || (selectedDayRow?.is_late ? 'Yes' : 'No')}</span></div>
                                </div>
                            )}

                            {!selectedHolidayName && teamsLoading && <p className="mt-5 text-xs text-white-dark">Loading Teams activity...</p>}
                            {!selectedHolidayName && teams && (!!teams.statuses?.length || !!teams.timeline?.length) && (
                                <div className="mt-5 space-y-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] pt-4">
                                    <h4 className="text-sm font-bold">Microsoft Teams activity</h4>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                            <p className="text-[10px] uppercase tracking-wide text-gray-500">Working</p>
                                            <p className="text-lg font-black">{teams.working?.label || '0h 00m'}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                            <p className="text-[10px] uppercase tracking-wide text-gray-500">Overtime</p>
                                            <p className="text-lg font-black">{teams.overtime?.label || '0h 00m'}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                                            <p className="text-[10px] uppercase tracking-wide text-gray-500">Punch</p>
                                            <p className="text-sm font-bold mt-1.5">{teams.punch?.in || '--:--'} / {teams.punch?.out || '--:--'}</p>
                                        </div>
                                    </div>

                                    {!!teams.statuses?.length && (
                                        <section>
                                            <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Time by status</h5>
                                            <div className="space-y-1.5">
                                                {teams.statuses.map((r) => (
                                                    <div key={r.status} className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-2"><Dot c={r.status} /> {r.status}</span>
                                                        <b>{r.label}</b>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {!!teams.timeline?.length && (
                                        <section>
                                            <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Status timeline</h5>
                                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                                {teams.timeline.map((t, i) => (
                                                    <div key={i} className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-2"><Dot c={t.status} /> {t.status}</span>
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {t.start} – {t.end} <span className="text-gray-400">({t.label})</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {!!teams.sessions?.length && (
                                        <section>
                                            <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Working sessions</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {teams.sessions.map((x, i) => (
                                                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5">{x.start} – {x.end}</span>
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-2">Working time counts Available, Busy and Do Not Disturb only.</p>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                </Modal>
            )}
        </div>
    );
};

export default AttendanceHistory;
