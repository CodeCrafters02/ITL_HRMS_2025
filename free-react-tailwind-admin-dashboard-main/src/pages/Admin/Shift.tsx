import { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
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

interface EditShiftState {
  shift_type?: string;
  checkin_h?: string;
  checkin_m?: string;
  checkin_s?: string;
  checkout_h?: string;
  checkout_m?: string;
  checkout_s?: string;
  grace_h?: string;
  grace_m?: string;
  grace_s?: string;
  half_h?: string;
  half_m?: string;
  half_s?: string;
  full_h?: string;
  full_m?: string;
  full_s?: string;
}

const ShiftPolicyList = () => {
  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editShift, setEditShift] = useState<EditShiftState>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("app/shift-policies/")
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
    const parseTime = (time: string) => {
      const [h, m, s] = time.split(":");
      return [h || "00", m || "00", s || "00"];
    };
    const [ch, cm, cs] = parseTime(shift.checkin);
    const [coh, com, cos] = parseTime(shift.checkout);
    const [gh, gm, gs] = parseTime(shift.grace_period);
    const [hh, hm, hs] = parseTime(shift.half_day);
    const [fh, fm, fs] = parseTime(shift.full_day);

    setEditShift({
      shift_type: shift.shift_type,
      checkin_h: ch,
      checkin_m: cm,
      checkin_s: cs,
      checkout_h: coh,
      checkout_m: com,
      checkout_s: cos,
      grace_h: gh,
      grace_m: gm,
      grace_s: gs,
      half_h: hh,
      half_m: hm,
      half_s: hs,
      full_h: fh,
      full_m: fm,
      full_s: fs,
    });
  };

  const handleEditChange = (field: keyof EditShiftState, value: string) => {
    setEditShift((prev) => ({ ...prev, [field]: value }));
  };

  const timeToString = (h?: string, m?: string, s?: string) => {
    const hh = h?.padStart(2, "0") || "00";
    const mm = m?.padStart(2, "0") || "00";
    const ss = s?.padStart(2, "0") || "00";
    return `${hh}:${mm}:${ss}`;
  };

  const updateShift = async (id: number) => {
    setLoading(true);
    try {
      const payload = {
        shift_type: editShift.shift_type,
        checkin: timeToString(editShift.checkin_h, editShift.checkin_m, editShift.checkin_s),
        checkout: timeToString(editShift.checkout_h, editShift.checkout_m, editShift.checkout_s),
        grace_period: timeToString(editShift.grace_h, editShift.grace_m, editShift.grace_s),
        half_day: timeToString(editShift.half_h, editShift.half_m, editShift.half_s),
        full_day: timeToString(editShift.full_h, editShift.full_m, editShift.full_s),
      };
      await axiosInstance.put(`app/shift-policies/${id}/`, payload);
      setEditId(null);
      setEditShift({});
      const res = await axiosInstance.get("app/shift-policies/");
      setShifts(res.data);
    } catch {
      toast.error("Failed to update shift policy", { position: "bottom-right" });
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
      await axiosInstance.delete(`app/shift-policies/${deleteId}/`);
      setShifts((prev) => prev.filter((shift) => shift.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete", { position: "bottom-right" });
    }
    setLoading(false);
  };

  // Generate hours options (0-23)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // Generate minutes/seconds options (0-59)
  const minutesOptions = Array.from({ length: 60 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  const renderTimeInput = (label: string, h: string, m: string, s: string, prefix: string) => (
    <div className="mb-2">
      <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
      <div className="flex gap-1 items-center">
        <select
          value={h}
          onChange={(e) => handleEditChange(`${prefix}_h` as keyof EditShiftState, e.target.value)}
          className="w-16 border dark:border-gray-600 rounded px-1 py-1 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {hoursOptions.map(hour => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
        <span className="text-gray-500 dark:text-gray-400">:</span>
        <select
          value={m}
          onChange={(e) => handleEditChange(`${prefix}_m` as keyof EditShiftState, e.target.value)}
          className="w-16 border dark:border-gray-600 rounded px-1 py-1 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {minutesOptions.map(min => (
            <option key={min} value={min}>{min}</option>
          ))}
        </select>
        <span className="text-gray-500 dark:text-gray-400">:</span>
        <select
          value={s}
          onChange={(e) => handleEditChange(`${prefix}_s` as keyof EditShiftState, e.target.value)}
          className="w-16 border dark:border-gray-600 rounded px-1 py-1 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {minutesOptions.map(sec => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <ComponentCard title={`Shift Policies (${shifts.length} total)`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-gray-400">
            <span className="text-black  dark:text-white">🕒</span>
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
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : shifts.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No shift policies available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map((shift) => (
              <div key={shift.id} className="shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-200 bg-white dark:bg-gray-800">
                <div className="p-6 space-y-3">
                  {editId === shift.id ? (
                    <>
                      <input
                        type="text"
                        value={editShift.shift_type || ""}
                        onChange={(e) => handleEditChange("shift_type", e.target.value)}
                        className="text-xl font-semibold border dark:border-gray-600 rounded px-2 py-1 w-full mb-2 dark:bg-gray-700 dark:text-white"
                        placeholder="Shift Type"
                      />
                      {renderTimeInput("Check-in", editShift.checkin_h || "", editShift.checkin_m || "", editShift.checkin_s || "", "checkin")}
                      {renderTimeInput("Check-out", editShift.checkout_h || "", editShift.checkout_m || "", editShift.checkout_s || "", "checkout")}
                      {renderTimeInput("Grace Period", editShift.grace_h || "", editShift.grace_m || "", editShift.grace_s || "", "grace")}
                      {renderTimeInput("Half Day", editShift.half_h || "", editShift.half_m || "", editShift.half_s || "", "half")}
                      {renderTimeInput("Full Day", editShift.full_h || "", editShift.full_m || "", editShift.full_s || "", "full")}
                      <div className="flex gap-2 justify-end mt-2">
                        <button className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300" title="Save" onClick={() => updateShift(shift.id)}>
                          {/* <FaEdit /> */}Save 
                        </button>
                        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" title="Cancel" onClick={() => { setEditId(null); setEditShift({}); }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 flex-1 truncate">{shift.shift_type} Shift</h3>
                      </div>
                      <div className="mb-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Check-in:</span> <span className="dark:text-gray-400">{shift.checkin}</span></div>
                      <div className="mb-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Check-out:</span> <span className="dark:text-gray-400">{shift.checkout}</span></div>
                      <div className="mb-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Grace Period:</span> <span className="dark:text-gray-400">{shift.grace_period}</span></div>
                      <div className="mb-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Half Day:</span> <span className="dark:text-gray-400">{shift.half_day}</span></div>
                      <div className="mb-2"><span className="font-semibold text-gray-700 dark:text-gray-300">Full Day:</span> <span className="dark:text-gray-400">{shift.full_day}</span></div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Edit" onClick={() => startEdit(shift)}>
                          <FaEdit />
                        </button>
                        <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Delete" onClick={() => handleDeleteClick(shift.id, shift.shift_type)}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete this shift policy <span className="font-semibold dark:text-white">{deleteName}</span>?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default ShiftPolicyList;
