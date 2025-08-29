import { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

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
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
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

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`/shift-policies/${deleteId}/`);
      setShifts((prev) => prev.filter((shift) => shift.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete", { position: "bottom-right" });
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
          onClick={() => navigate("/admin/form-shift-config")}
        >
          + Add Shift Policy
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : shifts.length === 0 ? (
        <div className="text-gray-500">No shift policies available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <div key={shift.id} className="shadow-lg rounded-xl border border-gray-200 hover:shadow-2xl transition-shadow duration-200 bg-white">
              <div className="p-6 space-y-3">
                {editId === shift.id ? (
                  <>
                    <input
                      type="text"
                      value={editShift.shift_type || ""}
                      onChange={e => handleEditChange("shift_type", e.target.value)}
                      className="text-xl font-semibold border rounded px-2 py-1 w-full mb-2"
                      placeholder="Shift Type"
                    />
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">Check-in</label>
                      <input
                        type="time"
                        value={editShift.checkin || ""}
                        onChange={e => handleEditChange("checkin", e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">Check-out</label>
                      <input
                        type="time"
                        value={editShift.checkout || ""}
                        onChange={e => handleEditChange("checkout", e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">Grace Period</label>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.grace_period || "00:00:00")}
                        onChange={e => handleEditChange("grace_period", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">Half Day</label>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.half_day || "00:00:00")}
                        onChange={e => handleEditChange("half_day", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium mb-1">Full Day</label>
                      <input
                        type="time"
                        step="1"
                        value={formatTimeString(editShift.full_day || "00:00:00")}
                        onChange={e => handleEditChange("full_day", parseTimeString(e.target.value))}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button className="text-green-600 hover:text-green-800" title="Save" onClick={() => updateShift(shift.id)}>
                        <FaEdit />
                      </button>
                      <button className="text-gray-500 hover:text-gray-700" title="Cancel" onClick={() => { setEditId(null); setEditShift({}); }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-blue-900 flex-1 truncate">{shift.shift_type} Shift</h3>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Check-in:</span> {shift.checkin}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Check-out:</span> {shift.checkout}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Grace Period:</span> {formatTimeString(shift.grace_period) || "00:00:00"}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Half Day:</span> {formatTimeString(shift.half_day) || "04:00:00"}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Full Day:</span> {formatTimeString(shift.full_day) || "08:00:00"}
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button className="text-blue-600 hover:text-blue-800" title="Edit" onClick={() => startEdit(shift)}>
                        <FaEdit />
                      </button>
                      <button className="text-red-600 hover:text-red-800" title="Delete" onClick={() => handleDeleteClick(shift.id, shift.shift_type)}>
                        <FaTrash />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Delete</h2>
            <p className="mb-6 text-gray-700">Are you sure you want to delete this department <span className="font-semibold">{deleteName}</span>?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPolicyList;
