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

interface Level {
  id: number;
  level_name: string;
  description: string;
}

export default function Level() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLevelName, setEditLevelName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const navigate = useNavigate();

  const fetchLevels = async () => {
    try {
      const res = await axiosInstance.get("app/levels/");
      setLevels(res.data);
    } catch {
      toast.error("Failed to fetch levels");
    }
  };

  const openEditModal = (id: number, name: string, desc: string) => {
    setEditId(id);
    setEditLevelName(name);
    setEditDescription(desc);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditId(null);
    setEditLevelName("");
    setEditDescription("");
  };

  const updateLevel = async () => {
    if (!editId || !editLevelName || !editDescription) {
      toast.warning("Please fill in all fields");
      return;
    }

    try {
      await axiosInstance.put(`app/levels/${editId}/`, {
        level_name: editLevelName,
        description: editDescription,
      });
      toast.success("Level updated successfully", { position: "bottom-right" });
      closeEditModal();
      fetchLevels();
    } catch {
      toast.error("Failed to update level", { position: "bottom-right" });
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDeleteLevel = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/levels/${deleteId}/`);
      fetchLevels();
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete level", { position: "bottom-right" });
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Levels
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your organization's reporting levels
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/form-level")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200"
          >
            <FaPlus className="w-4 h-4" />
            Add Level
          </button>
        </div>

        {/* Table */}
        <ComponentCard title={`Level List (${levels.length} total)`}>
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
                      Level Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-semibold text-gray-700 text-left text-sm dark:text-gray-300"
                    >
                      Description
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
                  {levels.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        colSpan={4}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-6xl mb-4">📊</div>
                          <p className="text-lg font-medium mb-2">
                            No levels found
                          </p>
                          <p className="text-sm">
                            Get started by adding your first level
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    levels.map((lvl, idx) => (
                      <TableRow
                        key={lvl.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <TableCell className="px-6 py-5 text-left">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm dark:bg-blue-900/30 dark:text-blue-400">
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-left text-gray-900 dark:text-white">
                          {lvl.level_name}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-left text-gray-700 dark:text-gray-300">
                          {lvl.description}
                        </TableCell>
                        <TableCell className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                openEditModal(
                                  lvl.id,
                                  lvl.level_name,
                                  lvl.description
                                )
                              }
                              className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                              title="Edit Level"
                            >
                              <FaEdit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick(lvl.id, lvl.level_name)
                              }
                              className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                              title="Delete Level"
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

      {/* 🟦 Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Edit Level
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Level Name
                </label>
                <input
                  type="text"
                  value={editLevelName}
                  onChange={(e) => setEditLevelName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter level name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={updateLevel}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟥 Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Confirm Delete
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the level{" "}
              <span className="font-semibold">{deleteName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLevel}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
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
