import React, { useEffect, useState } from 'react';
import { axiosInstance } from './api';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableRow, TableCell } from '../../components/ui/table';
import Badge from '../../components/ui/badge/Badge';


interface MonthlyAttendance {
  date: string;
  day_name: string;
  check_in: string;
  check_out: string;
  shift: string;
  is_weekend: boolean;
  status: string;
  is_late: boolean;
  late_duration?: string;
  total_hours: string | number;
  overtime_hours: string | number;
  break_time: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  leave: number;
  half_day: number;
  late: number;
  working_days: number;
}

interface MonthOption {
  value: number;
  name: string;
}

const AttendanceHistory: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthName, setSelectedMonthName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAttendance = async (month = selectedMonth, year = selectedYear) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/attendance-history/', {
        params: { month, year },
      });
      setMonthlyData(res.data.monthly_data);
      setSummary(res.data.summary);
      setMonths(res.data.months);
      setYears(res.data.years);
      setSelectedMonth(res.data.selected_month);
      setSelectedYear(res.data.selected_year);
      setSelectedMonthName(res.data.selected_month_name);
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    setSelectedMonth(month);
    fetchAttendance(month, selectedYear);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    setSelectedYear(year);
    fetchAttendance(selectedMonth, year);
  };

  return (
    <ComponentCard title="Attendance History">
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div>
          <label className="mr-2 font-medium text-gray-900 dark:text-gray-200">Month:</label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 font-medium text-gray-900 dark:text-gray-200">Year:</label>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="font-semibold text-blue-700 dark:text-blue-400">{selectedMonthName} {selectedYear}</div>
      </div>
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {summary && (
          <>
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-blue-700 dark:text-blue-300">Present</div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-200">{summary.present}</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-red-700 dark:text-red-300">Absent</div>
              <div className="text-lg font-bold text-red-900 dark:text-red-200">{summary.absent}</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-yellow-700 dark:text-yellow-300">Leave</div>
              <div className="text-lg font-bold text-yellow-900 dark:text-yellow-200">{summary.leave}</div>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-purple-700 dark:text-purple-300">Half Day</div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-200">{summary.half_day}</div>
            </div>
            <div className="bg-pink-100 dark:bg-pink-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-pink-700 dark:text-pink-300">Late</div>
              <div className="text-lg font-bold text-pink-900 dark:text-pink-200">
                {summary.late === 0
                  ? monthlyData.filter(row => row.is_late).length
                  : summary.late}
              </div>
              {/* Show late count and total late duration for the month if available */}
              {monthlyData && (
                <>
                 
                  {monthlyData.filter(row => row.is_late && row.late_duration).length > 0 && (
                    <div className="text-xs text-pink-700 dark:text-pink-300 mt-1">
                      Total Late Duration: {
                        monthlyData.filter(row => row.is_late && row.late_duration)
                          .map(row => row.late_duration)
                          .filter(Boolean)
                          .join(' + ')
                      }
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg px-4 py-3 text-center">
              <div className="font-semibold text-green-700 dark:text-green-300">Working Days</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-200">{summary.working_days}</div>
            </div>
          </>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-full text-left align-middle">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Date</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Day</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Check In</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Check Out</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Shift</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Late</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Total Hours</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Overtime</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Break Time</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row, idx) => (
              <TableRow
                key={idx}
                className={
                  row.is_weekend
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : idx % 2 === 0
                    ? 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition'
                    : 'bg-gray-50 dark:bg-gray-900 hover:bg-blue-100 dark:hover:bg-gray-700 transition'
                }
              >
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.date}</TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.day_name}</TableCell>
                <TableCell className={`px-6 py-3 align-middle text-sm ${row.is_late && row.status === 'present' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-800 dark:text-gray-200'}`}>{row.check_in}</TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.check_out}</TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.shift}</TableCell>
                <TableCell className="px-6 py-3 align-middle">
                  {(() => {
                    const today = new Date();
                    const recordDate = new Date(row.date);
                    today.setHours(0, 0, 0, 0);
                    recordDate.setHours(0, 0, 0, 0);

                    // ✅ If the record is for a future date, show a light dash instead of "Absent"
                    if (recordDate > today) {
                      return <span className="text-gray-400">—</span>;
                    }

                    // Otherwise, show the actual status badge
                    return (
                      <Badge
                        variant="light"
                        color={
                          row.status === 'present'
                            ? 'success'
                            : row.status === 'leave'
                            ? 'info'
                            : row.status === 'half_day'
                            ? 'warning'
                            : row.status === 'absent'
                            ? 'error'
                            : row.status === 'weekend'
                            ? 'light'
                            : 'light'
                        }
                      >
                        {row.status
                          ? row.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                          : '—'}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="px-6 py-3 align-middle">
                  {row.is_late && row.late_duration ? (
                    <span className="text-red-600 dark:text-red-400 font-bold">{row.late_duration}</span>
                  ) : <span className="dark:text-gray-200">-</span>}
                </TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.total_hours}</TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.overtime_hours}</TableCell>
                <TableCell className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">{row.break_time}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
      {loading && <div className="text-center py-4 text-blue-600 font-semibold">Loading...</div>}
    </ComponentCard>
  );
};

export default AttendanceHistory;
