import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

interface TimeFields {
  checkin_h: string;
  checkin_m: string;
  checkout_h: string;
  checkout_m: string;
  grace_h: string;
  grace_m: string;
  half_h: string;
  half_m: string;
  full_h: string;
  full_m: string;
}

const ShiftConfigForm: React.FC = () => {
  const [shiftType, setShiftType] = useState("");
  const [timeFields, setTimeFields] = useState<TimeFields>({
    checkin_h: "09",
    checkin_m: "00",
    checkout_h: "17",
    checkout_m: "00",
    grace_h: "00",
    grace_m: "15",
    half_h: "04",
    half_m: "00",
    full_h: "08",
    full_m: "00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Generate hours options (0-23)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // Generate minutes options (0-59)
  const minutesOptions = Array.from({ length: 60 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // Time input group component with dropdowns
  const TimeInputGroup: React.FC<{
    label: string;
    hourField: keyof TimeFields;
    minField: keyof TimeFields;
    helpText: string;
  }> = ({ label, hourField, minField, helpText }) => (
    <div>
      <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <select
            value={timeFields[hourField]}
            onChange={(e) => handleTimeChange(hourField, e.target.value)}
            className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {hoursOptions.map(hour => (
              <option key={hour} value={hour}>{hour}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 dark:text-gray-400">Hours</span>
        </div>
        <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>
        <div className="flex-1">
          <select
            value={timeFields[minField]}
            onChange={(e) => handleTimeChange(minField, e.target.value)}
            className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {minutesOptions.map(min => (
              <option key={min} value={min}>{min}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 dark:text-gray-400">Minutes</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helpText}</p>
    </div>
  );

  const handleTimeChange = (field: keyof TimeFields, value: string) => {
    setTimeFields(prev => ({ ...prev, [field]: value }));
  };

  const formatTime = (h: string, m: string): string => {
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!shiftType.trim()) {
      setError("Shift type is required");
      setLoading(false);
      return;
    }

    const payload = {
      shift_type: shiftType,
      checkin: formatTime(timeFields.checkin_h, timeFields.checkin_m),
      checkout: formatTime(timeFields.checkout_h, timeFields.checkout_m),
      grace_period: formatTime(timeFields.grace_h, timeFields.grace_m),
      half_day: formatTime(timeFields.half_h, timeFields.half_m),
      full_day: formatTime(timeFields.full_h, timeFields.full_m),
    };

    try {
      await axiosInstance.post("app/shift-policies/", payload);
      navigate("/admin/configuration/shift");
    } catch (err: unknown) {
      type AxiosErrorType = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorType;
      setError(
        errorObj.response?.data?.detail ||
          "Failed to add shift policy. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Shift Policy</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure working hours and policies for a new shift</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Shift Type</label>
          <input
            type="text"
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            className="border dark:border-gray-600 rounded px-3 py-2 w-full dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Morning, Evening, Night"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TimeInputGroup 
            label="Check-in Time" 
            hourField="checkin_h" 
            minField="checkin_m"
            helpText="Employee's shift start time"
          />
          <TimeInputGroup 
            label="Check-out Time" 
            hourField="checkout_h" 
            minField="checkout_m"
            helpText="Employee's shift end time"
          />
        </div>

        <div className="border-t dark:border-gray-600 pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Attendance Policies</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TimeInputGroup 
              label="Grace Period" 
              hourField="grace_h" 
              minField="grace_m"
              helpText="Late arrival tolerance"
            />
            <TimeInputGroup 
              label="Half Day Hours" 
              hourField="half_h" 
              minField="half_m"
              helpText="Minimum hours for half day"
            />
            <TimeInputGroup 
              label="Full Day Hours" 
              hourField="full_h" 
              minField="full_m"
              helpText="Minimum hours for full day"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Saving..." : "Add Shift Policy"}
          </button>
          <button
            type="button"
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold px-6 py-3 rounded-lg shadow transition-colors"
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
