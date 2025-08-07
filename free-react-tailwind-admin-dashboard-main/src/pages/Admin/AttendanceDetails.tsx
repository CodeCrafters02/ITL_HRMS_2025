import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../Dashboard/api';
import dayjs from 'dayjs';

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

  const fetchAttendance = async () => {
    try {
      const res = await axiosInstance.get('/attendance/', {
        params: {
          from_date: startDate,
          to_date: endDate,
          status: selectedStatus,
          search: searchTerm
        }
      });

      const mapped = res.data.map((item: any) => {
        const isLate = item.is_late || item.check_in_late || false; // <-- Backend must send this
        const status = item.status || (item.is_present ? (isLate ? 'Late' : 'Present') : 'Absent');
        return {
          id: item.id,
          employee_id: item.employee_id || '',
          name: item.employee_name || '',
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

      // Filter by date range in frontend as a workaround
      const filtered = mapped.filter(item => item.date >= startDate && item.date <= endDate);
      setAttendanceData(filtered);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  useEffect(() => {
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Attendance</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by Name or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
        </select>
        <button
          onClick={handleReset}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => handleDateChange(-1)}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Previous Day
        </button>
        <div className="text-md font-medium">{startDate}</div>
        <button
          onClick={() => handleDateChange(1)}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Next Day
        </button>
      </div>

      {/* Attendance Table */}
      <div className="overflow-auto">
        <table className="min-w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">Employee ID</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Check-In</th>
              <th className="border px-4 py-2">Check-Out</th>
              <th className="border px-4 py-2">Break Time</th>
              <th className="border px-4 py-2">Total Hours</th>
              <th className="border px-4 py-2">Overtime</th>
              <th className="border px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-4">No records found</td>
              </tr>
            ) : (
              attendanceData.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-4 py-2">{item.employee_id}</td>
                  <td className="border px-4 py-2">{item.name}</td>
                  <td className={`border px-4 py-2 ${item.is_late ? 'text-red-600 font-bold' : ''}`}>
                    {item.check_in ? dayjs(item.check_in).format('HH:mm') : '--'}
                  </td>
                  <td className="border px-4 py-2">{item.check_out ? dayjs(item.check_out).format('HH:mm') : '--'}</td>
                  <td className="border px-4 py-2">{item.break_time}</td>
                  <td className="border px-4 py-2">{item.total_hours}</td>
                  <td className="border px-4 py-2">{item.overtime}</td>
                  <td className="border px-4 py-2">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attendance;
