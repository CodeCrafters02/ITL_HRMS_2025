import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./api";
import { FaTrash } from "react-icons/fa";
import ComponentCard from "../../components/common/ComponentCard";

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

const AvatarBadge = ({
  name,
  avatarUrl,
  index,
}: {
  name?: string;
  avatarUrl?: string;
  index?: number;
}) => {
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
      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium shadow-sm"
      style={{ zIndex: 10 - (index || 0) }}
      title={name || "Unknown"}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || "Avatar"}
          className="w-full h-full rounded-full object-cover"
        />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    axiosInstance
      .get("tasks/")
      .then((res) => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load created tasks");
        setLoading(false);
      });
  }, []);

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
        alert("Task deleted successfully");
      })
      .catch(() => alert("Failed to delete task"));
  };

  const handleTaskClick = (taskId: number) => {
    setDetailLoading(true);
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

  const handleBack = () => {
    setSelectedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {selectedTask ? "Task Details" : "Assign Tasks"}
        </h1>
        <div className="flex gap-3">
          {selectedTask && (
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back to Tasks
            </button>
          )}
          <button
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            onClick={() => navigate("/employee/create-tasks")}
          >
            + Create Task
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">Loading tasks...</div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-center py-12 bg-red-50 rounded-lg">
          <div className="text-lg font-medium">{error}</div>
        </div>
      ) : selectedTask ? (
        /* Task Detail View */
        <div className="max-w-4xl mx-auto">
          <ComponentCard title="">
            <div className="space-y-6">
              {detailLoading ? (
                <div className="text-center py-8">Loading task details...</div>
              ) : (
                <>
                  {/* Task Header */}
                  <div className="border-b pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        {selectedTask.title}
                        {/* Update icon */}
                        <button
                          className="ml-1 text-brand-500 hover:text-brand-700 focus:outline-none"
                          title="Edit task"
                          onClick={() => navigate(`/update-form/${selectedTask.id}`)}
                        >
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                            <path d="M4 20h4.586a1 1 0 0 0 .707-.293l9.414-9.414a2 2 0 0 0 0-2.828l-2.172-2.172a2 2 0 0 0-2.828 0L4.293 14.707A1 1 0 0 0 4 15.414V20z" stroke="#6366F1" strokeWidth="2" fill="#fff"/>
                            <path d="M14.828 7.172l2 2" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {/* Status dropdown for parent task */}
                        <select
                          className="ml-2 text-xs border rounded px-1 py-0.5 bg-white"
                          value={selectedTask.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            // If manager, update parent and all subtasks in one PATCH
                            const subtasksPayload = (selectedTask.subtask_details || []).map(st => ({
                              id: st.id,
                              status: st.status
                            }));
                            await axiosInstance.patch(`tasks/update-status/${selectedTask.id}/`, {
                              status: newStatus,
                              subtasks: subtasksPayload
                            });
                            setSelectedTask({
                              ...selectedTask,
                              status: newStatus,
                            });
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === selectedTask.id
                                  ? { ...t, status: newStatus }
                                  : t
                              )
                            );
                          }}
                          disabled={selectedTask.status === "done"}
                        >
                          {["todo", "inprogress", "inreview", "done"].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                          ))}
                        </select>
                      </h2>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                            selectedTask.priority
                          )}`}
                        >
                          {selectedTask.priority.charAt(0).toUpperCase() +
                            selectedTask.priority.slice(1)}{" "}
                          Priority
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            selectedTask.status
                          )}`}
                        >
                          {selectedTask.status
                            .replace("_", " ")
                            .charAt(0)
                            .toUpperCase() +
                            selectedTask.status
                              .replace("_", " ")
                              .slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Description
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedTask.description || "No description provided"}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Deadline
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {new Date(
                            selectedTask.deadline
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Created
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {new Date(
                            selectedTask.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contributors */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Contributors ({selectedTask.assignments?.length || 0})
                    </h3>
                    {selectedTask.assignments &&
                    selectedTask.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.assignments.map((assignment, index) => (
                          <div
                            key={assignment.id}
                            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                          >
                            <AvatarBadge
                              name={assignment.employee_name}
                              avatarUrl={assignment.avatar_url}
                              index={index}
                            />
                            <span className="text-sm font-medium">
                              {assignment.employee_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({assignment.role})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No contributors assigned
                      </p>
                    )}
                  </div>

                  {/* Subtasks */}
                  {selectedTask.subtask_details &&
                    selectedTask.subtask_details.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Subtasks ({selectedTask.subtask_details.length})
                        </h3>
                        <div className="space-y-3">
                          {selectedTask.subtask_details.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                  {subtask.title}
                                  <select
                                    className="ml-2 text-xs border rounded px-1 py-0.5 bg-white"
                                    value={subtask.status}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;
                                      // Manager-only: PATCH parent and subtasks together
                                      const subtasksPayload = (selectedTask.subtask_details || []).map(st =>
                                        st.id === subtask.id
                                          ? { id: st.id, status: newStatus }
                                          : { id: st.id, status: st.status }
                                      );
                                      await axiosInstance.patch(`tasks/update-status/${selectedTask.id}/`, {
                                        status: selectedTask.status,
                                        subtasks: subtasksPayload
                                      });
                                      setSelectedTask((sel) =>
                                        sel
                                          ? {
                                              ...sel,
                                              subtask_details: sel.subtask_details?.map(
                                                (st) =>
                                                  st.id === subtask.id
                                                    ? { ...st, status: newStatus }
                                                    : st
                                              ),
                                            }
                                          : sel
                                      );
                                    }}
                                    disabled={subtask.status === "done"}
                                  >
                                    {["todo", "inprogress", "inreview", "done"].map(
                                      (opt) => (
                                        <option key={opt} value={opt}>
                                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                    subtask.status
                                  )}`}
                                >
                                  {subtask.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-3">
                                {subtask.description}
                              </p>
                              {subtask.assignments &&
                                subtask.assignments.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                      Contributors:
                                    </span>
                                    <div className="flex -space-x-1">
                                      {subtask.assignments.map(
                                        (assignment, idx) => (
                                          <AvatarBadge
                                            key={assignment.id}
                                            name={assignment.employee_name}
                                            avatarUrl={assignment.avatar_url}
                                            index={idx}
                                          />
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </ComponentCard>
        </div>
      ) : tasks.length === 0 ? (
        /* Empty State */
        <ComponentCard title="Assign Tasks">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl font-medium mb-2 text-gray-900 dark:text-white">
              No tasks found
            </p>
            <p className="text-gray-500 mb-6">
              Get started by creating your first task
            </p>
            <button
              onClick={() => navigate("/employee/create-tasks")}
              className="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Create Your First Task
            </button>
          </div>
        </ComponentCard>
      ) : (
        /* Task List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="relative group">
              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteTask(e, task.id)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                title="Delete task"
              >
                <FaTrash size={14} />
              </button>

              {/* Task Card */}
              <div
                onClick={() => handleTaskClick(task.id)}
                className="cursor-pointer transform transition-all duration-200 hover:scale-105"
              >
                <ComponentCard
                  title={
                    <div className="flex items-center gap-2">
                      <span>{task.title}</span>
                      <button
                        className={`inline-block focus:outline-none ${
                          task.status === "done"
                            ? "bg-green-50 border border-green-400"
                            : "bg-white border border-gray-300"
                        } rounded-full p-0.5`}
                        title={
                          task.status === "done"
                            ? "Completed"
                            : "Mark as completed"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          const myAssignment = task.assignments?.find(
                            (a) => a.is_seen
                          );
                          if (myAssignment) {
                            axiosInstance
                              .patch(`tasks-assignment/${myAssignment.id}/status/`, {
                                status: "done",
                              })
                              .then(() => {
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id ? { ...t, status: "done" } : t
                                  )
                                );
                              });
                          }
                        }}
                        disabled={
                          task.status === "done" ||
                          !(task.assignments && task.assignments.length)
                        }
                      >
                        <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                          <circle
                            cx="10"
                            cy="10"
                            r="9"
                            fill={task.status === "done" ? "#D1FAE5" : "#fff"}
                            stroke={task.status === "done" ? "#34D399" : "#D1FAE5"}
                            strokeWidth="2"
                          />
                          <path
                            d="M6 10.5l2.5 2.5 5-5"
                            stroke={task.status === "done" ? "#059669" : "#6d7573ff"}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  }
                  desc=""
                  className="h-full hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                      {task.description || "No description"}
                    </p>

                    <div className="text-xs text-gray-500">
                      <div>
                        Deadline:{" "}
                        {new Date(task.deadline).toLocaleDateString()}
                      </div>
                      <div>
                        Created:{" "}
                        {new Date(task.created_at).toLocaleDateString()}{" "}
                        {new Date(task.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        {task.assignments?.length || 0} contributor
                        {(task.assignments?.length || 0) !== 1 ? "s" : ""}
                      </span>
                      {task.assignments && task.assignments.length > 0 && (
                        <div className="flex -space-x-1">
                          {task.assignments.slice(0, 3).map((assignment, index) => (
                            <AvatarBadge
                              key={assignment.id}
                              name={assignment.employee_name}
                              avatarUrl={assignment.avatar_url}
                              index={index}
                            />
                          ))}
                          {task.assignments.length > 3 && (
                            <div
                              className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs font-medium text-gray-600"
                              title={`+${task.assignments.length - 3} more`}
                            >
                              +{task.assignments.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ComponentCard>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignTask;
