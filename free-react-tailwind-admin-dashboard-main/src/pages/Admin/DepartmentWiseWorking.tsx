import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import Badge from "../../components/ui/badge/Badge";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface Department {
  id: number;
  department_name: string;
}

interface Shift {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
}

interface WorkingDay {
  id: number;
  department: Department;
  shifts: Shift[];
  working_days_count: number;
  week_start_day: string;
  week_end_day: string;
}


const DepartmentWorkingDays = () => {
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<Partial<WorkingDay>>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkingDays();
    fetchAllShifts();
    fetchAllDepartments();
  }, []);

  const fetchAllDepartments = async () => {
    try {
      const response = await axiosInstance.get("/departments/");
      setAllDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchWorkingDays = async () => {
    try {
      const response = await axiosInstance.get("/department-working-days/");
      setWorkingDays(response.data);
      // Log the received data for debugging
      console.log("Fetched working days:", response.data);
    } catch (error) {
      console.error("Error fetching working days:", error);
    }
  };

  const fetchAllShifts = async () => {
    try {
      const response = await axiosInstance.get("/shift-policies/");
      setAllShifts(response.data);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const startEdit = (item: WorkingDay) => {
    setEditId(item.id);
    setEditItem({ ...item });
  };

  const handleEditChange = (field: keyof WorkingDay, value: unknown) => {
    setEditItem((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = async (id: number) => {
    try {
      await axiosInstance.put(`/department-working-days/${id}/`, editItem);
      setEditId(null);
      setEditItem({});
      fetchWorkingDays();
    } catch {
      setError("Failed to update working day.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axiosInstance.delete(`/department-working-days/${id}/`);
      setWorkingDays((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Failed to delete working day.");
    }
  };

  const handleAdd = () => {
    navigate("/form-department-working");
  };

  const addItem = async () => {
    try {
      await axiosInstance.post(`/department-working-days/`, editItem);
      setAdding(false);
      setEditId(null);
      setEditItem({});
      fetchWorkingDays();
    } catch {
      setError("Failed to add working day.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Department-wise Working Days</h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={handleAdd}
        >
          <FaPlus /> Add
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adding && (
          <div className="shadow-lg bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="p-6 space-y-3">
              <input
                type="text"
                placeholder="Department Name"
                value={editItem.department?.department_name || ""}
                onChange={e => handleEditChange("department", { ...editItem.department, department_name: e.target.value })}
                className="border rounded px-2 py-1 w-full mb-2"
              />
              {/* Shift selection for add */}
              <label className="block text-sm font-medium mb-1">Shift</label>
              <select
                className="border rounded px-2 py-1 w-full mb-2"
                value={Array.isArray(editItem.shifts) && editItem.shifts.length > 0 ? (typeof editItem.shifts[0] === "object" ? editItem.shifts[0].id : editItem.shifts[0]) : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "") {
                    handleEditChange("shifts", []);
                  } else {
                    handleEditChange("shifts", [Number(val)]);
                  }
                }}
              >
                <option value="">All Shifts</option>
                {allShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>
                    {shift.shift_type} ({shift.checkin} - {shift.checkout})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Working Days Count"
                value={editItem.working_days_count || 0}
                onChange={e => handleEditChange("working_days_count", Number(e.target.value))}
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <input
                type="text"
                placeholder="Week Start Day"
                value={editItem.week_start_day || ""}
                onChange={e => handleEditChange("week_start_day", e.target.value)}
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <input
                type="text"
                placeholder="Week End Day"
                value={editItem.week_end_day || ""}
                onChange={e => handleEditChange("week_end_day", e.target.value)}
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <div className="flex gap-2 justify-end">
                <button className="text-green-600 hover:text-green-800" title="Save" onClick={addItem}>
                  <FaEdit />
                </button>
                <button className="text-gray-500 hover:text-gray-700" title="Cancel" onClick={() => { setAdding(false); setEditId(null); setEditItem({}); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {workingDays.map((item) => (
          <div key={item.id} className="shadow-lg bg-white rounded-xl border border-gray-200 hover:shadow-2xl transition-shadow duration-200">
            <div className="p-6 space-y-3">
              {editId === item.id ? (
                <>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    className="border rounded px-2 py-1 w-full mb-2"
                    value={editItem.department?.id || ''}
                    onChange={e => {
                      const selectedDept = allDepartments.find(d => d.id === Number(e.target.value));
                      handleEditChange("department", selectedDept || null);
                    }}
                  >
                    <option value="">Select Department</option>
                    {allDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium mb-1">Shift</label>
                  <select
                    className="border rounded px-2 py-1 w-full mb-2 bg-white"
                    value={Array.isArray(editItem.shifts) && editItem.shifts.length > 0 ? (typeof editItem.shifts[0] === "object" ? editItem.shifts[0].id : editItem.shifts[0]) : ""}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "") {
                        handleEditChange("shifts", []);
                      } else {
                        handleEditChange("shifts", [Number(val)]);
                      }
                    }}
                  >
                    <option value="">All Shifts</option>
                    {allShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {shift.shift_type} ({shift.checkin} - {shift.checkout})
                      </option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium mb-1">Working Days Count</label>
                  <input
                    type="number"
                    value={editItem.working_days_count || 0}
                    onChange={e => handleEditChange("working_days_count", Number(e.target.value))}
                    className="border rounded px-2 py-1 w-full mb-2"
                  />
                  <label className="block text-sm font-medium mb-1">Week Start Day</label>
                  <input
                    type="text"
                    value={editItem.week_start_day || ""}
                    onChange={e => handleEditChange("week_start_day", e.target.value)}
                    className="border rounded px-2 py-1 w-full mb-2"
                  />
                  <label className="block text-sm font-medium mb-1">Week End Day</label>
                  <input
                    type="text"
                    value={editItem.week_end_day || ""}
                    onChange={e => handleEditChange("week_end_day", e.target.value)}
                    className="border rounded px-2 py-1 w-full mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <button className="text-green-600 hover:text-green-800" title="Save" onClick={() => updateItem(item.id)}>
                      <FaEdit />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700" title="Cancel" onClick={() => { setEditId(null); setEditItem({}); }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-blue-900 flex-1 truncate">{item.department?.department_name}</h3>
                  </div>
                  <div className="mb-2">
                    <div className="font-semibold text-gray-700 mb-1">Shifts:</div>
                    {Array.isArray(item.shifts) && item.shifts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.shifts.map((shift) => {
                          if (typeof shift === "object" && shift !== null && "shift_type" in shift) {
                            return (
                              <span key={shift.id} className="inline-block bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                                {shift.shift_type} <span className="text-gray-500">({shift.checkin} - {shift.checkout})</span>
                              </span>
                            );
                          } else {
                            const shiftId = typeof shift === "number" ? shift : Number(shift);
                            const found = allShifts.find(s => s.id === shiftId);
                            return found ? (
                              <span key={found.id} className="inline-block bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                                {found.shift_type} <span className="text-gray-500">({found.checkin} - {found.checkout})</span>
                              </span>
                            ) : (
                              <span key={String(shift)} className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full border border-gray-200">-</span>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full border border-gray-200">All Shifts</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="light">Working Days: {item.working_days_count}</Badge>
                    <Badge variant="light">Start: {item.week_start_day}</Badge>
                    <Badge variant="light">End: {item.week_end_day}</Badge>
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <button className="text-blue-600 hover:text-blue-800" title="Edit" onClick={() => startEdit(item)}>
                      <FaEdit />
                    </button>
                    <button className="text-red-600 hover:text-red-800" title="Delete" onClick={() => handleDelete(item.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentWorkingDays;
