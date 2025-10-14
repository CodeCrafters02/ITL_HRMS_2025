import React, { useState, useEffect } from "react";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface LeaveLog {
  id: number;
  employee_name: string;
  manager_name: string;
  leave_type: string;
  status: string;
  reason: string;
  from_date: string;
  to_date: string;
}

const RejectedLeave: React.FC = () => {
  const [leaveLogs, setLeaveLogs] = useState<LeaveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaveLogs = async () => {
      try {
        const res = await axiosInstance.get("app/rejected-leaves/");
        setLeaveLogs(res.data);
      } catch (err: unknown) {
        console.error(err);
        let message = "Failed to fetch leave data";
        if (typeof err === "object" && err !== null) {
          const errorObj = err as AxiosError;
          if (errorObj.response && errorObj.response.data) {
            const data = errorObj.response.data;
            if (typeof data === "object" && data !== null && "detail" in data) {
              message += ": " + String((data as Record<string, unknown>).detail);
            } else if (typeof data === "string") {
              message += ": " + data;
            }
          } else if ("message" in errorObj && typeof errorObj.message === "string") {
            message += ": " + errorObj.message;
          }
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveLogs();
  }, []);

  if (loading)
    return <div className="text-center py-8 text-gray-700 dark:text-gray-300">Loading...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
  <div className="p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 pl-5">
        Rejected Leaves
  </h2>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] m-5">
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Employee
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Manager
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Leave Type
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                From Date
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                To Date
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Reason
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {leaveLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                  No rejected leave records found
                </TableCell>
              </TableRow>
            ) : (
              leaveLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">{log.employee_name}</TableCell>
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">{log.manager_name}</TableCell>
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">{log.leave_type}</TableCell>
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                    {new Date(log.from_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">
                    {new Date(log.to_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start dark:text-gray-400">{log.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </div>
  );
};

export default RejectedLeave;
