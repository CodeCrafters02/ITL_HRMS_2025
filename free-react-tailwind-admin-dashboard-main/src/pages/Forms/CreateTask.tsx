import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Employee/api";
import ComponentCard from "../../components/common/ComponentCard";
import Form from "../../components/form/Form";
import Input from "../../components/form/input/InputField";
import DatePicker from "../../components/form/date-picker";
// import MultiSelect from "../../components/form/MultiSelect"; // Duplicate import removed
import TextArea from "../../components/form/input/TextArea";
import Select from "../../components/form/Select";
import MultiSelect from "../../components/form/MultiSelect";
import Label from "../../components/form/Label";
import Checkbox from "../../components/form/input/Checkbox";
import Button from "../../components/ui/button/Button";
import { motion } from "framer-motion";
import { FaTasks, FaPlus, FaTimes, FaCheckCircle, FaClock, FaUsers, FaArrowLeft } from "react-icons/fa";

import useGoBack from "../../hooks/useGoBack";

interface Employee {
  id: number;
  full_name: string;
}



interface TaskData {
  title: string;
  description: string;
  deadline: string;
  priority: string;
  status: string;
  assignedEmployees: string[];
  taskOwner: string;
}

interface SubtaskData {
  title: string;
  description: string;
  deadline: string;
  priority: string;
  status: string;
  assignedEmployees: string[];
  taskOwner: string;
}

const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Use current employee ID from localStorage as manager_id
  const [selectedManager] = useState<string>(() => {
    const empId = localStorage.getItem("employee_id");
    return empId ? empId : "";
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  const [taskData, setTaskData] = useState<TaskData>({
  title: "",
  description: "",
  deadline: "",
  priority: "medium",
  status: "todo",
  assignedEmployees: [],
  taskOwner: "",
  });

  const [hasSubtasks, setHasSubtasks] = useState(false);
  const [subtasks, setSubtasks] = useState<SubtaskData[]>([
    { 
      title: "", 
      description: "", 
      deadline: "", 
      priority: "medium", 
      status: "todo",
      assignedEmployees: [],
      taskOwner: "",
    }
  ]);

  // Fetch reporting managers on mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        await axiosInstance.get("reporting-managers/");
        // No longer storing managers, so nothing to set here
      } catch {
        // No longer storing managers, so nothing to set here
      }
    };
    fetchManagers();
  }, []);

  // Fetch employees for selected manager
  useEffect(() => {
    if (!selectedManager) {
      setEmployees([]);
      return;
    }
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await axiosInstance.get("reporting-managers/", { params: { manager_id: selectedManager } });
        console.log("Selected manager_id for reportees:", selectedManager);
        console.log("Fetched reportees (raw backend response):", response.data);
        if (response.data && Array.isArray(response.data)) {
          setEmployees(response.data);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.log("Error fetching reportees:", err);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [selectedManager]);

  // Convert managers and employees to options format

  const employeeOptions = (employees || []).map(emp => ({
    value: emp.id.toString(),
    text: emp.full_name
  }));

  const employeeSelectOptions = (employees || []).map(emp => ({
    value: emp.id.toString(),
    label: emp.full_name
  }));

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ];

  const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "inreview", label: "In Review" },
  { value: "done", label: "Done" }
  ];

  const handleTaskChange = (field: keyof TaskData, value: string | string[]) => {
    setTaskData({ ...taskData, [field]: value });
  };

  const handleSubtaskChange = (index: number, field: keyof SubtaskData, value: string | string[]) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], [field]: value };
    setSubtasks(updated);
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { 
      title: "", 
      description: "", 
      deadline: "", 
      priority: "medium", 
      status: "pending",
      assignedEmployees: [],
      taskOwner: "",
    }]);
  };

  const removeSubtask = (index: number) => {
    if (subtasks.length > 1) {
      const updated = subtasks.filter((_, i) => i !== index);
      setSubtasks(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create parent task
      const parentTaskResponse = await axiosInstance.post("tasks/", {
        title: taskData.title,
        description: taskData.description,
        deadline: taskData.deadline,
        priority: taskData.priority,
        status: taskData.status,
      });

      const parentTask = parentTaskResponse.data;

      // Assign employees to the task
      if (taskData.assignedEmployees.length > 0) {
        await axiosInstance.post(`task-assign/${parentTask.id}/`, {
          owner: taskData.taskOwner,
          employees: taskData.assignedEmployees,
        });
      }

      // If subtasks
      // If subtasks are enabled, create them
      if (hasSubtasks && subtasks.length > 0) {
        for (const sub of subtasks) {
          if (sub.title.trim()) { // Only create subtasks with titles
            const subtaskResponse = await axiosInstance.post("tasks/", {
              title: sub.title,
              description: sub.description,
              deadline: sub.deadline,
              priority: sub.priority,
              status: sub.status,
              parent_task: parentTask.id,
            });

            // Assign employees to subtask
            if (sub.assignedEmployees.length > 0) {
              await axiosInstance.post(`tasks/subtask-assign/${subtaskResponse.data.id}/`, {
                owner: sub.taskOwner,
                contributors: sub.assignedEmployees,
              });
            }
          }
        }
      }

      setSuccess("Task created successfully!");
      setTimeout(() => {
        navigate("/employee/assign-task");
      }, 2000);
    } catch (err: any) {
      console.error('Task creation error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Show detailed error message from backend
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message
        || (typeof err.response?.data === 'string' ? err.response.data : null)
        || err.message
        || "Error creating task. Please try again.";
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <FaTasks className="text-blue-600" />
                Create New Task
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Fill in the details to create a new task for your team</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium shadow-md transition-all"
            >
              <FaArrowLeft />
              Back
            </motion.button>
          </div>
        </div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
                <FaTasks className="text-white" />
              </div>
              Task Information
            </h2>
          </div>

          <Form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Task Details Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <FaTasks className="text-white" size={14} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Task Details</h3>
              </div>
            
            <div>
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={taskData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTaskChange("title", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <TextArea
                placeholder="Enter task description"
                value={taskData.description}
                onChange={(value: string) => handleTaskChange("description", value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <DatePicker
                  id="deadline"
                  label="Deadline *"
                  defaultDate={taskData.deadline}
                  onChange={([date]) =>
                    handleTaskChange(
                      "deadline",
                      date instanceof Date
                        ? date.getFullYear() + '-' +
                          String(date.getMonth() + 1).padStart(2, '0') + '-' +
                          String(date.getDate()).padStart(2, '0')
                        : ""
                    )
                  }
                  placeholder="Select deadline"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  options={priorityOptions}
                  defaultValue={taskData.priority}
                  onChange={(value: string) => handleTaskChange("priority", value)}
                  placeholder="Select priority"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  options={statusOptions}
                  defaultValue={taskData.status}
                  onChange={(value: string) => handleTaskChange("status", value)}
                  placeholder="Select status"
                />
              </div>
            </div>

            {/* Task Assignment Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <FaUsers className="text-white" size={14} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Task Assignment</h4>
              </div>
              

              {selectedManager && (
                loadingEmployees ? (
                  <div className="text-sm text-gray-500">Loading employees...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-gray-500">No employees found for this manager.</div>
                ) : (
                  <>
                    <div>
                      <MultiSelect
                        label="Assign Employees"
                        options={employeeOptions}
                        defaultSelected={taskData.assignedEmployees}
                        onChange={(selected: string[]) => handleTaskChange("assignedEmployees", selected)}
                      />
                    </div>

                    {taskData.assignedEmployees.length > 0 && (
                      <div>
                        <Label htmlFor="taskOwner">Task Owner</Label>
                        <Select
                          options={employeeSelectOptions.filter(emp => 
                            taskData.assignedEmployees.includes(emp.value)
                          )}
                          defaultValue={taskData.taskOwner}
                          onChange={(value: string) => handleTaskChange("taskOwner", value)}
                          placeholder="Select task owner"
                        />
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center space-x-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800"
            >
              <Checkbox
                checked={hasSubtasks}
                onChange={setHasSubtasks}
                label=""
              />
              <div className="flex items-center gap-2">
                <FaPlus className="text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Add Subtasks</span>
              </div>
            </motion.div>

            {hasSubtasks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800 space-y-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <FaTasks className="text-white" size={14} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Subtasks</h4>
                </div>
                
                {subtasks.map((subtask, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-5 space-y-4 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <h5 className="text-base font-bold text-gray-900 dark:text-white">
                          Subtask {index + 1}
                        </h5>
                      </div>
                      {subtasks.length > 1 && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => removeSubtask(index)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                        >
                          <FaTimes size={12} />
                          Remove
                        </motion.button>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`subtask-title-${index}`}>Subtask Title</Label>
                      <Input
                        id={`subtask-title-${index}`}
                        placeholder="Enter subtask title"
                        value={subtask.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSubtaskChange(index, "title", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`subtask-description-${index}`}>Description</Label>
                      <TextArea
                        placeholder="Enter subtask description"
                        value={subtask.description}
                        onChange={(value: string) => handleSubtaskChange(index, "description", value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <DatePicker
                          id={`subtask-deadline-${index}`}
                          label="Deadline *"
                          defaultDate={subtask.deadline}
                          onChange={([date]) =>
                            handleSubtaskChange(
                              index,
                              "deadline",
                              date instanceof Date
                                ? date.getFullYear() + '-' +
                                  String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                  String(date.getDate()).padStart(2, '0')
                                : ""
                            )
                          }
                          placeholder="Select deadline"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`subtask-priority-${index}`}>Priority</Label>
                        <Select
                          options={priorityOptions}
                          defaultValue={subtask.priority}
                          onChange={(value: string) => handleSubtaskChange(index, "priority", value)}
                          placeholder="Select priority"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`subtask-status-${index}`}>Status</Label>
                        <Select
                          options={statusOptions}
                          defaultValue={subtask.status}
                          onChange={(value: string) => handleSubtaskChange(index, "status", value)}
                          placeholder="Select status"
                        />
                      </div>
                    </div>

                    {/* Subtask Assignment Section */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-4 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-indigo-600 dark:text-indigo-400" size={14} />
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white">Subtask Assignment</h5>
                      </div>
                      {selectedManager && (
                        loadingEmployees ? (
                          <div className="text-sm text-gray-500">Loading employees...</div>
                        ) : employees.length === 0 ? (
                          <div className="text-sm text-gray-500">No employees found for this manager.</div>
                        ) : (
                          <>
                            <div>
                              <Label htmlFor={`subtask-assignedEmployees-${index}`}>Assign Employees</Label>
                              <MultiSelect
                                label=""
                                options={employeeOptions}
                                defaultSelected={subtask.assignedEmployees}
                                onChange={(selected: string[]) => 
                                  handleSubtaskChange(index, "assignedEmployees", selected)
                                }
                              />
                            </div>

                            {subtask.assignedEmployees.length > 0 && (
                              <div>
                                <Label htmlFor={`subtask-taskOwner-${index}`}>Subtask Owner</Label>
                                <Select
                                  options={employeeSelectOptions.filter(emp => 
                                    subtask.assignedEmployees.includes(emp.value)
                                  )}
                                  defaultValue={subtask.taskOwner}
                                  onChange={(value: string) => 
                                    handleSubtaskChange(index, "taskOwner", value)
                                  }
                                  placeholder="Select subtask owner"
                                />
                              </div>
                            )}
                          </>
                        )
                      )}
                    </div>
                  </motion.div>
                ))}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addSubtask}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <FaPlus />
                  Add Another Subtask
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goBack}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </motion.button>

            <motion.button
              type="submit"
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              disabled={loading || !taskData.title || !taskData.deadline}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Task...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Create Task
                </>
              )}
            </motion.button>
          </div>

          {/* Status Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-200 dark:border-red-800 text-sm font-medium"
            >
              <FaTimes className="text-xl" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800 text-sm font-medium"
            >
              <FaCheckCircle className="text-xl" />
              {success}
            </motion.div>
          )}
        </Form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CreateTask;
