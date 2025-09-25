import React, { useEffect, useState } from "react";
import { FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface Allowance {
  id?: number;
  name: string;
  amount: number;
}

interface Deduction {
  id?: number;
  name: string;
  amount: number;
}

interface SalaryStructure {
  id: number;
  name: string;
  basic_percent: number;
  hra_percent: number;
  conveyance_percent: number;
  medical_percent: number;
  special_percent: number;
  service_charge_percent: number;
  total_working_days: number;
  created_at: string;
  allowances: Allowance[];
  deductions: Deduction[];
}

const SalaryStructureList: React.FC = () => {
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSalaryStructures = async () => {
      try {
        const response = await axiosInstance.get("app/salary-structures/");
        setSalaryStructures(response.data);
      } catch (err) {
        if ((err as AxiosError).isAxiosError) {
          const axiosErr = err as AxiosError<{ detail?: string }>;
          setError(axiosErr.response?.data?.detail || axiosErr.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to fetch salary structures");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSalaryStructures();
  }, []);

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/salary-structures/${deleteId}/`);
      setSalaryStructures((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete", { position: "bottom-right" });
    }
  };

  if (loading) return (
    <div className="p-6">
      <ComponentCard title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading salary structures...</div>
        </div>
      </ComponentCard>
    </div>
  );
  
  if (error) return (
    <div className="p-6">
      <ComponentCard title="Error">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      </ComponentCard>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Salary Structure Management | HRMS - Human Resource Management System"
        description="Manage salary structures in your organization - View, add, edit, and delete salary structures"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Salary Structures</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage compensation structures for your organization</p>
          </div>
          <button
            onClick={() => navigate("/admin/form-salary-structure")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200"
          >
            <FaPlus className="w-4 h-4" />
            Add Salary Structure
          </button>
        </div>
        
        <ComponentCard title={`Salary Structure List (${salaryStructures.length} total)`}>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300 min-w-[60px]"
                    >
                      S.No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300 min-w-[200px]"
                    >
                      Structure Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[100px]"
                    >
                      Basic %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[100px]"
                    >
                      HRA %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[120px]"
                    >
                      Conveyance %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[100px]"
                    >
                      Medical %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[100px]"
                    >
                      Special %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[140px]"
                    >
                      Service Charge %
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[120px]"
                    >
                      Working Days
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[150px]"
                    >
                      Allowances
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[150px]"
                    >
                      Deductions
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300 min-w-[100px]"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {salaryStructures.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center col-span-12">
                          <div className="text-6xl mb-4">💰</div>
                          <p className="text-lg font-medium mb-2">No salary structures found</p>
                          <p className="text-sm">Get started by adding your first salary structure</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                    </TableRow>
                  ) : (
                    salaryStructures.map((structure, idx) => (
                      <TableRow key={structure.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <TableCell className="px-6 py-5 text-left">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-left">
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                              {structure.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Created: {new Date(structure.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {structure.basic_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {structure.hra_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            {structure.conveyance_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {structure.medical_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {structure.special_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {structure.service_charge_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                            {structure.total_working_days} days
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          {structure.allowances.length > 0 ? (
                            <div className="space-y-1">
                              {structure.allowances.map((allowance, idx2) => (
                                <div key={idx2} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded dark:bg-green-900/20 dark:text-green-400">
                                  {allowance.name}: ₹{allowance.amount}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No allowances</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          {structure.deductions.length > 0 ? (
                            <div className="space-y-1">
                              {structure.deductions.map((deduction, idx2) => (
                                <div key={idx2} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded dark:bg-red-900/20 dark:text-red-400">
                                  {deduction.name}: ₹{deduction.amount}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No deductions</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleDeleteClick(structure.id, structure.name)}
                              className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                              title="Delete Salary Structure"
                            >
                              <FaTrash className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete the salary structure <span className="font-semibold">{deleteName}</span>?</p>
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
    </>
  );
};

export default SalaryStructureList;
