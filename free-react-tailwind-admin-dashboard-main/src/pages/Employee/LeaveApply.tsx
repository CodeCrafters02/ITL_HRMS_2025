import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from './api';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableRow, TableCell } from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';

interface LeaveType {
  id: number;
  leave_name: string;
  count: number;
  is_paid: boolean;
  used_count: number;
  remaining_count: number;
}

interface AppliedLeave {
  id: number;
  leave_type: number;
  leave_type_name?: string; // optional for display
  reason: string;
  from_date: string;
  to_date: string;
  status: string;
  created_at: string;
}

const LeaveApply: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [appliedLeaves, setAppliedLeaves] = useState<AppliedLeave[]>([]);
  const navigate = useNavigate();

  const fetchLeaveTypes = async () => {
    try {
      const res = await axiosInstance.get('/leaves-list/'); // URL for LeaveListAPIView
      console.log('Leave types response:', res.data); // Debug backend response
      setLeaveTypes(res.data);
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  const fetchAppliedLeaves = async () => {
    try {
      const res = await axiosInstance.get('/employee-leave-create/'); // URL for EmpLeaveListCreateAPIView
      setAppliedLeaves(res.data);
    } catch (err) {
      console.error('Error fetching applied leaves:', err);
    }
  };

  // Removed unused handleChange and handleSubmit

  useEffect(() => {
    fetchLeaveTypes();
    fetchAppliedLeaves();
  }, []);

  // Cancel leave handler
  const handleCancelLeave = async (leaveId: number) => {
    const confirmed = window.confirm(
      'Are you sure to cancel? This will delete from Leave Request in reporting manager also.'
    );
    if (!confirmed) return;
    try {
      const res = await axiosInstance.post(`/emp-leaves/${leaveId}/cancel/`);
      const msg = res?.data?.detail || '';
      if (msg.includes('removed')) {
        // Pending leave: remove from list
        setAppliedLeaves((prev) => prev.filter(l => l.id !== leaveId));
      } else if (msg.includes('cancelled')) {
        // Approved leave: update status
        setAppliedLeaves((prev) => prev.map(l => l.id === leaveId ? { ...l, status: 'Cancelled' } : l));
      }
    } catch {
      alert('Failed to cancel leave.');
    }
  };

  return (
    <>
      {/* Leave Types Section */}
      <div className="mb-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
          {leaveTypes.map((type) => (
            <div
              key={type.id}
              className="bg-blue-400 shadow-lg rounded-xl px-7 py-5 w-full max-w-xs flex flex-col items-start border border-blue-300"
              style={{ fontFamily: 'Segoe UI, Arial, sans-serif' }}
            >
              <div className="font-semibold text-white text-lg mb-2 tracking-wide">{type.leave_name}</div>
              <div className="text-white text-base mb-1">Total: <span className="font-bold">{type.count}</span></div>
              <div className="text-white text-base mb-1">Used: <span className="font-bold">{type.used_count}</span></div>
              <div className="text-white text-base mb-3">Remaining: <span className="font-bold">{type.remaining_count}</span></div>
              <Badge variant="light" color={type.is_paid ? "success" : "error"}>
                {type.is_paid ? "Paid" : "Unpaid"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
      <ComponentCard title="Leave Application">
        <div className="flex justify-end mb-4">
          <Button variant="primary" onClick={() => navigate('/employee/form-leave')}>
            Apply
          </Button>
        </div>
        <h3 className="text-lg font-semibold mb-2">My Applied Leaves</h3>
        <div className="overflow-x-auto">
          <Table className="min-w-full text-left align-middle">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">S.no</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Leave Type</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">From</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">To</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Reason</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-700">Applied On</th>
               
              </tr>
            </thead>
            <tbody>
              {appliedLeaves.map((leave, idx) => (
                <TableRow
                  key={idx}
                  className={
                    idx % 2 === 0
                      ? "bg-white hover:bg-blue-50 transition"
                      : "bg-gray-50 hover:bg-blue-100 transition"
                  }
                >
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{idx + 1}</TableCell>
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{leave.leave_type_name || leave.leave_type}</TableCell>
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{leave.from_date}</TableCell>
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{leave.to_date}</TableCell>
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{leave.reason}</TableCell>
                  <TableCell className="px-6 py-3 align-middle">
                    <Badge variant="light" color={
                      leave.status === "Approved" ? "success"
                        : leave.status === "Rejected" ? "error"
                        : leave.status === "Pending" ? "info"
                        : leave.status === "Cancelled" ? "warning"
                        : "light"
                    }>
                      {leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-3 align-middle text-sm text-gray-800">{new Date(leave.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="px-6 py-3 align-middle">
                    {(leave.status === "Pending" || leave.status === "Approved") && (
                      <Button variant="outline" size="sm" onClick={() => handleCancelLeave(leave.id)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </ComponentCard>
    </>
  );
};

export default LeaveApply;
