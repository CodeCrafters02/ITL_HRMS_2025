import { useEffect, useState } from "react";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Table, TableRow, TableCell } from '../../../components/ui/table';
import { getEmployeeReportees, EmployeeReporteeData } from "./api";

const EmployeeReporteesPage: React.FC = () => {
  const [reportees, setReportees] = useState<EmployeeReporteeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportees();
  }, []);

  const fetchReportees = async () => {
    try {
      const employee_id = localStorage.getItem("employee_id");
      if (!employee_id) throw new Error("Employee ID not found in localStorage");

      const list = await getEmployeeReportees({ employee_id });
      setReportees(list);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load reportees");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading reportees...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="My Reportees" description="List of employees reporting to me" />
      <PageBreadcrumb pageTitle="My Reportees" />

      <Table>
        <thead>
          <TableRow>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">S.No</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Full Name</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Status</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Department</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Designation</TableCell>
          </TableRow>
        </thead>
        <tbody>
          {reportees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                No reportees found.
              </TableCell>
            </TableRow>
          ) : (
            reportees.map((rep, idx) => (
              <TableRow key={rep.id}>
                <TableCell className="px-5 py-4 sm:px-6 text-start dark:text-white">{idx + 1}</TableCell>
                <TableCell className="px-5 py-4 sm:px-6 text-start dark:text-white">{rep.full_name}</TableCell>
                <TableCell
                  className={
                    rep.status === "online"
                      ? "text-green-600"
                      : rep.status === "away"
                      ? "text-yellow-600"
                      : rep.status === "dnd"
                      ? "text-red-600"
                      : "text-gray-500"
                  }
                >
                  {rep.status}
                </TableCell>
                <TableCell className="px-5 py-4 sm:px-6 text-start dark:text-white">{rep.department_name || "-"}</TableCell>
                <TableCell className="px-5 py-4 sm:px-6 text-start dark:text-white">{rep.designation_name || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
};

export default EmployeeReporteesPage;
