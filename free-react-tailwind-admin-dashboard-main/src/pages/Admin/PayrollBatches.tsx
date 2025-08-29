import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate, Link } from "react-router-dom";

interface PayrollBatch {
  id: number;
  month: number;
  year: number;
  status: "Draft" | "Locked";
  company: number;
}

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PayrollBatches: React.FC = () => {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await axiosInstance.get("/payroll-batches/");
      setBatches(response.data);
    } catch (error) {
      console.error("Error fetching payroll batches:", error);
    }
  };

  const handleViewBatch = async (batchId: number) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setPayrolls([]);
    try {
      // Fetch batch details
      const batchRes = await axiosInstance.get(`/payroll-batches/${batchId}/`);
      setSelectedBatch(batchRes.data);
      // Fetch payrolls for batch
      const payrollRes = await axiosInstance.get(`/payrolls/?batch_id=${batchId}`);
      setPayrolls(payrollRes.data);
    } catch (err: any) {
      setModalError("Failed to fetch payroll batch or payrolls");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedBatch(null);
    setPayrolls([]);
    navigate("/admin/payroll-batches");
  };

  return (
    <div className="p-6">
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Payroll Batches</h2>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
            onClick={() => navigate('/admin/generate-payroll')}
          >
            Generate Payroll
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Si.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batches.length > 0 ? (
                batches.map((batch, idx) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{monthNames[batch.month]}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{batch.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-white text-sm ${
                          batch.status === "Locked" ? "bg-green-600" : "bg-yellow-500"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800"
                        title="View Payroll Batch"
                        onClick={() => handleViewBatch(batch.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No payroll batch records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for finalized payroll */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative">
            <h2 className="text-xl font-bold mb-2">Payroll Batch Details</h2>
            {modalLoading && <div className="mb-4 text-gray-500">Loading...</div>}
            {modalError && <div className="mb-4 text-red-500">{modalError}</div>}
            {selectedBatch && (
              <>
                <div className="mb-2 text-green-600 font-semibold">{selectedBatch.status}</div>
                <div className="mb-2">Batch ID: <span className="font-mono">{selectedBatch.batch_id}</span></div>
                {selectedBatch.month && selectedBatch.year && (
                  <div className="mb-2">Month: <span className="font-mono">{selectedBatch.month}</span> Year: <span className="font-mono">{selectedBatch.year}</span></div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payslip</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HRA</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conveyance</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medical</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Special</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Charges</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Other Allowances</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PF</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Other Deductions</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payrolls.length > 0 ? (
                        payrolls.map((pay: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">{idx + 1}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <Link
                                to={`/admin/payslip?employeeId=${pay.employee_id || (pay.employee && pay.employee.id) || pay.employee}&batchId=${selectedBatch.id}`}
                                className="bg-gray-200 hover:bg-gray-300 text-xs px-2 py-1 rounded"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </Link>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">{pay.employee_name || pay.employee?.name || pay.employee}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.basic_salary}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.hra}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.conveyance}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.medical}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.special_allowance}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.service_charges}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.extra_allowances ?? 0}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.pf}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.extra_deductions ?? 0}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.gross_salary}</td>
                            <td className="px-4 py-2 whitespace-nowrap">₹{pay.net_pay}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{pay.created_at ? new Date(pay.created_at).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={14} className="px-4 py-2 text-center text-gray-500">No payrolls found for this batch.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex gap-4 mt-6 justify-end">
              <button
                type="button"
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded shadow"
                onClick={handleCloseModal}
                disabled={modalLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollBatches;
