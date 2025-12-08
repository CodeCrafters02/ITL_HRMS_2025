import React, { useEffect, useState } from "react";
import { axiosInstance } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import { FaTasks, FaCheckCircle, FaClock, FaExclamationCircle, FaChevronDown, FaChevronUp, FaFilter, FaSearch, FaCalendarAlt, FaStar, FaFlag, FaUsers, FaChartLine, FaUser, FaList, FaSpinner, FaCheck, FaTimes } from "react-icons/fa";

interface Assignment {
  id: number;
  task: number;
  employee: number;
  role: string;
  status: string;
  is_seen: boolean;
  employee_name: string;
  avatar_url: string | null;
}

interface Subtask {
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: string;
  status: string;
  assignments: Assignment[];
  progress: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  contributors: string[];
  created_by: number;
  created_at: string;
  deadline: string;
  priority: string;
  status: string;
  subtask_details: Subtask[];
  assignments: Assignment[];
  progress: number;
}

const ASSIGNMENT_STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'inreview', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const MyTask: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: string}>({});
  const [savingStatus, setSavingStatus] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    axiosInstance.get("my-tasks/")
      .then(res => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load assigned tasks");
        setLoading(false);
      });
  }, []);

  const toggleExpand = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  // Removed unused handleStatusChange function

  const handleStatusChange = (assignmentId: number, newStatus: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [assignmentId]: newStatus
    }));
  };

  const confirmStatusChange = async (assignmentId: number, parentId?: number, isSubtask?: boolean) => {
    const newStatus = pendingChanges[assignmentId];
    if (!newStatus) return;

    setSavingStatus(prev => ({ ...prev, [assignmentId]: true }));
    try {
      await axiosInstance.patch(`tasks-assignment/${assignmentId}/status/`, { status: newStatus });
      
      // Refetch tasks to get updated progress and status from backend
      const response = await axiosInstance.get("my-tasks/");
      setTasks(response.data);
      
      setPendingChanges(prev => {
        const newPending = { ...prev };
        delete newPending[assignmentId];
        return newPending;
      });
    } catch {
      alert('Failed to update assignment status.');
    } finally {
      setSavingStatus(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const cancelStatusChange = (assignmentId: number) => {
    setPendingChanges(prev => {
      const newPending = { ...prev };
      delete newPending[assignmentId];
      return newPending;
    });
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'inprogress').length,
    completed: tasks.filter(t => t.status === 'done').length,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'inprogress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      case 'inreview': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <FaTasks className="text-blue-600 dark:text-blue-400" />
                My Tasks
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and track your assigned tasks efficiently</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FaTasks className="text-blue-600 dark:text-blue-400 text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">To Do</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todo}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <FaClock className="text-gray-600 dark:text-gray-400 text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <FaExclamationCircle className="text-yellow-600 dark:text-yellow-400 text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="inreview">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <FaFlag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              <FaTasks className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center"
          >
            <FaExclamationCircle className="text-red-600 dark:text-red-400 text-5xl mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-lg font-semibold">{error}</p>
          </motion.div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <FaTasks className="text-gray-400 dark:text-gray-600 text-6xl mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No tasks found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Task Header with Priority Indicator */}
                  <div className={`h-2 ${task.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-500' : task.priority === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}></div>
                  
                  <div className="p-6">
                    {/* Title and Quick Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{task.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                      </div>

                      {/* Status Dropdown with Confirm/Cancel */}
                      {task.assignments.length > 0 && (
                        <div className="flex items-center gap-2 ml-2">
                          <select
                            value={pendingChanges[task.assignments[0].id] ?? task.assignments[0].status}
                            onChange={e => handleStatusChange(task.assignments[0].id, e.target.value)}
                            disabled={task.assignments[0].status === 'done'}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all ${getStatusColor(pendingChanges[task.assignments[0].id] ?? task.assignments[0].status)} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${task.assignments[0].status === 'done' ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            {ASSIGNMENT_STATUSES.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          
                          {pendingChanges[task.assignments[0].id] && task.assignments[0].status !== 'done' && (
                            <div className="flex gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => confirmStatusChange(task.assignments[0].id)}
                                disabled={savingStatus[task.assignments[0].id]}
                                className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                title="Confirm change"
                              >
                                {savingStatus[task.assignments[0].id] ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => cancelStatusChange(task.assignments[0].id)}
                                disabled={savingStatus[task.assignments[0].id]}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                title="Cancel change"
                              >
                                <FaTimes />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Meta Information */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <FaCalendarAlt className="text-gray-500 dark:text-gray-400 text-xs" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{task.deadline}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getPriorityColor(task.priority)}`}>
                        <FaFlag className="text-xs" />
                        <span className="text-xs font-medium capitalize">{task.priority}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getStatusColor(task.status)}`}>
                        <FaStar className="text-xs" />
                        <span className="text-xs font-medium capitalize">{task.status.replace('inprogress', 'In Progress').replace('inreview', 'In Review')}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <FaChartLine className="text-xs" />
                          Progress
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{task.progress}%</span>
                      </div>
                      {/* State label above bar */}
                      <div className="flex justify-end mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(task.status)}`}>{ASSIGNMENT_STATUSES.find(s => s.value === task.status)?.label || task.status}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          key={`progress-${task.id}-${task.progress}`}
                          initial={{ width: `${task.progress}%` }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            task.progress === 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : task.progress >= 50 
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`}
                        ></motion.div>
                      </div>
                    </div>

                    {/* Contributors */}
                    {task.contributors.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FaUsers className="text-gray-500 dark:text-gray-400 text-xs" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Team</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {task.contributors.slice(0, 3).map((name, i) => (
                            <span key={i} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                              {name}
                            </span>
                          ))}
                          {task.contributors.length > 3 && (
                            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                              +{task.contributors.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Assignments */}
                    {task.assignments.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FaUser className="text-gray-500 dark:text-gray-400 text-xs" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assigned To</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {task.assignments.map(assign => (
                            <div key={assign.id} className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 rounded-lg px-3 py-2">
                              {assign.avatar_url ? (
                                <img src={assign.avatar_url} alt={assign.employee_name} className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-600" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {assign.employee_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">{assign.employee_name}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">{assign.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subtasks Toggle */}
                    {task.subtask_details.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleExpand(task.id)}
                        className="w-full mt-2 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-md hover:shadow-lg"
                      >
                        <FaList className="text-sm" />
                        {expandedTaskId === task.id ? "Hide" : "Show"} Subtasks ({task.subtask_details.length})
                      </motion.button>
                    )}
                  </div>

                  {/* Subtasks (expanded) */}
                  <AnimatePresence>
                    {expandedTaskId === task.id && task.subtask_details.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 pb-6 overflow-hidden"
                      >
                        <div className="pt-4 space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <FaList className="text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Subtasks</h4>
                          </div>
                          {task.subtask_details.map((subtask, subIndex) => (
                            <motion.div
                              key={subtask.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subIndex * 0.1 }}
                              className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{subtask.title}</h5>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{subtask.description}</p>
                                </div>

                                {/* Subtask Status Dropdown with Confirm/Cancel */}
                                {subtask.assignments.length > 0 && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <select
                                      value={pendingChanges[subtask.assignments[0].id] ?? subtask.assignments[0].status}
                                      onChange={e => handleStatusChange(subtask.assignments[0].id, e.target.value)}
                                      disabled={subtask.assignments[0].status === 'done'}
                                      className={`px-2 py-1 text-[10px] font-medium rounded-md border-2 transition-all ${getStatusColor(pendingChanges[subtask.assignments[0].id] ?? subtask.assignments[0].status)} ${subtask.assignments[0].status === 'done' ? 'cursor-not-allowed opacity-75' : ''}`}
                                    >
                                      {ASSIGNMENT_STATUSES.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    
                                    {pendingChanges[subtask.assignments[0].id] && subtask.assignments[0].status !== 'done' && (
                                      <div className="flex gap-0.5">
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => confirmStatusChange(subtask.assignments[0].id, task.id, true)}
                                          disabled={savingStatus[subtask.assignments[0].id]}
                                          className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
                                          title="Confirm change"
                                        >
                                          {savingStatus[subtask.assignments[0].id] ? <FaSpinner className="animate-spin text-[8px]" /> : <FaCheck className="text-[8px]" />}
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => cancelStatusChange(subtask.assignments[0].id)}
                                          disabled={savingStatus[subtask.assignments[0].id]}
                                          className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
                                          title="Cancel change"
                                        >
                                          <FaTimes className="text-[8px]" />
                                        </motion.button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Subtask Meta */}
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-medium flex items-center gap-1">
                                  <FaCalendarAlt className="text-[8px]" /> {subtask.deadline}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${getPriorityColor(subtask.priority)}`}>
                                  <FaFlag className="text-[8px]" /> {subtask.priority}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(subtask.status)}`}>
                                  {subtask.status.replace('inprogress', 'In Progress').replace('inreview', 'In Review')}
                                </span>
                              </div>

                              {/* Subtask Progress */}
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <FaChartLine className="text-[8px]" /> Progress
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-900 dark:text-white">{subtask.progress}%</span>
                                </div>
                                {/* State label above bar */}
                                <div className="flex justify-end mb-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusColor(subtask.status)}`}>{ASSIGNMENT_STATUSES.find(s => s.value === subtask.status)?.label || subtask.status}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div
                                    key={`subtask-progress-${subtask.id}-${subtask.progress}`}
                                    initial={{ width: `${subtask.progress}%` }}
                                    animate={{ width: `${subtask.progress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                      subtask.progress === 100 
                                        ? 'bg-green-500' 
                                        : subtask.progress >= 50 
                                          ? 'bg-blue-500'
                                          : 'bg-yellow-500'
                                    }`}
                                  ></motion.div>
                                </div>
                              </div>

                              {/* Subtask Assignments */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {subtask.assignments.map(assign => (
                                  <div key={assign.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                                    {assign.avatar_url ? (
                                      <img src={assign.avatar_url} alt={assign.employee_name} className="w-5 h-5 rounded-full ring-1 ring-gray-300 dark:ring-gray-600" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold">
                                        {assign.employee_name.charAt(0)}
                                      </div>
                                    )}
                                    <span className="text-[10px] font-medium text-gray-900 dark:text-white">{assign.employee_name}</span>
                                    <span className="text-[9px] text-gray-500 dark:text-gray-400">({assign.role})</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTask;
