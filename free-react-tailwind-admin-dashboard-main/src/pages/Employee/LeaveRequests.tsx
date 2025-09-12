import React, { useEffect, useState } from "react";
import { axiosInstance } from "./api";
import ComponentCard from "../../components/common/ComponentCard";

type LeaveRequest = {
  id: number;
  employee_name: string;
  employee_id: string;
  leave_type: number;
  leave_type_name: string;
  status: string;
  reason: string;
  from_date: string;
  to_date: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
};

const LeaveRequests: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    setLoading(true);
    const res = await axiosInstance.get("emp-leaves/");
    setLeaves(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    try {
      await axiosInstance.post(`emp-leaves/${id}/${action}/`);
      setLeaves((prev) =>
        prev.map((leave) =>
          leave.id === id
            ? { ...leave, status: action === "approve" ? "Approved" : "Rejected" }
            : leave
        )
      );
    } catch (err : unknown) {
      console.error("Action failed:", err);
      // Optionally show error
    }
  };

  return (
    <div className="p-6">
      <ComponentCard title="Employee Leave Requests">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied At</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{leave.employee_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{leave.employee_id}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{leave.leave_type_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{leave.from_date} to {leave.to_date}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{leave.reason}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[leave.status] || "bg-gray-100 text-gray-700"}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">{new Date(leave.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors duration-150 
                            ${leave.status === "Approved" ? "bg-green-500 border-green-500 text-white opacity-60 cursor-not-allowed" : "bg-white border-green-500 text-green-600 hover:bg-green-500 hover:text-white"}`}
                          onClick={() => handleAction(leave.id, "approve")}
                          disabled={leave.status !== "Pending"}
                        >
                          Approve
                        </button>
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors duration-150 
                            ${leave.status === "Rejected" ? "bg-red-500 border-red-500 text-white opacity-60 cursor-not-allowed" : "bg-white border-red-500 text-red-600 hover:bg-red-500 hover:text-white"}`}
                          onClick={() => handleAction(leave.id, "reject")}
                          disabled={leave.status !== "Pending"}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default LeaveRequests;