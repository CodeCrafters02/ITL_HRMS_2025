import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

// Helper to format seconds to HH:mm:ss
function formatTimeString(time: string) {
  if (!time) return "00:00:00";
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  const sec = parseInt(time, 10);
  if (!isNaN(sec)) {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return time;
}
function parseTimeString(val: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val;
  if (/^\d{2}:\d{2}$/.test(val)) return val + ":00";
  return val;
}

const ShiftConfigForm: React.FC = () => {
  const [form, setForm] = useState({
    shift_type: "",
    checkin: "",
    checkout: "",
    grace_period: "",
    half_day: "",
    full_day: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (["grace_period", "half_day", "full_day", "checkin", "checkout"].includes(name) && type === "time") {
      setForm({ ...form, [name]: parseTimeString(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axiosInstance.post("/shift-policies/", form);
      navigate("/admin/configuration/shift"); // Adjust path as needed
    } catch (err: unknown) {
      type AxiosErrorType = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorType;
      setError(errorObj.response?.data?.detail || "Failed to add shift policy. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add Shift Policy</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <div>
          <label className="block font-medium mb-1">Shift Type</label>
          <input
            type="text"
            name="shift_type"
            value={form.shift_type}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Check-in</label>
          <input
            type="time"
            step="1"
            name="checkin"
            value={formatTimeString(form.checkin)}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Check-out</label>
          <input
            type="time"
            step="1"
            name="checkout"
            value={formatTimeString(form.checkout)}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Grace Period (hh:mm:ss)</label>
          <input
            type="time"
            step="1"
            name="grace_period"
            value={formatTimeString(form.grace_period)}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Half Day (hh:mm:ss)</label>
          <input
            type="time"
            step="1"
            name="half_day"
            value={formatTimeString(form.half_day)}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Full Day (hh:mm:ss)</label>
          <input
            type="time"
            step="1"
            name="full_day"
            value={formatTimeString(form.full_day)}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded w-full"
            disabled={loading}
          >
            {loading ? "Saving..." : "Add Shift Policy"}
          </button>
          <button
            type="button"
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded w-full"
            onClick={() => navigate("/admin/configuration/shift")}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShiftConfigForm;
