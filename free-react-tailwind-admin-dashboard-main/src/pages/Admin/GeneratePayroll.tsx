import React, { useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";

interface PayrollResult {
  status: string;
  batch_id: number;
  payrolls: any[];
}

const GeneratePayroll: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchStatus, setBatchStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);

  // 🔹 Trigger payroll generation
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await axiosInstance.post("/generate-payroll/");
      setPreview(res.data.payroll_preview || []);
      setBatchId(res.data.batch_id);
      setBatchStatus(res.data.batch_status);
    } catch (err: any) {
      let message = "Failed to generate payroll";
      if (err.response?.data?.error) {
        message += ": " + err.response.data.error;
      } else if (err.message) {
        message += ": " + err.message;
      }
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  // 🔒 Lock payroll batch
  const handleLock = async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.post(`/payroll-batches/${batchId}/finalize/`);
      setFinalized(true);
      setBatchStatus("Locked");
    } catch (err: any) {
      let message = "Failed to lock payroll batch";
      if (err.response?.data?.error) {
        message += ": " + err.response.data.error;
      } else if (err.message) {
        message += ": " + err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = "/admin/payroll-batches";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Generate Payroll</h2>

        {error && <div className="mb-4 text-red-500">{error}</div>}

        {!batchId && (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Payroll"}
          </button>
        )}

        {batchId && (
          <>
            <div className="mt-2">
              <div className="text-green-600 font-semibold mb-2">
                Status: {batchStatus}
              </div>
              <div className="mb-2">
                Batch ID: <span className="font-mono">{batchId}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "#",
                        "Slip",
                        "Employee",
                        "Basic",
                        "HRA",
                        "Conveyance",
                        "Medical",
                        "Special",
                        "Service",
                        "Extra Allow.",
                        "PF",
                        "Extra Deduct.",
                        "Gross",
                        "Net Pay",
                        "Date",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 text-left font-medium text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.map((pay, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                        <Link
                          to={`/admin/payslip?employeeId=${pay.employee_id || pay.employee}&batchId=${batchId}`}
                          className="bg-gray-200 hover:bg-gray-300 text-xs px-2 py-1 rounded"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Slip
                        </Link>
                        </td>
                        <td className="px-4 py-2">{pay.employee_name || pay.employee}</td>
                        <td className="px-4 py-2">₹{pay.basic_salary}</td>
                        <td className="px-4 py-2">₹{pay.hra}</td>
                        <td className="px-4 py-2">₹{pay.conveyance}</td>
                        <td className="px-4 py-2">₹{pay.medical}</td>
                        <td className="px-4 py-2">₹{pay.special_allowance}</td>
                        <td className="px-4 py-2">₹{pay.service_charges}</td>
                        <td className="px-4 py-2">₹{pay.extra_allowances ?? 0}</td>
                        <td className="px-4 py-2">₹{pay.pf}</td>
                        <td className="px-4 py-2">₹{pay.extra_deductions ?? 0}</td>
                        <td className="px-4 py-2">₹{pay.gross_salary}</td>
                        <td className="px-4 py-2">₹{pay.net_pay}</td>
                        <td className="px-4 py-2">
                          {pay.created_at ? new Date(pay.created_at).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  className={`$${
                    batchStatus === "Locked"
                      ? "bg-gray-400"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white font-semibold py-2 px-4 rounded shadow`}
                  onClick={handleLock}
                  disabled={loading || batchStatus === "Locked" || finalized}
                >
                  {loading
                    ? "Locking..."
                    : batchStatus === "Locked" || finalized
                    ? "Locked"
                    : "Lock Payroll"}
                </button>

                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
              {finalized && (
                <div className="mt-4 text-green-600 font-semibold">✅ Payroll batch finalized!</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneratePayroll;
