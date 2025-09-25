import React, { useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";


interface Payroll {
  employee_id?: number;
  employee?: string | number;
  employee_name?: string;
  basic_salary?: number;
  hra?: number;
  conveyance?: number;
  medical?: number;
  special_allowance?: number;
  service_charges?: number;
  extra_allowances?: number;
  pf?: number;
  extra_deductions?: number;
  gross_salary?: number;
  net_pay?: number;
  created_at?: string;
}

const GeneratePayroll: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Payroll[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchStatus, setBatchStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);

  // 🔹 Trigger payroll generation
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
            const { data } = await axiosInstance.post("app/generate-payroll/");
            setPreview(data.payroll_preview || []);
            setBatchId(data.batch_id);
            setBatchStatus(data.batch_status);
    } catch (err: unknown) {
      let message = "Failed to generate payroll";
      if (typeof err === "object" && err !== null) {
        const errorObj = err as { response?: { data?: Record<string, unknown> }; message?: string };
        if (errorObj.response && errorObj.response.data && typeof errorObj.response.data.error === 'string') {
          message += ": " + errorObj.response.data.error;
        } else if (errorObj.message) {
          message += ": " + errorObj.message;
        }
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
            await axiosInstance.post(`app/payroll-batches/${batchId}/finalize/`);
      setFinalized(true);
      setBatchStatus("Locked");
    } catch (err: unknown) {
      let message = "Failed to lock payroll batch";
      if (typeof err === "object" && err !== null) {
        const errorObj = err as { response?: { data?: Record<string, unknown> }; message?: string };
        if (errorObj.response && errorObj.response.data && typeof errorObj.response.data.error === 'string') {
          message += ": " + errorObj.response.data.error;
        } else if (errorObj.message) {
          message += ": " + errorObj.message;
        }
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
                  className={
                    (loading || batchStatus === "Locked" || finalized)
                      ? "bg-gray-400 text-white font-semibold py-2 px-4 rounded shadow cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
                  }
                  onClick={handleLock}
                  disabled={loading || batchStatus === "Locked" || finalized}
                >
                  {loading
                    ? "Locking..."
                    : batchStatus === "Locked" || finalized
                    ? "Locked"
                    : "Finalize Payroll"}
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
