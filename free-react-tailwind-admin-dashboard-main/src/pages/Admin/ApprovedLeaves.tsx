import React, { useState, useEffect } from 'react';
import { axiosInstance } from "../Dashboard/api";

interface LeaveLog {
  id: number;
  employee_name: string;
  manager_name: string;
  leave_type: string;
  status: string;
  reason: string;
  from_date: string;
  to_date: string;
}

const ApprovedLeave: React.FC = () => {
  const [leaveLogs, setLeaveLogs] = useState<LeaveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaveLogs = async () => {
      try {
        const res = await axiosInstance.get('/approved-leaves/');
        setLeaveLogs(res.data);
      } catch (err) {
        console.error(err);
        let message = 'Failed to fetch leave data';
        if (typeof err === 'object' && err !== null) {
          const errorObj = err as Record<string, unknown>;
          if (
            errorObj.response &&
            typeof errorObj.response === 'object' &&
            (errorObj.response as Record<string, unknown>).data &&
            typeof ((errorObj.response as Record<string, unknown>).data as Record<string, unknown>).detail === 'string'
          ) {
            message += ': ' + ((errorObj.response as Record<string, unknown>).data as Record<string, unknown>).detail;
          } else if (typeof errorObj.message === 'string') {
            message += ': ' + errorObj.message;
          }
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveLogs();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Approved Leave Logs</h2>
        
        {/* Leave Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaveLogs.length > 0 ? (
                leaveLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{log.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.manager_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.leave_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.from_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.to_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.reason}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No approved leave records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApprovedLeave;