import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { toast } from "react-toastify";
import Label from "../../components/form/Label";
import DatePicker from "../../components/form/date-picker";

interface Props {
  id: number;
  onClose: () => void;
  onUpdated: () => void;
}

interface RecruitmentForm {
  reference_id?: string;
  name: string;
  email: string;
  address?: string;
  job_title: string;
  salary?: string;
  application_date?: string;
  interview_date?: string;
  appointment_date?: string;
  guardian_name?: string;
  status: "waiting" | "selected" | "rejected";
}

const EditRecruitment: React.FC<Props> = ({ id, onClose, onUpdated }) => {
  const [form, setForm] = useState<RecruitmentForm>({
    reference_id: "",
    name: "",
    email: "",
    address: "",
    job_title: "",
    salary: "",
    application_date: "",
    interview_date: "",
    appointment_date: "",
    guardian_name: "",
    status: "waiting",
  });
  const [loading, setLoading] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`app/recruitment/${id}/`);
      setForm(res.data);
    } catch {
      toast.error("Failed to load recruitment details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await axiosInstance.patch(`app/recruitment/${id}/`, form);
      toast.success("Recruitment updated successfully");
      onUpdated();
    } catch {
      toast.error("Failed to update recruitment");
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  return (
    <div className="fixed inset-0 bg-white/50 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-auto relative mt-24 border border-gray-200 dark:border-gray-700 transition-all duration-300">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          Edit Recruitment
        </h2>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            <Label className="dark:text-gray-300">Name</Label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Email</Label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Address</Label>
            <input
              type="text"
              name="address"
              value={form.address || ""}
              onChange={handleChange}
              placeholder="Address"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Job Title</Label>
            <input
              type="text"
              name="job_title"
              value={form.job_title}
              onChange={handleChange}
              placeholder="Job Title"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Salary</Label>
            <input
              type="text"
              name="salary"
              value={form.salary || ""}
              onChange={handleChange}
              placeholder="Salary"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Application Date</Label>
            <input
              type="date"
              name="application_date"
              value={form.application_date || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Interview Date</Label>
            <input
              type="date"
              name="interview_date"
              value={form.interview_date || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Appointment Date</Label>
            <input
              type="date"
              name="appointment_date"
              value={form.appointment_date || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Guardian Name</Label>
            <input
              type="text"
              name="guardian_name"
              value={form.guardian_name || ""}
              onChange={handleChange}
              placeholder="Guardian Name"
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <Label className="dark:text-gray-300">Status</Label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="waiting">Waiting</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white transition-colors duration-200"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRecruitment;
