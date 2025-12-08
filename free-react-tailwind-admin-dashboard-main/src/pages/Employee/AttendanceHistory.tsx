import React, { useEffect, useState } from 'react';
import { axiosInstance } from './api';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableRow, TableCell } from '../../components/ui/table';
import Badge from '../../components/ui/badge/Badge';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaUmbrellaBeach, FaClock, FaChartPie, FaDownload, FaFilter, FaSearch } from 'react-icons/fa';


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
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  useEffect(() => {
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      setIsDark(hasDarkClass);
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const filteredData = monthlyData.filter(row => {
    const matchesSearch = row.date.includes(searchTerm) || row.day_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className={`rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900' 
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
      }`}>
        <div className="relative p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/10' : 'bg-white/20'} backdrop-blur-sm shadow-lg animate-pulse`}>
                  <FaCalendarAlt className="text-white text-4xl" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                    Attendance History
                  </h1>
                  <p className="text-white/90 text-sm sm:text-base font-medium">
                    Track your attendance records and performance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 hover:scale-105 shadow-lg ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}>
                  <FaDownload />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className={`rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month Selector */}
          <div>
            <label className={`block mb-2 font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <FaCalendarAlt className="inline mr-2" />
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className={`block mb-2 font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <FaCalendarAlt className="inline mr-2" />
              Year
            </label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className={`block mb-2 font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <FaSearch className="inline mr-2" />
              Search Date/Day
            </label>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block mb-2 font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <FaFilter className="inline mr-2" />
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="half_day">Half Day</option>
              <option value="weekend">Weekend</option>
            </select>
          </div>
        </div>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {summary && (
          <>
            {/* Present Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-green-900 to-green-800 border border-green-700' 
                : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaCheckCircle className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Present</div>
                <div className="text-3xl font-black text-white">{summary.present}</div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">
                    {summary.working_days > 0 ? Math.round((summary.present / summary.working_days) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Absent Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-red-900 to-red-800 border border-red-700' 
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaTimesCircle className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Absent</div>
                <div className="text-3xl font-black text-white">{summary.absent}</div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">
                    {summary.working_days > 0 ? Math.round((summary.absent / summary.working_days) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Leave Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border border-yellow-700' 
                : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaUmbrellaBeach className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Leave</div>
                <div className="text-3xl font-black text-white">{summary.leave}</div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">Approved</span>
                </div>
              </div>
            </div>

            {/* Half Day Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700' 
                : 'bg-gradient-to-br from-purple-500 to-purple-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaChartPie className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Half Day</div>
                <div className="text-3xl font-black text-white">{summary.half_day}</div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">Partial</span>
                </div>
              </div>
            </div>

            {/* Late Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-pink-900 to-pink-800 border border-pink-700' 
                : 'bg-gradient-to-br from-pink-500 to-pink-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaClock className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Late</div>
                <div className="text-3xl font-black text-white">
                  {summary.late === 0 ? monthlyData.filter(row => row.is_late).length : summary.late}
                </div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">Arrivals</span>
                </div>
              </div>
            </div>

            {/* Working Days Card */}
            <div className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 text-center">
                <FaCalendarAlt className="text-white text-3xl mx-auto mb-2 group-hover:animate-bounce" />
                <div className="font-bold text-white/90 text-sm mb-1">Working Days</div>
                <div className="text-3xl font-black text-white">{summary.working_days}</div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <span className="text-white/80 text-xs">{selectedMonthName}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Data Table */}
      <div className={`rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Detailed Records
            </h3>
            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredData.length} records found
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full text-left align-middle">
            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
              <tr>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Date</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Day</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Check In</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Check Out</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Shift</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Status</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Late</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Total Hours</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Overtime</th>
                <th className={`px-6 py-4 text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Break Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
              <TableRow
                key={idx}
                className={`group transition-all duration-300 border-b ${
                  row.is_weekend
                    ? isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-100 border-gray-200'
                    : idx % 2 === 0
                    ? isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:bg-blue-50'
                    : isDark ? 'bg-gray-850 border-gray-700 hover:bg-gray-750' : 'bg-gray-50 border-gray-100 hover:bg-blue-50'
                }`}
              >
                <TableCell className={`px-6 py-4 align-middle font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      row.status === 'present' ? 'bg-green-500' :
                      row.status === 'absent' ? 'bg-red-500' :
                      row.status === 'leave' ? 'bg-yellow-500' :
                      row.status === 'half_day' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}></span>
                    {row.date}
                  </div>
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{row.day_name}</TableCell>
                <TableCell className={`px-6 py-4 align-middle font-mono text-sm ${
                  row.is_late && row.status === 'present' 
                    ? 'text-red-600 dark:text-red-400 font-bold' 
                    : isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {row.check_in !== '-' && (
                    <div className="flex items-center gap-2">
                      <FaClock className="text-xs" />
                      {row.check_in}
                    </div>
                  )}
                  {row.check_in === '-' && <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle font-mono text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {row.check_out !== '-' && (
                    <div className="flex items-center gap-2">
                      <FaClock className="text-xs" />
                      {row.check_out}
                    </div>
                  )}
                  {row.check_out === '-' && <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {row.shift}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 align-middle">
                  {(() => {
                    const today = new Date();
                    const recordDate = new Date(row.date);
                    today.setHours(0, 0, 0, 0);
                    recordDate.setHours(0, 0, 0, 0);

                    if (recordDate > today) {
                      return <span className="text-gray-400">—</span>;
                    }

                    const statusConfig = {
                      present: { bg: isDark ? 'bg-green-500/20' : 'bg-green-100', text: isDark ? 'text-green-300' : 'text-green-700', border: 'border-green-500' },
                      leave: { bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100', text: isDark ? 'text-yellow-300' : 'text-yellow-700', border: 'border-yellow-500' },
                      half_day: { bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100', text: isDark ? 'text-purple-300' : 'text-purple-700', border: 'border-purple-500' },
                      absent: { bg: isDark ? 'bg-red-500/20' : 'bg-red-100', text: isDark ? 'text-red-300' : 'text-red-700', border: 'border-red-500' },
                      weekend: { bg: isDark ? 'bg-gray-500/20' : 'bg-gray-100', text: isDark ? 'text-gray-300' : 'text-gray-700', border: 'border-gray-500' },
                      checked_in: { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', text: isDark ? 'text-blue-300' : 'text-blue-700', border: 'border-blue-500' },
                    };

                    const config = statusConfig[row.status as keyof typeof statusConfig] || statusConfig.weekend;

                    return (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-l-4 ${config.bg} ${config.text} ${config.border} inline-block min-w-[100px] text-center`}>
                        {row.status ? row.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '—'}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="px-6 py-4 align-middle">
                  {row.is_late && row.late_duration ? (
                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs ${
                      isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      <FaClock className="text-xs" />
                      {row.late_duration}
                    </div>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {row.total_hours !== '-' ? (
                    <span className={`px-2 py-1 rounded-md text-xs ${isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                      {row.total_hours}h
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {row.overtime_hours !== '-' ? (
                    <span className={`px-2 py-1 rounded-md text-xs ${isDark ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-700'}`}>
                      {row.overtime_hours}h
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className={`px-6 py-4 align-middle font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {row.break_time !== '-' ? (
                    <span className={`px-2 py-1 rounded-md text-xs ${isDark ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                      {row.break_time}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
              </TableRow>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <FaCalendarAlt className={`text-4xl ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              No Records Found
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Try adjusting your filters or search criteria
            </p>
          </div>
        )}

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <span className="font-medium">Live Data</span>
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className={`w-20 h-20 border-4 rounded-full ${isDark ? 'border-gray-700' : 'border-gray-300'}`}></div>
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Loading Attendance...
              </p>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
