import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate, Link } from "react-router-dom";
import { AxiosError } from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface PayrollBatch {
  id: number;
  month: number;
  year: number;
  status: "Draft" | "Locked";
  company: number;
}

interface Payroll {
  employee_id?: number;
  employee?: { id?: number; name?: string } | string | number;
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

const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PayrollBatches: React.FC = () => {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await axiosInstance.get("app/payroll-batches/");
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
    setSendResult(null);
    try {
      const batchRes = await axiosInstance.get(`app/payroll-batches/${batchId}/`);
      setSelectedBatch(batchRes.data);
      const payrollRes = await axiosInstance.get(`app/payrolls/?batch_id=${batchId}`);
      setPayrolls(payrollRes.data);
    } catch (err: unknown) {
      let msg = "Failed to fetch payroll batch or payrolls";
      if (typeof err === "object" && err !== null) {
        const errorObj = err as AxiosError;
        if (errorObj.response?.data) {
          if (typeof errorObj.response.data === "string") msg = errorObj.response.data;
          else if (
            typeof errorObj.response.data === "object" &&
            "error" in errorObj.response.data
          )
            msg = String((errorObj.response.data as Record<string, unknown>).error);
        } else if ("message" in errorObj && typeof errorObj.message === "string") {
          msg = errorObj.message;
        }
      }
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedBatch(null);
    setPayrolls([]);
    setSendResult(null);
    navigate("/admin/payroll-batches");
  };

  return (
    <div className="p-6">
      <div className="mb-6 bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4 ">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Payroll Batches
          </h2>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow"
            onClick={() => navigate("/admin/generate-payroll")}
          >
            Generate Payroll
          </button>
        </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-[1000] m-5">
              <div className="max-w-full overflow-x-auto">          

          <Table>
              <TableRow>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">#</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Month</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Year</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Status</TableCell>
                <TableCell isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white">Actions</TableCell>
              </TableRow>

            <TableBody>
              {batches.length > 0 ? (
                batches.map((batch, idx) => (
                  <TableRow
                    key={batch.id}
                    className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white"
                  >
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{idx + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{monthNames[batch.month]}</TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{batch.year}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                          batch.status === "Locked"
                            ? "bg-green-600"
                            : "bg-yellow-500"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Payroll Batch"
                        onClick={() => handleViewBatch(batch.id)}
                      >
                        👁️
                      </button>

                      {batch.status === "Locked" && (
                        <button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-xs shadow"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedBatch(batch);
                            setSending(true);
                            setSendResult(null);
                            try {
                              await axiosInstance.post(
                                `app/payroll-batches/${batch.id}/send-payslips/`
                              );
                              setSendResult("Payslips sent to all employees!");
                            } catch (err: unknown) {
                              let msg = "Failed to send payslips";
                              const errorObj = err as AxiosError;
                              if (errorObj.response?.data) {
                                msg +=
                                  ": " +
                                  (typeof errorObj.response.data === "string"
                                    ? errorObj.response.data
                                    : JSON.stringify(errorObj.response.data));
                              }
                              setSendResult(msg);
                            } finally {
                              setSending(false);
                            }
                          }}
                          disabled={sending}
                        >
                          {sending && selectedBatch?.id === batch.id
                            ? "Sending..."
                            : "Send Payslips"}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                    No payroll batches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {sendResult && (
            <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
              {sendResult}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Modal for viewing payroll batch */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-5xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Payroll Batch Details
            </h2>

            {modalLoading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
            {modalError && <p className="text-red-600">{modalError}</p>}

            {selectedBatch && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Batch ID:</strong> {selectedBatch.id}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Month:</strong> {monthNames[selectedBatch.month]}{" "}
                    <strong>Year:</strong> {selectedBatch.year}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-[1000] m-5">
                        <div className="max-w-full overflow-x-auto">          

                  <Table>
                    <TableHeader className="bg-gray-100 dark:bg-gray-800">
                      <TableRow>
                        {[
                          "#",
                          "Payslip",
                          "Employee",
                          "Basic",
                          "HRA",
                          "Conveyance",
                          "Medical",
                          "Special",
                          "Service Charge",
                          "Allowances",
                          "PF",
                          "Deductions",
                          "Gross",
                          "Net Pay",
                          "Date",
                        ].map((head, idx) => (
                          <TableCell
                            key={idx}
                            isHeader className="px-4 py-3 border-b text-center dark:text-gray-400 dark:bg-gray-900 bg-white"
                          >
                            {head}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {payrolls.length > 0 ? (
                        payrolls.map((pay, idx) => (
                          <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">{idx + 1}</TableCell>
                            <TableCell>
                              <Link
                                to={`/admin/payslip?employeeId=${
                                  pay.employee_id ||
                                  (typeof pay.employee === "object" &&
                                  pay.employee !== null &&
                                  "id" in pay.employee
                                    ? pay.employee.id
                                    : pay.employee)
                                }&batchId=${selectedBatch.id}`}
                                target="_blank"
                                className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white"
                              >
                                View
                              </Link>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">
                              {  pay.employee_name ? pay.employee_name :
                              (typeof pay.employee === 'object' && pay.employee !== null && 'name' in pay.employee && typeof pay.employee.name === 'string') ? pay.employee.name :
                              (typeof pay.employee === 'string' || typeof pay.employee === 'number') ? pay.employee : ''}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.basic_salary}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.hra}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.conveyance}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.medical}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.special_allowance}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.service_charges}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.extra_allowances ?? 0}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.pf}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.extra_deductions ?? 0}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.gross_salary}</TableCell>
                            <TableCell className="px-4 py-3 text-center dark:text-gray-400 dark:bg-gray-900 bg-white">₹{pay.net_pay}</TableCell>
                            <TableCell>
                              {pay.created_at
                                ? new Date(pay.created_at).toLocaleDateString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={15}
                            className="text-center text-gray-500 dark:text-gray-400 py-4"
                          >
                            No payrolls found for this batch.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                </div>
              </>
            )}

            <div className="flex justify-end mt-6">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg"
                onClick={handleCloseModal}
                disabled={modalLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollBatches;
