import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";

interface ShiftPolicy {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
  grace_period: string;
  half_day: string;
  full_day: string;
}

const ShiftPolicyList = () => {
  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editShift, setEditShift] = useState<Partial<ShiftPolicy>>({});
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("/shift-policies/")
      .then((response) => {
        setShifts(response.data);
      })
      .catch((error) => {
        console.error("Error fetching shift policies:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const startEdit = (shift: ShiftPolicy) => {
    setEditId(shift.id);
    setEditShift({ ...shift });
  };

  const handleEditChange = (field: keyof ShiftPolicy, value: string) => {
    setEditShift((prev) => ({ ...prev, [field]: value }));
  };

  const updateShift = async (id: number) => {
    setLoading(true);
    try {
      await axiosInstance.put(`/shift-policies/${id}/`, editShift);
      setEditId(null);
      setEditShift({});
      // Refresh list
      const res = await axiosInstance.get("/shift-policies/");
      setShifts(res.data);
    } catch {
      alert("Failed to update shift policy.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this shift policy?")) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`/shift-policies/${id}/`);
      setShifts((prev) => prev.filter((shift) => shift.id !== id));
    } catch {
      alert("Failed to delete shift policy.");
    }
    setLoading(false);
  };

  // Helper to format seconds to HH:mm:ss
  function formatTimeString(time: string) {
    if (!time) return "00:00:00";
    // If already in HH:mm:ss, return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
    // If only seconds, convert
    const sec = parseInt(time, 10);
    if (!isNaN(sec)) {
      const h = Math.floor(sec / 3600).toString().padStart(2, "0");
      const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${h}:${m}:${s}`;
    }
    return time;
  }
  // Helper to parse HH:mm:ss to string
  function parseTimeString(val: string) {
    // Accepts HH:mm:ss or HH:mm
    if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val;
    if (/^\d{2}:\d{2}$/.test(val)) return val + ":00";
    return val;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">🕒</span>
          Shift Policies
        </h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={() => navigate("/form-shift-config")}
        >
          + Add Shift Policy
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : shifts.length === 0 ? (
        <div className="text-gray-500">No shift policies available.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="shadow-md hover:shadow-lg transition bg-white rounded-lg">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  {editId === shift.id ? (
                    <input
                      type="text"
                      value={editShift.shift_type || ""}
                      onChange={e => handleEditChange("shift_type", e.target.value)}
                      className="text-xl font-semibold border rounded px-2 py-1 w-1/2"
                    />
                  ) : (
                    <h3 className="text-xl font-semibold">{shift.shift_type} Shift</h3>
                  )}
                  <div className="flex gap-2">
                    {editId === shift.id ? (
                      <>
                        <button
                          className="text-green-600 hover:text-green-800"
                          title="Save"
                          onClick={() => updateShift(shift.id)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          title="Cancel"
                          onClick={() => { setEditId(null); setEditShift({}); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                          onClick={() => startEdit(shift)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                          onClick={() => handleDelete(shift.id)}
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editId === shift.id ? (
                  <>
                    <p className="text-gray-600">
                      ⏰ <strong>Check-in:</strong>
                      <input
                        type="time"
                        value={editShift.checkin || ""}
                        onChange={e => handleEditChange("checkin", e.target.value)}
                        className="border rounded px-2 py-1 ml-2"
                      />
                    </p>
                    <p className="text-gray-600">
                      ⏳ <strong>Check-out:</strong>
                      <input
                        type="time"
                        value={editShift.checkout || ""}
                        onChange={e => handleEditChange("checkout", e.target.value)}
                        className="border rounded px-2 py-1 ml-2"
                      />
                    </p>
                    <p className="text-gray-600">
                      🕒 <strong>Grace Period:</strong>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.grace_period || "00:00:00")}
                        onChange={e => handleEditChange("grace_period", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 ml-2 w-28"
                      />
                    </p>
                    <p className="text-gray-600">
                      📉 <strong>Half Day:</strong>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.half_day || "00:00:00")}
                        onChange={e => handleEditChange("half_day", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 ml-2 w-28"
                      />
                    </p>
                    <p className="text-gray-600">
                      📈 <strong>Full Day:</strong>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.full_day || "00:00:00")}
                        onChange={e => handleEditChange("full_day", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 ml-2 w-28"
                      />
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600">
                      ⏰ <strong>Check-in:</strong> {shift.checkin}
                    </p>
                    <p className="text-gray-600">
                      ⏳ <strong>Check-out:</strong> {shift.checkout}
                    </p>
                    <p className="text-gray-600">
                      🕒 <strong>Grace Period:</strong> {formatTimeString(shift.grace_period) || "00:00:00"}
                    </p>
                    <p className="text-gray-600">
                      📉 <strong>Half Day:</strong> {formatTimeString(shift.half_day) || "04:00:00"}
                    </p>
                    <p className="text-gray-600">
                      📈 <strong>Full Day:</strong> {formatTimeString(shift.full_day) || "08:00:00"}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShiftPolicyList;
