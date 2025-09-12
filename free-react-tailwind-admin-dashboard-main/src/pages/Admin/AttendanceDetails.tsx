// Helper to format total hours as HH:MM:SS
function formatToHHMMSS(time: string): string {
  if (!time) return '00:00:00';
  // If already in HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  // If in HH:MM
  if (/^\d{2}:\d{2}$/.test(time)) return time + ':00';
  // If in HH:MM:SS.ssssss or similar, trim to HH:MM:SS
  if (/^\d{1,2}:\d{2}:\d{2}(\.\d+)?$/.test(time)) return time.split('.')[0].padStart(8, '0');
  // If decimal (e.g. 7.5 or '7.5')
  const num = Number(time);
  if (!isNaN(num) && isFinite(num)) {
    const hours = Math.floor(num);
    const minutes = Math.floor((num - hours) * 60);
    const seconds = Math.round((((num - hours) * 60) - minutes) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  // If time is something like '0.05:50:54.013777', try to extract HH:MM:SS
  const match = time.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}:${match[3]}`;
  }
  return '00:00:00';
}
import React, { useEffect, useState } from 'react';
import { Search, Calendar, Filter, Users, FileText, FileSpreadsheet } from 'lucide-react';
import { axiosInstance } from '../Dashboard/api';
import dayjs from 'dayjs';

type RawAttendance = {
  id?: number;
  employee_id?: string;
  employee_name?: string;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  total_break_time?: string;
  total_work_duration?: string;
  overtime_duration?: string;
  is_late?: boolean;
  check_in_late?: boolean;
  is_present?: boolean;
  status?: string;
};

interface Attendance {
  id?: number;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  break_time: string;
  total_hours: string;
  overtime: string;
  is_late: boolean;
  status: string;
}

const Attendance: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/attendance/', {
          params: {
            from_date: startDate,
            to_date: endDate,
            status: selectedStatus,
            search: searchTerm
          }
        });
        const mapped = res.data.map((item: RawAttendance) => {
          const isLate = item.is_late || item.check_in_late || false;
          const status = item.status || (item.is_present ? (isLate ? 'Late' : 'Present') : 'Absent');
          return {
            id: item.id,
            employee_id: item.employee_id || '',
            employee_name: item.employee_name || '',
            check_in: item.check_in || '',
            check_out: item.check_out || '',
            break_time: item.total_break_time || '',
            total_hours: item.total_work_duration || '',
            overtime: item.overtime_duration || '',
            is_late: isLate,
            status,
            date: item.date || '',
          };
        });
        const filtered = mapped.filter((item: Attendance) => item.date >= startDate && item.date <= endDate);
        setAttendanceData(filtered);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [startDate, endDate, selectedStatus, searchTerm]);

  const handleDateChange = (days: number) => {
    const newStart = dayjs(startDate).add(days, 'day').format('YYYY-MM-DD');
    const newEnd = dayjs(endDate).add(days, 'day').format('YYYY-MM-DD');
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedStatus('');
    const today = dayjs().format('YYYY-MM-DD');
    setStartDate(today);
    setEndDate(today);
  };

  const getStatusBadge = (status: string, isLate: boolean) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status.toLowerCase()) {
      case 'present':
        return `${baseClasses} ${isLate ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`;
      case 'late':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'absent':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const downloadPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .date-range { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-present { color: #059669; font-weight: bold; }
            .status-late { color: #d97706; font-weight: bold; }
            .status-absent { color: #dc2626; font-weight: bold; }
            .late-time { color: #dc2626; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <div class="date-range">Report Period: ${startDate} to ${endDate}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Break Time</th>
                <th>Total Hours</th>
                <th>Overtime</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData.map(item => `
                <tr>
                  <td>${item.employee_id}</td>
                  <td>${item.employee_name}</td>
                  <td>${item.date}</td>
                  <td class="${item.is_late ? 'late-time' : ''}">${item.check_in ? dayjs(item.check_in).format('HH:mm') : '--'}</td>
                  <td>${item.check_out ? dayjs(item.check_out).format('HH:mm') : '--'}</td>
                  <td>${item.break_time}</td>
                  <td>${item.total_hours}</td>
                  <td>${item.overtime}</td>
                  <td class="status-${item.status.toLowerCase()}">${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
  };

  const downloadExcel = () => {
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Check-In', 'Check-Out', 'Break Time', 'Total Hours', 'Overtime', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(item => [
        item.employee_id,
        `"${item.employee_name}"`,
        item.date,
        item.check_in ? dayjs(item.check_in).format('HH:mm') : '--',
        item.check_out ? dayjs(item.check_out).format('HH:mm') : '--',
        item.break_time,
        item.total_hours,
        item.overtime,
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
                <p className="text-gray-600">Track and manage employee attendance records</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={downloadPDF}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <FileText className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={downloadExcel}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

       
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleDateChange(-1)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <span>← Previous Day</span>
            </button>
            <div className="text-lg font-semibold text-gray-900">
              {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
            </div>
            <button
              onClick={() => handleDateChange(1)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <span>Next Day →</span>
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading attendance data...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No attendance records found</p>
                        <p className="text-sm">Try adjusting your search criteria or date range</p>
                      </td>
                    </tr>
                  ) : (
                    attendanceData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.employee_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.employee_name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.is_late ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                          {item.check_in ? dayjs(item.check_in).format('HH:mm') : '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.check_out ? dayjs(item.check_out).format('HH:mm') : '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.break_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatToHHMMSS(item.total_hours)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.overtime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(item.status, item.is_late)}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;