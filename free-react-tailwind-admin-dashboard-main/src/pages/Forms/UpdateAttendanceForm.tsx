import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';
import DatePicker from '../../components/form/date-picker';
import dayjs, { Dayjs } from 'dayjs';
import CustomTimePicker from '../../components/form/time-picker';

const statusOptions = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Leave', label: 'Leave' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'Holiday', label: 'Holiday' },
];

const UpdateAttendanceForm: React.FC = () => {
  const { employee_id } = useParams<{ employee_id: string }>();
  const navigate = useNavigate();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [checkIn, setCheckIn] = useState<Dayjs | null>(null);
  const [checkOut, setCheckOut] = useState<Dayjs | null>(null);
  const [statusVal, setStatusVal] = useState<string>('Present');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState(false);
  // Removed unused prefill state
  const [message, setMessage] = useState<string>('');



  useEffect(() => {
    // Fetch prefill if check-in exists for this employee/date
    if (employee_id && date) {
      setLoading(true);
      axiosInstance.post('/attendance-log/', {
        employee_id,
        date,
      })
        .then(response => {
          if (response.data.prefill && response.data.prefill.check_in) {
            setCheckIn(dayjs(response.data.prefill.check_in, 'HH:mm'));
          }
          if (response.data.check_in) setCheckIn(dayjs(response.data.check_in, 'HH:mm'));
          if (response.data.check_out) setCheckOut(dayjs(response.data.check_out, 'HH:mm'));
          if (response.data.remarks) setRemarks(response.data.remarks);
          setStatusVal(response.data.status || 'Present');
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [employee_id, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    axiosInstance.post('/attendance-logs/', {
      employee_id,
      date,
  check_in: checkIn ? checkIn.format('HH:mm') : '',
  check_out: checkOut ? checkOut.format('HH:mm') : '',
      status: statusVal,
      remarks,
    })
      .then(() => {
        setMessage('Attendance updated successfully!');
        setTimeout(() => navigate(-1), 1200);
      })
      .catch(() => setMessage('Failed to update attendance.'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Update Attendance</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <DatePicker
            id="attendance-date"
            label="Date"
            defaultDate={date}
            onChange={([selected]) => setDate(selected ? selected.toISOString().slice(0, 10) : '')}
            placeholder="Select date"
          />
        </div>
        <div>
          <CustomTimePicker
            label="Check-in Time"
            value={checkIn}
            onChange={setCheckIn}
            id="checkin-time"
          />
        </div>
        <div>
          <CustomTimePicker
            label="Check-out Time"
            value={checkOut}
            onChange={setCheckOut}
            id="checkout-time"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={statusVal} onChange={e => setStatusVal(e.target.value)} className="w-full border rounded px-3 py-2">
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition" disabled={loading}>
          {loading ? 'Saving...' : 'Update Attendance'}
        </button>
        {message && <div className="text-center text-green-600 mt-2">{message}</div>}
      </form>
    </div>
  );
};

export default UpdateAttendanceForm;
