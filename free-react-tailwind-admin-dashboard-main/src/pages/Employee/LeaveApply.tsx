import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from './api';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableRow, TableCell } from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import { FaSyncAlt, FaUmbrellaBeach, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaPlus } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

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
  rejection_reason?: string;
  from_date: string;
  to_date: string;
  status: string;
  created_at: string;
}

const LeaveApply: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [appliedLeaves, setAppliedLeaves] = useState<AppliedLeave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
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
      console.log('🔄 Fetching applied leaves from: /employee-leave-create/');
      const res = await axiosInstance.get('/employee-leave-create/'); // URL for EmpLeaveListCreateAPIView
      console.log('✅ Applied leaves API response:', res);
      console.log('📊 Response data:', res.data);
      console.log('📈 Data type:', typeof res.data, 'Is Array:', Array.isArray(res.data));
      console.log('📝 Applied leaves count:', res.data?.length || 0);
      
      if (Array.isArray(res.data)) {
        console.log('✅ Setting applied leaves:', res.data);
        // Debug: Check rejection reasons
        const rejectedLeaves = res.data.filter((l: AppliedLeave) => l.status === 'Rejected');
        console.log('🔍 Rejected leaves with reasons:', rejectedLeaves.map((l: AppliedLeave) => ({
          id: l.id,
          status: l.status,
          rejection_reason: l.rejection_reason,
          reason: l.reason
        })));
        setAppliedLeaves(res.data);
      } else {
        console.error('❌ Unexpected response format:', res.data);
        console.error('Expected array but got:', typeof res.data);
        setAppliedLeaves([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching applied leaves:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Error data:', err.response?.data);
      setAppliedLeaves([]);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setLoading(true);
    await fetchAppliedLeaves();
    setLastRefresh(new Date());
    setLoading(false);
  };

  // Removed unused handleChange and handleSubmit

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      await Promise.all([fetchLeaveTypes(), fetchAppliedLeaves()]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  // Auto-refresh applied leaves every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAppliedLeaves();
      setLastRefresh(new Date());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
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
      // Refresh both applied leaves AND leave types to update balances immediately
      await Promise.all([fetchAppliedLeaves(), fetchLeaveTypes()]);
      setLastRefresh(new Date());
    } catch {
      alert('Failed to cancel leave.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaUmbrellaBeach className="text-blue-600" />
              Leave Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your leave balance and applications</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/employee/form-leave')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <FaPlus />
            <span className="hidden sm:inline">Apply for Leave</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Leave Types Cards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FaCalendarAlt className="text-purple-600" />
          Leave Balance Overview
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence>
            {leaveTypes.map((type, idx) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 group"
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-6">
                  {/* Leave Type Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{type.leave_name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        type.is_paid 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {type.is_paid ? <FaCheckCircle /> : <FaTimesCircle />}
                        {type.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                      <FaUmbrellaBeach className="text-white text-xl" />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Days</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{type.count}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Used</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{type.used_count}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Remaining</span>
                      <span className="font-bold text-lg text-green-600 dark:text-green-400">{type.remaining_count}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Usage</span>
                      <span>{type.count > 0 ? Math.round((type.used_count / type.count) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${type.count > 0 ? (type.used_count / type.count) * 100 : 0}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`h-full rounded-full ${
                          type.used_count / type.count > 0.8 ? 'bg-red-500' :
                          type.used_count / type.count > 0.5 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      {/* Applied Leaves Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ComponentCard title="">
          {/* Header with Stats */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaClock className="text-purple-600" />
                  My Leave Applications
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track and manage your leave requests
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </motion.button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{appliedLeaves.length}</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl border border-yellow-200 dark:border-yellow-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {appliedLeaves.filter(l => l.status === 'Pending').length}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {appliedLeaves.filter(l => l.status === 'Approved').length}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl border border-red-200 dark:border-red-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rejected</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {appliedLeaves.filter(l => l.status === 'Rejected').length}
                </div>
              </div>
            </div>
          </div>
        {initialLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <FaSyncAlt className="animate-spin text-blue-500 text-3xl" />
              <p className="text-gray-600 dark:text-gray-400">Loading leave applications...</p>
            </div>
          </div>
        ) : appliedLeaves.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
          >
            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <FaUmbrellaBeach className="text-6xl text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-xl font-semibold mb-2">No Leave Applications Yet</p>
            <p className="text-sm mb-4">Start by applying for your first leave</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/employee/form-leave')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg"
            >
              <FaPlus />
              Apply for Leave
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table className="min-w-full text-left align-middle">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Applied On</th>
                    <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {appliedLeaves.map((leave, idx) => (
                  <motion.tr
                    key={leave.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">{idx + 1}</TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                        {leave.leave_type_name || leave.leave_type}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-semibold">{leave.from_date}</span>
                        <span className="text-xs text-gray-500">to {leave.to_date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={leave.reason}>
                        {leave.reason}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 w-fit ${
                          leave.status === "Approved" 
                            ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : leave.status === "Rejected"
                            ? "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : leave.status === "Pending"
                            ? "border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "border-gray-500 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300"
                        }`}>
                          {leave.status}
                        </span>
                        {leave.status === "Rejected" && leave.rejection_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 italic mt-1" title={leave.rejection_reason}>
                            {leave.rejection_reason.length > 50 ? leave.rejection_reason.substring(0, 50) + '...' : leave.rejection_reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(leave.created_at).toLocaleDateString()}
                      <br />
                      {new Date(leave.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {leave.status === "Pending" ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCancelLeave(leave.id)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
                        >
                          Cancel
                        </motion.button>
                      ) : leave.status === "Approved" ? (
                        new Date(leave.from_date) > new Date() ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancelLeave(leave.id)}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
                          >
                            Cancel Leave
                          </motion.button>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Approved</span>
                        )
                      ) : leave.status === "Rejected" ? (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Rejected</span>
                      ) : (
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{leave.status}</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
                </tbody>
              </Table>
            </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {appliedLeaves.map((leave, idx) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaUmbrellaBeach className="text-white" />
                        <span className="text-white font-bold">{leave.leave_type_name || leave.leave_type}</span>
                      </div>
                      <div className="text-xs text-blue-100">Applied on {new Date(leave.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 ${
                      leave.status === "Approved" 
                        ? "border-green-400 bg-green-100 text-green-700"
                        : leave.status === "Rejected"
                        ? "border-red-400 bg-red-100 text-red-700"
                        : leave.status === "Pending"
                        ? "border-yellow-400 bg-yellow-100 text-yellow-700"
                        : "border-gray-400 bg-gray-100 text-gray-700"
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <FaCalendarAlt className="text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {leave.from_date} to {leave.to_date}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <FaClock className="text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Reason</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{leave.reason}</div>
                    </div>
                  </div>

                  {leave.status === "Rejected" && leave.rejection_reason && (
                    <div className="flex items-start gap-2">
                      <FaTimesCircle className="text-red-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Rejection Reason</div>
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">{leave.rejection_reason}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  {leave.status === "Pending" ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCancelLeave(leave.id)}
                      className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all shadow-md"
                    >
                      Cancel Leave Request
                    </motion.button>
                  ) : leave.status === "Approved" ? (
                    new Date(leave.from_date) > new Date() ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <FaCheckCircle className="text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Approved</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCancelLeave(leave.id)}
                          className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all shadow-md"
                        >
                          Cancel Leave
                        </motion.button>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <FaCheckCircle className="text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-semibold">Leave Approved</span>
                      </div>
                    )
                  ) : leave.status === "Rejected" ? (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <FaTimesCircle className="text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-semibold">Leave Rejected</span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{leave.status}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
        )}
        </ComponentCard>
      </motion.div>
    </div>
  );
};

export default LeaveApply;
