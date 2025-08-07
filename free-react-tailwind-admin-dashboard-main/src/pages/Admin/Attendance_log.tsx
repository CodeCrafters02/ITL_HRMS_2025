import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { 
  Calendar, 
  Download, 
  Printer, 
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
  Info
} from 'lucide-react';
import { axiosInstance } from '../Dashboard/api';


interface DailyRecord {
  status: string;
  punch_in: string | null;
  punch_out: string | null;
  worked_hours: number;
  is_late: boolean;
  leave_type: string;
  is_holiday: boolean;
  holiday_name: string;
}

interface AttendanceRecord {
  employee_id: number;
  employee_name: string;
  daily_records: { [date: string]: DailyRecord };
  total_hours: number;
  attendance_percentage: number;
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
        const backendData = res.data;
        const month_dates: string[] = calendarDates;
        const attendance_records: AttendanceRecord[] = backendData.map(emp => {
          const daily_records: { [date: string]: DailyRecord } = {};
          // Fill all dates for the month
          month_dates.forEach(date => {
            const d = emp.daily_attendance.find((rec: any) => rec.date === date);
            if (d) {
              daily_records[date] = {
                status: d.status === 'Present' ? 'P' : d.status === 'Absent' ? 'A' : d.status === 'Leave' ? 'L' : d.status === 'Half Day' ? 'H' : d.status === 'Holiday' ? 'H' : '-',
                punch_in: d.check_in,
                punch_out: d.check_out,
                worked_hours: d.status === 'Present' || d.status === 'Half Day' ? (d.check_in && d.check_out ? 0 : 0) : 0, // You can calculate hours if needed
                is_late: d.is_late,
                leave_type: d.leave_type || '',
                is_holiday: d.status === 'Holiday',
                holiday_name: d.remarks || ''
              };
            } else {
              daily_records[date] = {
                status: '-',
                punch_in: null,
                punch_out: null,
                worked_hours: 0,
                is_late: false,
                leave_type: '',
                is_holiday: false,
                holiday_name: ''
              };
            }
          });
          return {
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            daily_records,
            total_hours: emp.total_working_days * (emp.shift_policy?.full_day_hours || 8),
            attendance_percentage: parseFloat(emp.percentage_present),
          };
        });
        // Calculate statistics
        const totalEmployees = attendance_records.length;
        const averageAttendance = attendance_records.reduce((sum, emp) => sum + emp.attendance_percentage, 0) / (totalEmployees || 1);
        const totalHours = attendance_records.reduce((sum, emp) => sum + emp.total_hours, 0);
        const today = new Date().toISOString().split('T')[0];
        const presentToday = attendance_records.filter(emp => emp.daily_records[today]?.status === 'P').length;
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
      .catch(() => setLoading(false));
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
        `EMP${String(record.employee_id).padStart(5, '0')}`.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = record.daily_records[today];
        return todayRecord?.status === selectedStatus;
      });
    }

    setFilteredRecords(filtered);
  }, [searchEmployee, selectedStatus, attendanceData]);

  const getStatusCell = (record: DailyRecord, date: string) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium relative cursor-pointer transition-all duration-200 hover:scale-110";
    
    const showTooltip = (e: React.MouseEvent) => {
      let text = '';
      if (record.status === 'P' || record.status === 'A') {
        text = `Date: ${new Date(date).toLocaleDateString()}\nCheck-in: ${record.punch_in || '—'}\nCheck-out: ${record.punch_out || '—'}`;
        if (record.worked_hours > 0) {
          text += `\nHours: ${record.worked_hours}h`;
        }
      } else if (record.status === 'L') {
        text = `Leave: ${record.leave_type || 'General Leave'}\nDate: ${new Date(date).toLocaleDateString()}`;
      } else if (record.status === 'H') {
        text = `Holiday: ${record.holiday_name || 'Public Holiday'}\nDate: ${new Date(date).toLocaleDateString()}`;
      }
      
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text,
      });
    };
    
    const hideTooltip = () => setTooltip(null);

    if (record.status === 'P') {
      return (
        <div
          className={baseClasses + ' bg-green-500 hover:bg-green-600'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          P
          {record.is_late && (
            <span className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center border border-white">
                <Clock className="w-2 h-2" />
              </div>
            </span>
          )}
        </div>
      );
    }
    if (record.status === 'A') {
      return (
        <div
          className={baseClasses + ' bg-red-500 hover:bg-red-600'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          A
        </div>
      );
    }
    if (record.status === 'H') {
      return (
        <div
          className={baseClasses + ' bg-orange-500 hover:bg-orange-600'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          H
        </div>
      );
    }
    if (record.status === 'L') {
      const leaveInitial = record.leave_type ? record.leave_type[0].toUpperCase() : 'L';
      return (
        <div
          className={baseClasses + ' bg-blue-500 hover:bg-blue-600'}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          {leaveInitial}
        </div>
      );
    }
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
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
                  <p className="text-gray-600 text-sm">Track and manage employee attendance</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.presentToday}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold text-blue-600">{stats.averageAttendance.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalHours}h</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Employee</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Name or ID..."
                      value={searchEmployee}
                      onChange={(e) => setSearchEmployee(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchEmployee && (
                      <button
                        onClick={() => setSearchEmployee('')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="P">Present</option>
                    <option value="A">Absent</option>
                    <option value="L">Leave</option>
                    <option value="H">Holiday</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchEmployee('');
                      setSelectedStatus('all');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center justify-between p-6 border-b">
            <button
              onClick={handlePrevMonth}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <h3 className="text-xl font-semibold text-gray-800">
              {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            <button
              onClick={handleNextMonth}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-sm font-medium text-gray-700 border-r">#</th>
                  <th className="sticky left-12 bg-gray-50 px-6 py-4 text-left text-sm font-medium text-gray-700 border-r">Employee</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-700">Attendance</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-700">Hours</th>
                  {attendanceData?.month_dates?.map((date) => {
                    const { day, weekday } = { day: getDayOfMonth(date), weekday: getDayOfWeek(date) };
                    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                    return (
                      <th key={date} className={`px-3 py-4 text-center text-sm font-medium min-w-[50px] ${isWeekend ? 'bg-gray-100 text-gray-500' : 'text-gray-700'}`}>
                        <div className="flex flex-col items-center">
                          <span className="text-base font-semibold">{day}</span>
                          <span className="text-xs">{weekday}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords && filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => (
                    <tr key={record.employee_id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white px-6 py-4 text-sm text-gray-900 border-r">{index + 1}</td>
                      <td className="sticky left-12 bg-white px-6 py-4 border-r">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.employee_name}</div>
                          <div className="text-xs text-gray-500">EMP{String(record.employee_id).padStart(5, '0')}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500" 
                              style={{ width: `${record.attendance_percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">{record.attendance_percentage?.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">{record.total_hours?.toFixed(0)}h</td>
                      {attendanceData?.month_dates?.map((date) => {
                        const daily = record.daily_records?.[date] || { status: '-', punch_in: null, punch_out: null, worked_hours: 0, is_late: false, leave_type: '', is_holiday: false, holiday_name: '' };
                        const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                        return (
                          <td key={date} className={`px-3 py-4 text-center ${isWeekend ? 'bg-gray-50' : ''}`}>
                            {getStatusCell(daily, date)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4 + (attendanceData?.month_dates?.length || 0)} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No employees found matching your criteria</p>
                        <button
                          onClick={() => {
                            setSearchEmployee('');
                            setSelectedStatus('all');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Legend</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-medium">P</div>
              <span className="text-sm text-gray-700">Present</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">A</div>
              <span className="text-sm text-gray-700">Absent</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-medium">L</div>
              <span className="text-sm text-gray-700">Leave</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center font-medium">H</div>
              <span className="text-sm text-gray-700">Holiday</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-400 rounded-full text-white text-xs flex items-center justify-center font-medium">-</div>
              <span className="text-sm text-gray-700">No Data</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                P
                <Clock className="w-2 h-2 absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5" />
              </div>
              <span className="text-sm text-gray-700">Late</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Hover over attendance status icons to view detailed information including check-in/out times, hours worked, and leave details.
            </p>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs pointer-events-none"
          style={{ 
            left: tooltip.x + 10, 
            top: tooltip.y + 10,
            whiteSpace: 'pre-line'
          }}
        >
          {tooltip.text}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-2"></div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLog;