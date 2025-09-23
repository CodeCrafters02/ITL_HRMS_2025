import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { 
  Calendar, 
  Search, 
  Settings, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Users,
  Clock,
  TrendingUp,
  X,
  Info,
  BarChart3,
  FileText
} from 'lucide-react';
import { axiosInstance } from '../Dashboard/api';

interface DailyRecord {
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  cumulative_worked_hours: number;
  scheduled_hours: number;
  break_time: number;
  overtime_hours: number;
  is_late: boolean;
  late_by_minutes: number;
  early_departure: boolean;
  early_departure_minutes: number;
  leave_type: string | null;
  leave_type_initials: string | null;
  half_day: boolean;
  remarks: string;
  shift_type: string | null;
}

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  department: string | null;
  month: string;
  total_working_days: number;
  total_present_days: number;
  total_absent_days: number;
  total_leave_days: number;
  total_half_days: number;
  total_late_days: number;
  total_holidays: number;
  total_worked_hours: number;
  cumulative_worked_hours: number;
  total_expected_hours: number;
  total_overtime_hours: number;
  total_break_time: number;
  hours_variance: number;
  percentage_present: number;
  hours_efficiency: number;
  average_hours_per_day: number;
  average_hours_per_working_day: number;
  monthly_summary: {
    productive_days: number;
    non_productive_days: number;
    leave_utilization: number;
    punctuality_score: number;
    overtime_frequency: number;
    break_usage_hours: number;
  };
  holidays: Array<{date: string; name: string}>;
  leave_summary: {[key: string]: number};
  shift_policies: Array<{
    id: number;
    name: string;
    full_day_hours: number;
  }>;
  daily_attendance: DailyRecord[];
}

interface AttendanceData {
  month_dates: string[];
  attendance_records: AttendanceRecord[];
}

const AttendanceLog: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Statistics
  const [stats, setStats] = useState({
    totalEmployees: 0,
    averageAttendance: 0,
    totalHours: 0,
    presentToday: 0
  });

  // Tooltip state
  const [tooltip, setTooltip] = useState<{visible: boolean, x: number, y: number, text: string} | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Fetch attendance data from backend
  useEffect(() => {
    setLoading(true);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const calendarDates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(calendarYear, calendarMonth, i + 1);
      return d.toISOString().split('T')[0];
    });
    const monthStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
    axiosInstance.get(`/attendance-logs/?month=${monthStr}`)
      .then(res => {
        console.log('Backend response:', res.data); // Debug log
        console.log('Sample employee data:', res.data[0]); // Show first employee structure
        const response = res.data;
        const month_dates: string[] = calendarDates;
        // Backend returns direct array, not wrapped in object
        const attendance_records: AttendanceRecord[] = Array.isArray(response) ? response : (response.attendance_records || []);
        // Calculate statistics
        const totalEmployees = attendance_records.length;
        const averageAttendance = attendance_records.reduce((sum, emp) => sum + emp.percentage_present, 0) / (totalEmployees || 1);
        const totalHours = attendance_records.reduce((sum, emp) => sum + emp.cumulative_worked_hours, 0);
        const today = new Date().toISOString().split('T')[0];
        const presentToday = attendance_records.filter(emp => emp.daily_attendance.find(day => day.date === today && day.status === 'Present')).length;
        setStats({
          totalEmployees,
          averageAttendance,
          totalHours,
          presentToday
        });
        setAttendanceData({ month_dates, attendance_records });
        setFilteredRecords(attendance_records);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching attendance data:', error);
        console.error('Error response:', error.response?.data);
        setLoading(false);
      });
  }, [calendarMonth, calendarYear]);

  // Filter employees based on search and status
  useEffect(() => {
    if (!attendanceData) return;

    let filtered = attendanceData.attendance_records;

    // Search filter
    if (searchEmployee.trim()) {
      const searchLower = searchEmployee.toLowerCase();
      filtered = filtered.filter(record => 
        record.employee_name.toLowerCase().includes(searchLower) ||
        record.employee_id.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = record.daily_attendance.find(day => day.date === today);
        // Map frontend filter values to backend status values
        const statusMap: { [key: string]: string } = {
          'P': 'Present',
          'A': 'Absent', 
          'L': 'Leave',
          'H': 'Holiday',
          'HD': 'Half Day'
        };
        return todayRecord?.status === statusMap[selectedStatus];
      });
    }

    setFilteredRecords(filtered);
  }, [searchEmployee, selectedStatus, attendanceData]);

  const getStatusCell = (record: DailyRecord, date: string) => {
    const baseClasses = "w-7 h-7 rounded text-white text-xs font-semibold flex items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-md relative";

    const showTooltip = (e: React.MouseEvent) => {
      let text = '';
      if (record.status === 'Present' || record.status === 'Absent') {
        text = `Date: ${new Date(date).toLocaleDateString()}\nCheck-in: ${record.check_in || '—'}\nCheck-out: ${record.check_out || '—'}`;
        if (record.worked_hours > 0) {
          text += `\nHours: ${record.worked_hours}h`;
        }
      } else if (record.status === 'Leave') {
        text = `Leave: ${record.leave_type || 'General Leave'}\nDate: ${new Date(date).toLocaleDateString()}`;
      } else if (record.status === 'Holiday') {
        text = `Holiday: ${record.remarks || 'Public Holiday'}\nDate: ${new Date(date).toLocaleDateString()}`;
      } else if (record.status === 'Half Day') {
        text = `Half Day\nDate: ${new Date(date).toLocaleDateString()}\nCheck-in: ${record.check_in || '—'}\nCheck-out: ${record.check_out || '—'}`;
        if (record.worked_hours > 0) {
          text += `\nHours: ${record.worked_hours}h`;
        }
      }
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text,
      });
    };

    const hideTooltip = () => setTooltip(null);

  // Half Day (should be status 'H' and half_day true, but previous 'H' branch covers all 'H' cases)
  // Remove unreachable duplicate branch.
    // Present
    if (record.status === 'Present') {
      return (
        <div
          className={baseClasses + ' bg-emerald-600 hover:bg-emerald-700'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          P
          {record.is_late && (
            <span className="absolute -top-1 -right-1">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
            </span>
          )}
        </div>
      );
    }
    // Absent
    if (record.status === 'Absent') {
      return (
        <div
          className={baseClasses + ' bg-red-600 hover:bg-red-700'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          A
        </div>
      );
    }
    // Holiday (full day)
    if (record.status === 'Holiday' && !record.half_day) {
      return (
        <div
          className={baseClasses + ' bg-amber-600 hover:bg-amber-700'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          H
        </div>
      );
    }
    // Leave with initials and overlap icon
    if (record.status === 'Leave') {
      const leaveInitials = record.leave_type_initials || (record.leave_type ? record.leave_type[0].toUpperCase() : 'L');
      return (
        <div
          className={baseClasses + ' bg-blue-600 hover:bg-blue-700'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          {leaveInitials}
          <span className="absolute -top-1 -right-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="6" fill="#fff" stroke="#2563eb" strokeWidth="2" />
              <text x="7" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#2563eb">{leaveInitials}</text>
            </svg>
          </span>
        </div>
      );
    }
    // Half Day
    if (record.status === 'Half Day') {
      return (
        <div
          className={baseClasses + ' bg-orange-600 hover:bg-orange-700'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          HD
        </div>
      );
    }
    // Default
    return <div className={baseClasses + ' bg-gray-400'}>-</div>;
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayOfMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return String(date.getDate()).padStart(2, '0');
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Loading Attendance Data</h3>
            <p className="text-slate-600">Please wait while we fetch the records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
                <p className="text-sm text-slate-600 mt-1">Employee attendance tracking and reporting system</p>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Dashboard */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Employees</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalEmployees}</p>
                  <p className="text-xs text-slate-500 mt-1">Active workforce</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Present Today</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.presentToday}</p>
                  <p className="text-xs text-slate-500 mt-1">Currently present</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg. Attendance</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.averageAttendance}%</p>
                  <p className="text-xs text-slate-500 mt-1">Monthly average</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Hours</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalHours.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Working hours</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Controls Section */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Attendance Records</h2>
                <p className="text-sm text-slate-600 mt-1">View and manage employee attendance data</p>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="employee-search" className="block text-sm font-medium text-slate-700 mb-2">
                    Search Employee
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="employee-search"
                      type="text"
                      placeholder="Search by name or employee ID..."
                      value={searchEmployee}
                      onChange={(e) => setSearchEmployee(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {searchEmployee && (
                      <button
                        onClick={() => setSearchEmployee('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700 mb-2">
                    Filter by Status
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="P">Present</option>
                    <option value="A">Absent</option>
                    <option value="L">On Leave</option>
                    <option value="H">Holiday</option>
                    <option value="HD">Half Day</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchEmployee('');
                      setSelectedStatus('all');
                    }}
                    className="w-full px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Calendar Navigation */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Month
              </button>
              
              <h3 className="text-xl font-semibold text-slate-900">
                {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                onClick={handleNextMonth}
                className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next Month
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>

          {/* Professional Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-16 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                  <th className="w-48 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                  <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                  <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Attendance</th>
                  <th className="w-24 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Hours</th>
                  {attendanceData?.month_dates?.map((date) => {
                    const day = getDayOfMonth(date);
                    const weekday = getDayOfWeek(date);
                    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                    return (
                      <th key={date} className={`w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isWeekend ? 'bg-slate-100 text-slate-500' : 'text-slate-600'}`}>
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-sm font-bold">{day}</span>
                          <span className="text-xs">{weekday}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredRecords && filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <tr key={record.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{record.employee_name}</div>
                          <div className="text-xs text-slate-500">ID: {record.employee_id}</div>
                        </div>
                      </td>
                      {/* Action column */}
                      <td className="px-4 py-4 text-center">
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Update Attendance"
                          onClick={() => {
                            window.location.href = `/admin/update-attendance/${record.employee_id}`;
                          }}
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" 
                              style={{ width: `${record.percentage_present || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 min-w-[3rem] text-right">
                            {record.percentage_present}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-slate-900">
                        {record.cumulative_worked_hours}h
                      </td>
                      {attendanceData?.month_dates?.map((date) => {
                        const daily = record.daily_attendance.find(day => day.date === date) || { 
                          date: date,
                          status: '-', 
                          check_in: null, 
                          check_out: null, 
                          worked_hours: 0,
                          cumulative_worked_hours: 0,
                          scheduled_hours: 0,
                          break_time: 0,
                          overtime_hours: 0,
                          is_late: false,
                          late_by_minutes: 0,
                          early_departure: false,
                          early_departure_minutes: 0,
                          leave_type: null,
                          leave_type_initials: null,
                          half_day: false,
                          remarks: '',
                          shift_type: null
                        };
                        const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                        return (
                          <td key={date} className={`px-2 py-4 text-center ${isWeekend ? 'bg-slate-25' : ''}`}>
                            {getStatusCell(daily, date)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4 + (attendanceData?.month_dates?.length || 0)} className="px-4 py-16">
                      <div className="text-center space-y-4">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">No records found</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            No employees match your current filter criteria.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSearchEmployee('');
                            setSelectedStatus('all');
                          }}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Professional Legend */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Status Legend</h3>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-emerald-600 rounded text-white text-xs font-semibold flex items-center justify-center">P</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Present</span>
                  <p className="text-xs text-slate-600">On time attendance</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-red-600 rounded text-white text-xs font-semibold flex items-center justify-center">A</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Absent</span>
                  <p className="text-xs text-slate-600">Not present</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-blue-600 rounded text-white text-xs font-semibold flex items-center justify-center">L</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Leave</span>
                  <p className="text-xs text-slate-600">Approved leave</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-amber-600 rounded text-white text-xs font-semibold flex items-center justify-center">H</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Holiday</span>
                  <p className="text-xs text-slate-600">Public holiday</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-orange-600 rounded text-white text-xs font-semibold flex items-center justify-center">HD</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Half Day</span>
                  <p className="text-xs text-slate-600">Partial attendance</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-gray-400 rounded text-white text-xs font-semibold flex items-center justify-center">-</div>
                <div>
                  <span className="text-sm font-medium text-slate-900">No Data</span>
                  <p className="text-xs text-slate-600">Record unavailable</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative w-7 h-7 bg-emerald-600 rounded text-white text-xs font-semibold flex items-center justify-center">
                  P
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-900">Late</span>
                  <p className="text-xs text-slate-600">Present but late</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Usage Instructions</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Hover over any attendance status indicator to view detailed information including check-in/out times, 
                    working hours, and leave details. Use the search and filter options above to quickly find specific employees or attendance patterns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Professional Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-slate-900 text-white text-sm rounded-lg shadow-xl px-4 py-3 max-w-xs pointer-events-none border border-slate-700"
          style={{ 
            left: tooltip.x + 10, 
            top: tooltip.y + 10,
            whiteSpace: 'pre-line'
          }}
        >
          {tooltip.text}
          <div className="absolute w-2 h-2 bg-slate-900 transform rotate-45 -left-1 top-3 border-l border-t border-slate-700"></div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLog;