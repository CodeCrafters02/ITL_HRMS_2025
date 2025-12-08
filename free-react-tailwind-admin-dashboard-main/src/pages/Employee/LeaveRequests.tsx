import React, { useEffect, useState } from "react";
import { axiosInstance } from "./api";
import { FaCheckCircle, FaTimesCircle, FaClock, FaCalendar, FaUser, FaFileAlt, FaSearch, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaTimes, FaExclamationCircle } from "react-icons/fa";
import { motion } from "framer-motion";

interface LeaveRequest {
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
}

type ViewType = 'card' | 'table';
type FilterType = 'all' | 'Pending' | 'Approved' | 'Rejected';

const LeaveRequests: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    let filtered = [...leaves];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(leave =>
        leave.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.leave_type_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter(leave => leave.status === filter);
    }

    setFilteredLeaves(filtered);
    setCurrentPage(1);
  }, [leaves, searchTerm, filter]);

  const fetchLeaves = () => {
    axiosInstance
      .get("emp-leaves/")
      .then((res) => {
        setLeaves(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching leave requests:", err);
        setLoading(false);
      });
  };

  const handleAction = (id: number, action: "approve" | "reject") => {
    if (action === "reject") {
      setSelectedLeaveId(id);
      setRejectionModalOpen(true);
      return;
    }

    const confirmMsg = "Are you sure you want to approve this leave request?";
    if (!window.confirm(confirmMsg)) return;

    // Use separate approve endpoint
    axiosInstance
      .post(`emp-leaves/${id}/approve/`, {})
      .then(() => {
        fetchLeaves();
      })
      .catch(() => {
        alert(`Failed to ${action} leave request. Please try again.`);
      });
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    if (selectedLeaveId === null) return;

    // Use separate reject endpoint with reason
    axiosInstance
      .post(`emp-leaves/${selectedLeaveId}/reject/`, {
        rejection_reason: rejectionReason,
      })
      .then(() => {
        setRejectionModalOpen(false);
        setSelectedLeaveId(null);
        setRejectionReason("");
        fetchLeaves();
      })
      .catch(() => {
        alert("Failed to reject leave request. Please try again.");
      });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Approved": return { icon: FaCheckCircle, color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Approved" };
      case "Rejected": return { icon: FaTimesCircle, color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Rejected" };
      case "Pending": return { icon: FaClock, color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", label: "Pending" };
      default: return { icon: FaClock, color: "text-gray-700 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-900/30", label: status };
    }
  };

  const calculateLeaveDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Pagination
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  // Stats
  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-600">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl">
            <FaCalendar className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve employee leave applications</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{leaves.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FaFileAlt className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{approvedCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{rejectedCount}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name, ID, or leave type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Results and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredLeaves.length} of {leaves.length} requests</span>
          <div className="flex items-center gap-3">
            {(searchTerm || filter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilter('all'); }}
                className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                <FaTimes /> Clear Filters
              </button>
            )}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('card')}
                className={`p-2 rounded-md transition-all ${viewType === 'card' ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaTh className="text-lg" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-all ${viewType === 'table' ? 'bg-white dark:bg-gray-600 text-purple-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredLeaves.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Items:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white cursor-pointer text-sm"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft className="text-sm" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${currentPage === page ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredLeaves.length)}</span> of <span className="font-medium">{filteredLeaves.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaCalendar className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Leave Requests Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filter !== 'all' ? 'Try adjusting your search or filter criteria' : 'No leave requests to review'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedLeaves.map((leave, index) => {
            const statusConfig = getStatusConfig(leave.status);
            const StatusIcon = statusConfig.icon;
            const leaveDays = calculateLeaveDays(leave.from_date, leave.to_date);
            return (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-28 bg-gradient-to-br from-purple-500 to-pink-600 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-white" />
                      <span className="text-white font-semibold">{leave.employee_name}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}>
                      <StatusIcon />
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="text-white text-sm">
                    <p>ID: {leave.employee_id}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Leave Type</h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{leave.leave_type_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">From</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{new Date(leave.from_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">To</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{new Date(leave.to_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{leaveDays} {leaveDays === 1 ? 'Day' : 'Days'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Reason</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{leave.reason}</p>
                  </div>

                  {leave.status === 'Pending' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleAction(leave.id, 'approve')}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        <FaCheckCircle />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(leave.id, 'reject')}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        <FaTimesCircle />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Leave Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedLeaves.map((leave) => {
                  const statusConfig = getStatusConfig(leave.status);
                  const StatusIcon = statusConfig.icon;
                  const leaveDays = calculateLeaveDays(leave.from_date, leave.to_date);
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{leave.employee_name}</div>
                          <div className="text-sm text-gray-500">ID: {leave.employee_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{leave.leave_type_name}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-600 dark:text-gray-400">{new Date(leave.from_date).toLocaleDateString()}</div>
                          <div className="text-gray-600 dark:text-gray-400">{new Date(leave.to_date).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{leaveDays} {leaveDays === 1 ? 'Day' : 'Days'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {leave.status === 'Pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAction(leave.id, 'approve')}
                              className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-all"
                              title="Approve"
                            >
                              <FaCheckCircle />
                            </button>
                            <button
                              onClick={() => handleAction(leave.id, 'reject')}
                              className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                              title="Reject"
                            >
                              <FaTimesCircle />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-gray-500">No actions</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setRejectionModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-br from-red-600 via-red-500 to-pink-600 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaExclamationCircle className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Reject Leave Request</h3>
                    <p className="text-red-100 text-sm mt-1">Provide a reason for rejection</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejecting this leave request..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;