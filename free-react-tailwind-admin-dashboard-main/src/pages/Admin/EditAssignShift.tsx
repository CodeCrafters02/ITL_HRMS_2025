import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

interface ShiftPolicy {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
}

interface EmployeeData {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  shift_assigned?: ShiftPolicy | null;
}

const EditAssignShift: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const navigate = useNavigate();

  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [selectedShift, setSelectedShift] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shiftRes, empRes] = await Promise.all([
          axiosInstance.get<ShiftPolicy[]>("app/shift-policies/"),
          axiosInstance.get<EmployeeData>(`app/employee/${employeeId}/`),
        ]);

        setShifts(shiftRes.data);
        setEmployee(empRes.data);

        // Pre-fill the selected shift with the employee's current assignment
        if (empRes.data.shift_assigned) {
          setSelectedShift(empRes.data.shift_assigned.id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  const handleSave = async () => {
    if (!selectedShift) {
      alert("Select a shift first");
      return;
    }

    try {
      await axiosInstance.post("app/assignshift/", {
        employee_id: employeeId,
        shift_id: selectedShift,
      });
      alert("Shift updated successfully!");
      navigate("/admin/assignshifts");
    } catch (err: any) {
      alert(err.message || "Failed to update shift");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        {/* Modal box */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-96 shadow-lg">
          <h1 className="text-xl font-semibold mb-4 text-center">Edit Shift Assignment</h1>

          {employee && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium dark:text-white">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Employee ID: {employee.employee_id}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Current Shift: {employee.shift_assigned
                  ? `${employee.shift_assigned.shift_type} (${employee.shift_assigned.checkin} - ${employee.shift_assigned.checkout})`
                  : "No Shift Assigned"}
              </p>
            </div>
          )}

          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(Number(e.target.value))}
            className="border rounded px-3 py-2 w-full mb-4"
          >
            <option value="">-- Select Shift --</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.shift_type} ({shift.checkin} - {shift.checkout})
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate("/admin/assignshifts")}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditAssignShift;
