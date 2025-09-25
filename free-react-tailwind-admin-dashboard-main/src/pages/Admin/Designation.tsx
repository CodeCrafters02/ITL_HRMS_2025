import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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


interface Department {
  id: number;
  department_name: string;
}

interface Level {
  id: number;
  level_name: string;
}

interface Designation {
  id: number;
  designation_name: string;
  department: number;
  level: number;
}

export default function Designation() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  const [editId, setEditId] = useState<number | null>(null);
  const [editDesignationName, setEditDesignationName] = useState("");
  const [editDepartment, setEditDepartment] = useState<number | null>(null);
  const [editLevel, setEditLevel] = useState<number | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchDesignations();
    fetchDependencies();
  }, []);

  const fetchDesignations = async () => {
    const res = await axiosInstance.get("app/designations/");
    setDesignations(res.data);
  };

  const fetchDependencies = async () => {
    const [depRes, lvlRes] = await Promise.all([
      axiosInstance.get("app/departments/"),
      axiosInstance.get("app/levels/"),
    ]);
    setDepartments(depRes.data);
    setLevels(lvlRes.data);
  };

  const startEdit = (id: number, name: string, dep: number, lvl: number) => {
    setEditId(id);
    setEditDesignationName(name);
    setEditDepartment(dep);
    setEditLevel(lvl);
  };

  const updateDesignation = async (id: number) => {
    if (!editDesignationName || !editDepartment || !editLevel) return;

    try {
      await axiosInstance.put(`app/designations/${id}/`, {
        designation_name: editDesignationName,
        department: editDepartment,
        level: editLevel,
      });

      cancelEdit();
      fetchDesignations();
      alert('Designation updated successfully');
    } catch {
      alert('Failed to update designation');
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDeleteDesignation = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/designations/${deleteId}/`);
      fetchDesignations();
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete designation", { position: "bottom-right" });
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDesignationName("");
    setEditDepartment(null);
    setEditLevel(null);
  };

  return (
    <>
     
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Designations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage designations across departments and levels</p>
          </div>
          <button
            onClick={() => navigate("/admin/form-designation")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200"
          >
            <FaPlus className="w-4 h-4" />
            Add Designation
          </button>
        </div>
        
        <ComponentCard title={`Designation List (${designations.length} total)`}>
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
                      Designation Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300"
                    >
                      Department
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300"
                    >
                      Level
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
                  {designations.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center col-span-5">
                          <div className="text-6xl mb-4">💼</div>
                          <p className="text-lg font-medium mb-2">No designations found</p>
                          <p className="text-sm">Get started by adding your first designation</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                      <TableCell className="px-6 py-12">&nbsp;</TableCell>
                    </TableRow>
                  ) : (
                    designations.map((des, idx) => {
                      const dep = departments.find((d) => d.id === des.department);
                      const lvl = levels.find((l) => l.id === des.level);
                      const isEditing = editId === des.id;

                      return (
                        <TableRow key={des.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <TableCell className="px-6 py-5 text-left">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                              {idx + 1}
                            </span>
                          </TableCell>
                          
                          <TableCell className="px-6 py-5 text-left">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editDesignationName}
                                  onChange={(e) => setEditDesignationName(e.target.value)}
                                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Enter designation name"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="text-lg font-medium text-gray-900 dark:text-white">
                                  {des.designation_name}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="px-6 py-5 text-left">
                            {isEditing ? (
                              <select
                                value={editDepartment ?? ""}
                                onChange={(e) => setEditDepartment(Number(e.target.value))}
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Department</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.department_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  {dep?.department_name || "-"}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="px-6 py-5 text-left">
                            {isEditing ? (
                              <select
                                value={editLevel ?? ""}
                                onChange={(e) => setEditLevel(Number(e.target.value))}
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Level</option>
                                {levels.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.level_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  {lvl?.level_name || "-"}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => updateDesignation(des.id)}
                                    className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                    title="Save Changes"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(des.id, des.designation_name, des.department, des.level)}
                                    className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                    title="Edit Designation"
                                  >
                                    <FaEdit className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(des.id, des.designation_name)}
                                    className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                    title="Delete Designation"
                                  >
                                    <FaTrash className="w-3 h-3" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
            <p className="mb-6 text-gray-700 dark:text-gray-300">Are you sure you want to delete the designation <span className="font-semibold">{deleteName}</span>?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDesignation}
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
