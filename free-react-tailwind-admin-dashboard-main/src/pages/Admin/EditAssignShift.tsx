import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

interface ShiftPolicy {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
}

const EditAssignShift: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const navigate = useNavigate();

  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [selectedShift, setSelectedShift] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const shiftRes = await axiosInstance.get<ShiftPolicy[]>("app/shift-policies/");
        setShifts(shiftRes.data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch shifts");
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, []);

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
          <h1 className="text-xl font-semibold mb-4 text-center">Select Shift</h1>

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
