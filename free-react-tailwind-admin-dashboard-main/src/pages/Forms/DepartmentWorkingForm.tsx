import React, { useState, useEffect } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";

interface DepartmentOption {
  id: number;
  department_name: string;
}
interface ShiftOption {
  id: number;
  shift_type: string;
}

interface DepartmentWorkingFormData {
  department: number | "";
  shift_type: string;
  working_days_count: number;
  week_start_day: string;
  week_end_day: string;
  shifts: number[];
}

interface DepartmentWorkingFormProps {
  onSubmit?: (data: DepartmentWorkingFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<DepartmentWorkingFormData>;
}

const DepartmentWorkingForm: React.FC<DepartmentWorkingFormProps> = ({ initialData }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<DepartmentWorkingFormData>({
    department: initialData?.department || "",
    shift_type: initialData?.shift_type || "all", // 'all' or 'specific'
    working_days_count: initialData?.working_days_count || 0,
    week_start_day: initialData?.week_start_day || "",
    week_end_day: initialData?.week_end_day || "",
    shifts: Array.isArray(initialData?.shifts) ? initialData.shifts! : [], // for specific shifts
  });
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch shift options from API
    const fetchShifts = async () => {
      try {
        const response = await axiosInstance.get("app/shift-policies/");
        setShifts(response.data);
      } catch {
        setShifts([]);
      }
    };
    fetchShifts();
    // Fetch department options from API
    const fetchDepartments = async () => {
      try {
        const response = await axiosInstance.get("app/departments/");
        setDepartments(response.data);
      } catch {
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === "department") {
      setForm((prev) => ({ ...prev, department: value === "" ? "" : Number(value) }));
    } else if (name === "shift_type") {
      setForm((prev) => ({ ...prev, shift_type: value, shifts: value === "all" ? [] : prev.shifts }));
    } else if (name === "shifts") {
      if (type === "checkbox" && "checked" in e.target) {
        const checked = (e.target as HTMLInputElement).checked;
        const shiftId = Number(value);
        setForm((prev) => {
          const selected = new Set(prev.shifts || []);
          if (checked) {
            selected.add(shiftId);
          } else {
            selected.delete(shiftId);
          }
          return { ...prev, shifts: Array.from(selected) };
        });
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: name === "working_days_count" ? Number(value) : value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      department: form.department,
      shifts: form.shift_type === "all" ? [] : form.shifts,
      working_days_count: form.working_days_count,
      week_start_day: form.week_start_day,
      week_end_day: form.week_end_day,
    };
    console.log("Submitting payload:", payload);
    try {
      await axiosInstance.post("app/department-working-days/", payload);
      navigate(-1); // Go back after successful submit
    } catch (error) {
      console.error("Submission error:", error);
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow-md max-w-md mx-auto">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Department</label>
        <select
          name="department"
          value={form.department}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
          required
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.department_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Shift</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="shift_type"
              value="all"
              checked={form.shift_type === "all"}
              onChange={handleChange}
            />
            All shifts
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="shift_type"
              value="specific"
              checked={form.shift_type === "specific"}
              onChange={handleChange}
            />
            Specific shift
          </label>
        </div>
        {form.shift_type === "specific" && (
          <div className="flex flex-wrap gap-2">
            {shifts.map((shift) => (
              <label key={shift.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="shifts"
                  value={shift.id}
                  checked={form.shifts?.includes(shift.id)}
                  onChange={handleChange}
                />
                {shift.shift_type}
              </label>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Working Days Count</label>
        <input
          type="number"
          name="working_days_count"
          value={form.working_days_count}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
          min={0}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Week Start Day</label>
        <input
          type="text"
          name="week_start_day"
          value={form.week_start_day}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Week End Day</label>
        <input
          type="text"
          name="week_end_day"
          value={form.week_end_day}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
        <button type="button" className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded" onClick={handleCancel} disabled={loading}>Cancel</button>
      </div>
    </form>
  );
};

export default DepartmentWorkingForm;
