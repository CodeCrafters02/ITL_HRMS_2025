import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./api";
import { FaTrash, FaTasks, FaPlus, FaEdit, FaClock, FaCalendarAlt, FaUsers, FaCheckCircle, FaSearch, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaEye, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface Assignment {
  id: number;
  employee: number;
  employee_name: string;
  avatar_url?: string;
  role: string;
  status: string;
  is_seen: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  priority: string;
  status: string;
  created_at: string;
  assignments?: Assignment[];
  subtask_details?: Task[];
}

type ViewType = 'card' | 'table';
type FilterType = 'all' | 'high' | 'medium' | 'low';
type StatusFilterType = 'all' | 'todo' | 'inprogress' | 'inreview' | 'done';

const AvatarBadge = ({ name, avatarUrl, index }: { name?: string; avatarUrl?: string; index?: number }) => {
  let initials = "?";
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) {
      initials = parts[0][0].toUpperCase();
    } else if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  }

  return (
    <div
      className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium shadow-sm"
      style={{ zIndex: 10 - (index || 0) }}
      title={name || "Unknown"}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || "Avatar"} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
          {initials}
        </div>
      )}
    </div>
  );
};

const AssignTask: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    let filtered = [...tasks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority.toLowerCase() === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status.toLowerCase() === statusFilter);
    }

    setFilteredTasks(filtered);
    setCurrentPage(1);
  }, [tasks, searchTerm, priorityFilter, statusFilter]);

  const fetchTasks = () => {
    axiosInstance
      .get("tasks/")
      .then((res) => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load tasks");
        setLoading(false);
      });
  };

  const handleDeleteTask = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    axiosInstance
      .delete(`tasks/${taskId}/`)
      .then(() => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(null);
        }
      })
      .catch(() => alert("Failed to delete task"));
  };

  const handleTaskClick = (taskId: number) => {
    setDetailLoading(true);
    setSelectedTask(null);
    axiosInstance
      .get(`tasks/${taskId}/`)
      .then((res) => {
        setSelectedTask(res.data);
        setDetailLoading(false);
      })
      .catch(() => {
        setError("Failed to load task details");
        setDetailLoading(false);
      });
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high": return { color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", label: "High" };
      case "medium": return { color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", label: "Medium" };
      case "low": return { color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Low" };
      default: return { color: "text-gray-700 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-900/30", label: "Unknown" };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "done": return { color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Done" };
      case "inprogress": return { color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "In Progress" };
      case "inreview": return { color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "In Review" };
      case "todo": return { color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30", label: "To Do" };
      default: return { color: "text-gray-700 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-900/30", label: status };
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
              <FaTasks className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Organize and track your team's tasks</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/employee/create-tasks")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <FaPlus />
            Create Task
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Results and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
          <div className="flex items-center gap-3">
            {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setPriorityFilter('all'); setStatusFilter('all'); }}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <FaTimes /> Clear Filters
              </button>
            )}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('card')}
                className={`p-2 rounded-md transition-all ${viewType === 'card' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaTh className="text-lg" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-all ${viewType === 'table' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Items:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer text-sm"
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
                  className={`px-3 py-1.5 rounded-lg border text-sm ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredTasks.length)}</span> of <span className="font-medium">{filteredTasks.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaTasks className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Tasks Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Start by creating your first task'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {paginatedTasks.map((task, index) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const statusConfig = getStatusConfig(task.status);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 p-4 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg line-clamp-2">{task.title}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/update-form/${task.id}`); }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                      >
                        <FaEdit className="text-white" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-all"
                      >
                        <FaTrash className="text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">{task.description || "No description"}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <FaClock className="text-orange-500" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <FaUsers className="text-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">{task.assignments?.length || 0} Members</span>
                        </div>
                        {task.assignments && task.assignments.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.assignments.slice(0, 3).map((a, i) => (
                              <AvatarBadge key={a.id} name={a.employee_name} avatarUrl={a.avatar_url} index={i} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Task</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Deadline</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Team</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedTasks.map((task) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const statusConfig = getStatusConfig(task.status);
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{task.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(task.deadline).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {task.assignments?.slice(0, 3).map((a, i) => (
                            <AvatarBadge key={a.id} name={a.employee_name} avatarUrl={a.avatar_url} index={i} />
                          ))}
                          {(task.assignments?.length || 0) > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold">
                              +{(task.assignments?.length || 0) - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleTaskClick(task.id)}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => navigate(`/update-form/${task.id}`)}
                            className="p-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-lg"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaTasks className="text-2xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold truncate">{selectedTask.title}</h2>
                    <p className="text-blue-100 mt-1">Task Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-300"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-180px)]">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Status Badges */}
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPriorityConfig(selectedTask.priority).bgColor} ${getPriorityConfig(selectedTask.priority).color}`}>
                      {getPriorityConfig(selectedTask.priority).label} Priority
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusConfig(selectedTask.status).bgColor} ${getStatusConfig(selectedTask.status).color}`}>
                      {getStatusConfig(selectedTask.status).label}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedTask.description || "No description provided"}</p>
                  </div>

                  {/* Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-3">
                        <FaClock className="text-orange-500 text-xl" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Deadline</p>
                          <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedTask.deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <FaCalendarAlt className="text-green-500 text-xl" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Created</p>
                          <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedTask.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contributors */}
                  {selectedTask.assignments && selectedTask.assignments.length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FaUsers className="text-indigo-500" />
                        Contributors ({selectedTask.assignments.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTask.assignments.map((a, i) => (
                          <div key={a.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <AvatarBadge name={a.employee_name} avatarUrl={a.avatar_url} index={i} />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.employee_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{a.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignTask;
