import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

interface Department {
  id: number;
  department_name: string;
}

export default function Department() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();

  const fetchDepartments = async () => {
    const res = await axiosInstance.get("/departments/");
    setDepartments(res.data);
  };

  // createDepartment removed; handled in DepartmentForm page

  const startEdit = (id: number, name: string) => {
    setEditId(id);
    setEditName(name);
  };

  const updateDepartment = async (id: number) => {
    if (!editName) return;
    try {
      await axiosInstance.put(`/departments/${id}/`, { department_name: editName });
      setEditId(null);
      setEditName("");
      fetchDepartments();
      alert('Department updated successfully');
    } catch {
      alert('Failed to update department');
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDeleteDepartment = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/departments/${deleteId}/`);
      fetchDepartments();
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete department", { position: "bottom-right" });
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return (
    <>
      <PageMeta
        title="Department Management | HRMS - Human Resource Management System"
        description="Manage departments in your organization - Add, edit, and delete departments"
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Departments</h1>
          </div>
          <button
           onClick={() => navigate("/admin/form-department")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200"
          >
            <FaPlus className="w-4 h-4" />
            Add Department
          </button>
        </div>
        
        <ComponentCard title={`Department List (${departments.length} total)`}>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300"
                    >
                      S.No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300"
                    >
                      Department Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-center text-sm dark:text-gray-300"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center col-span-3">
                          <div className="text-6xl mb-4">📁</div>
                          <p className="text-lg font-medium mb-2">No departments found</p>
                          <p className="text-sm">Get started by adding your first department</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept, idx) => (
                      <TableRow key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <TableCell className="px-6 py-5 text-left">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-left">
                          {editId === dept.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter department name"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="text-lg font-medium text-gray-900 dark:text-white">
                                {dept.department_name}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {editId === dept.id ? (
                              <>
                                <button
                                  onClick={() => updateDepartment(dept.id)}
                                  className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                  title="Save Changes"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditId(null); setEditName(""); }}
                                  className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                  title="Cancel"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(dept.id, dept.department_name)}
                                  className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                  title="Edit Department"
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(dept.id, dept.department_name)}
                                  className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                  title="Delete Department"
                                >
                                  <FaTrash className="w-3 h-3" />
                                  Delete
                                </button>
                              </>
                            )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete the department <span className="font-semibold">{deleteName}</span>?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDepartment}
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
}
