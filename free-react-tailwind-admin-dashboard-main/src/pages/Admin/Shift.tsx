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

  const renderTimeInput = (label: string, h: string, m: string, s: string, prefix: string) => (
    <div className="mb-2">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-1">
        <input
          type="text"
          value={h}
          onChange={(e) => handleEditChange(`${prefix}_h` as keyof EditShiftState, e.target.value)}
          placeholder="HH"
          className="w-12 border rounded px-1 py-1"
        />
        <span>:</span>
        <input
          type="text"
          value={m}
          onChange={(e) => handleEditChange(`${prefix}_m` as keyof EditShiftState, e.target.value)}
          placeholder="MM"
          className="w-12 border rounded px-1 py-1"
        />
        <span>:</span>
        <input
          type="text"
          value={s}
          onChange={(e) => handleEditChange(`${prefix}_s` as keyof EditShiftState, e.target.value)}
          placeholder="SS"
          className="w-12 border rounded px-1 py-1"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <ComponentCard title={`Shift Policies (${shifts.length} total)`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
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
                        onChange={(e) => handleEditChange("shift_type", e.target.value)}
                        className="text-xl font-semibold border rounded px-2 py-1 w-full mb-2"
                        placeholder="Shift Type"
                      />
                      {renderTimeInput("Check-in", editShift.checkin_h || "", editShift.checkin_m || "", editShift.checkin_s || "", "checkin")}
                      {renderTimeInput("Check-out", editShift.checkout_h || "", editShift.checkout_m || "", editShift.checkout_s || "", "checkout")}
                      {renderTimeInput("Grace Period", editShift.grace_h || "", editShift.grace_m || "", editShift.grace_s || "", "grace")}
                      {renderTimeInput("Half Day", editShift.half_h || "", editShift.half_m || "", editShift.half_s || "", "half")}
                      {renderTimeInput("Full Day", editShift.full_h || "", editShift.full_m || "", editShift.full_s || "", "full")}
                      <div className="flex gap-2 justify-end mt-2">
                        <button className="text-green-600 hover:text-green-800" title="Save" onClick={() => updateShift(shift.id)}>
                          {/* <FaEdit /> */}Save 
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
                      <div className="mb-2"><span className="font-semibold text-gray-700">Check-in:</span> {shift.checkin}</div>
                      <div className="mb-2"><span className="font-semibold text-gray-700">Check-out:</span> {shift.checkout}</div>
                      <div className="mb-2"><span className="font-semibold text-gray-700">Grace Period:</span> {shift.grace_period}</div>
                      <div className="mb-2"><span className="font-semibold text-gray-700">Half Day:</span> {shift.half_day}</div>
                      <div className="mb-2"><span className="font-semibold text-gray-700">Full Day:</span> {shift.full_day}</div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-40">
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
      </ComponentCard>
    </div>
  );
};

export default ShiftPolicyList;
