import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { EmployeeData } from "./api";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import PageMeta from "../../components/common/PageMeta";
import { FiEdit } from "react-icons/fi";

interface ShiftPolicy {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
}

const AssignShift: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedShifts, setSelectedShifts] = useState<{ [key: number]: number }>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Rows per page
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([
          axiosInstance.get<EmployeeData[]>("app/employee/"),
          axiosInstance.get<ShiftPolicy[]>("app/shift-policies/"),
        ]);

        setEmployees(empRes.data);
        setShifts(shiftRes.data);

        const initialShifts: { [key: number]: number } = {};
        empRes.data.forEach((emp) => {
          if (emp.shift_assigned) initialShifts[emp.id] = emp.shift_assigned.id;
        });
        setSelectedShifts(initialShifts);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employee_id.toString().includes(searchTerm)
      ),
    [employees, searchTerm]
  );

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const handleShiftChange = (employeeId: number, shiftId: number) => {
    setSelectedShifts((prev) => ({ ...prev, [employeeId]: shiftId }));
  };

  const handleAssignShift = async (employeeId: number) => {
    const shiftId = selectedShifts[employeeId];
    if (!shiftId) {
      alert("Select a shift first");
      return;
    }
    try {
      await axiosInstance.post("app/assignshift/", {
        employee_id: employeeId,
        shift_id: shiftId,
      });
      alert("Shift assigned successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to assign shift");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  return (
    <>
      <PageMeta title="Assign Shifts | HRMS" description="Assign shifts to employees" />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-[1000] m-5">
        <div className="flex justify-between items-center p-4 flex-wrap gap-2">
          <h1 className="text-xl font-semibold">Assign Shift 👋</h1>
          <input
            type="text"
            placeholder="Search by name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-1"
          />
          <div>
            Rows per page:{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // Reset page when page size changes
              }}
              className="border rounded px-2 py-1"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell                   isHeader

                                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">#</TableCell>
                <TableCell                  isHeader

                                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Employee ID</TableCell>
                <TableCell                  isHeader

                                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Employee Name</TableCell>
                <TableCell                  isHeader

                                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Current Shift</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No employees match your search" : "No employees found"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp, index) => (
                  <TableRow key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{emp.employee_id}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      {emp.shift_assigned
                        ? `${emp.shift_assigned.shift_type} (${emp.shift_assigned.checkin} - ${emp.shift_assigned.checkout})`
                        : "No Shift"}
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex gap-2">
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          onClick={() => navigate(`/admin/assignshifts/edit/${emp.id}`)}
                        >
                          <FiEdit />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-end gap-2 p-4 flex-wrap items-center">
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignShift;
