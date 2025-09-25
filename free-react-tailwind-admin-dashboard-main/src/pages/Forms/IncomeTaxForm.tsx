
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

const IncomeTaxForm: React.FC = () => {
  const [name, setName] = useState("");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !salaryFrom || !salaryTo || !taxPercent) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("app/income-tax-configs/", {
        name,
        salary_from: salaryFrom,
        salary_to: salaryTo,
        tax_percent: taxPercent,
      });
      navigate("/income-tax");
    } catch (err: unknown) {
      type AxiosErrorType = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorType;
      setError(errorObj.response?.data?.detail || "Failed to add income tax config.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mt-8">
      <h2 className="text-2xl font-bold mb-6">Add Income Tax Configuration</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Salary From</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={salaryFrom}
            onChange={e => setSalaryFrom(e.target.value)}
            required
            min="0"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Salary To</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={salaryTo}
            onChange={e => setSalaryTo(e.target.value)}
            required
            min="0"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Tax %</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={taxPercent}
            onChange={e => setTaxPercent(e.target.value)}
            required
            min="0"
            max="100"
            step="0.01"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
            onClick={() => navigate("/admin/income-tax")}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncomeTaxForm;
