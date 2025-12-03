import React, { useEffect, useState } from "react";
import { axiosInstance } from "./api";

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

  const handleAssignmentStatusChange = async (assignmentId: number, newStatus: string, parentId?: number, isSubtask?: boolean) => {
    try {
      await axiosInstance.patch(`tasks-assignment/${assignmentId}/status/`, { status: newStatus });
      setTasks(prev => prev.map(task => {
        if (!isSubtask && task.assignments.some(a => a.id === assignmentId)) {
          return {
            ...task,
            assignments: task.assignments.map(a =>
              a.id === assignmentId ? { ...a, status: newStatus } : a
            )
          };
        }
        if (isSubtask && task.id === parentId) {
          return {
            ...task,
            subtask_details: task.subtask_details.map(st => ({
              ...st,
              assignments: st.assignments.map(a =>
                a.id === assignmentId ? { ...a, status: newStatus } : a
              )
            }))
          };
        }
        return task;
      }));
    } catch {
      alert('Failed to update assignment status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6 text-center dark:text-gray-100">Assigned Tasks</h2>
      {loading ? (
        <div className="text-center py-8 dark:text-gray-300">Loading...</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400 text-center py-8">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">No assigned tasks found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-5 relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.title}</h3>
                  {/* Tick mark button for main task only */}
                  <button
                    className={`inline-block focus:outline-none ${task.status === 'done' ? 'bg-green-50 dark:bg-green-900/30 border border-green-400' : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600'} rounded-full p-0.5`}
                    title={task.status === 'done' ? 'Completed' : 'Mark as completed'}
                    onClick={() => handleAssignmentStatusChange(task.assignments[0]?.id, 'done')}
                    disabled={task.status === 'done' || !task.assignments.length}
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="9" fill={task.status === 'done' ? '#34D399' : '#fff'} stroke={task.status === 'done' ? '#34D399' : '#D1FAE5'} strokeWidth="2" />
                      <path d="M6 10.5l2.5 2.5 5-5" stroke={task.status === 'done' ? '#fff' : '#6d7573ff'} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {/* Status dropdown for main task (first assignment) */}
                  {task.assignments.length > 0 && (
                    <select
                      className="ml-2 text-xs border dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 dark:text-gray-100"
                      value={task.assignments[0].status}
                      onChange={e => handleAssignmentStatusChange(task.assignments[0].id, e.target.value)}
                      disabled={task.assignments[0].status === 'done'}
                    >
                      {ASSIGNMENT_STATUSES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                {task.subtask_details.length > 0 && (
                  <button
                    className="text-blue-600 dark:text-blue-400 underline text-xs"
                    onClick={() => toggleExpand(task.id)}
                  >
                    {expandedTaskId === task.id ? "Hide Subtasks" : "Show Subtasks"}
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{task.description}</div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">Deadline: {task.deadline}</span>
                <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">Priority: {task.priority}</span>
                <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">Status: {task.status}</span>
                <span className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">Progress: {task.progress}%</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold text-xs dark:text-gray-200">Contributors: </span>
                {task.contributors.map((name, i) => (
                  <span key={i} className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded px-2 py-1 mr-1 text-xs">{name}</span>
                ))}
              </div>
              <div className="mb-2">
                <span className="font-semibold text-xs dark:text-gray-200">Assignments:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {task.assignments.map(assign => (
                    <div key={assign.id} className="flex items-center bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 mr-2 mb-1">
                      {assign.avatar_url && (
                        <img src={assign.avatar_url} alt={assign.employee_name} className="w-6 h-6 rounded-full mr-2" />
                      )}
                      <span className="text-xs font-medium dark:text-gray-200">{assign.employee_name}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({assign.role})</span>
                    </div>
                  ))}
                </div>
              </div>
              {expandedTaskId === task.id && task.subtask_details.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2 text-sm dark:text-gray-200">Subtasks</div>
                  <div className="space-y-3">
                    {task.subtask_details.map(subtask => (
                      <div key={subtask.id} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{subtask.title}</span>
                            {/* Status dropdown for subtask (first assignment) */}
                            {subtask.assignments.length > 0 && (
                              <select
                                className="ml-2 text-xs border dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-600 dark:text-gray-100"
                                value={subtask.assignments[0].status}
                                onChange={e => handleAssignmentStatusChange(subtask.assignments[0].id, e.target.value, task.id, true)}
                                disabled={subtask.assignments[0].status === 'done'}
                              >
                                {ASSIGNMENT_STATUSES.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <span className="bg-gray-200 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded text-xs">Progress: {subtask.progress}%</span>
                        </div>
                        <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">{subtask.description}</div>
                        <div className="flex flex-wrap gap-2 mb-1">
                          <span className="bg-gray-100 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded text-xs">Deadline: {subtask.deadline}</span>
                          <span className="bg-gray-100 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded text-xs">Priority: {subtask.priority}</span>
                          <span className="bg-gray-100 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded text-xs">Status: {subtask.status}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-xs dark:text-gray-200">Assignments:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {subtask.assignments.map(assign => (
                              <div key={assign.id} className="flex items-center bg-gray-100 dark:bg-gray-600 rounded px-2 py-1 mr-2 mb-1">
                                {assign.avatar_url && (
                                  <img src={assign.avatar_url} alt={assign.employee_name} className="w-5 h-5 rounded-full mr-2" />
                                )}
                                <span className="text-xs font-medium dark:text-gray-200">{assign.employee_name}</span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({assign.role})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTask;
