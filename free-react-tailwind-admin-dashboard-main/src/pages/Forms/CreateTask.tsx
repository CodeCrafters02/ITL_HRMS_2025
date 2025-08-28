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

import useGoBack from "../../hooks/useGoBack";

interface Employee {
  id: number;
  full_name: string;
}

interface Manager {
  id: number;
  name: string;
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
  const [managers, setManagers] = useState<Manager[]>([]);
  // Use current employee ID from localStorage as manager_id
  const [selectedManager, setSelectedManager] = useState<string>(() => {
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
        const response = await axiosInstance.get("reporting-managers/");
        if (response.data && Array.isArray(response.data.reporting_managers)) {
          setManagers(response.data.reporting_managers);
        } else {
          setManagers([]);
        }
      } catch {
        setManagers([]);
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
  const managerOptions = (managers || []).map(mgr => ({
    value: mgr.id.toString(),
    label: mgr.name
  }));

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
    } catch (err) {
      console.error(err);
      setError("Error creating task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <ComponentCard title="Create Task" desc="Fill in the details to create a new task for your team.">
        <Form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h3>
            
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

            {/* Reporting Manager Selection */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">Task Assignment</h4>
              

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
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={hasSubtasks}
                onChange={setHasSubtasks}
                label="Add Subtasks"
              />
            </div>

            {hasSubtasks && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">Subtasks</h4>
                
                {subtasks.map((subtask, index) => (
                  <div key={index} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Subtask {index + 1}
                      </h5>
                      {subtasks.length > 1 && (
                        <button
                        
                          onClick={() => removeSubtask(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
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
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">Subtask Assignment</h5>
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
                  </div>
                ))}

                <Button
                  onClick={addSubtask}
                  variant="outline"
                  size="sm"
                  className="w-auto"
                >
                  + Add Another Subtask
                </Button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={goBack}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              disabled={loading || !taskData.title || !taskData.deadline}
              type="submit"
            >
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}
        </Form>
      </ComponentCard>
    </div>
  );
};

export default CreateTask;
