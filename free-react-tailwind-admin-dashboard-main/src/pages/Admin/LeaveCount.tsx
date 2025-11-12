import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from "../../components/ui/table";
import ComponentCard from "../../components/common/ComponentCard";
import { axiosInstance } from "../Dashboard/api";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

interface Leave {
  id: number;
  leave_name: string;
  count: number;
  is_paid: boolean;
}

const LeaveCountPage: React.FC = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLeave, setEditLeave] = useState<Partial<Leave>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const fetchLeaves = async () => {
    try {
      const accessToken = localStorage.getItem("access");
      const response = await axiosInstance.get("app/leaves/", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLeaves(response.data);
    } catch (err: unknown) {
      setError("Failed to load leave data");
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const openModal = (leave?: Leave) => {
    if (leave) {
      setEditLeave({ ...leave });
    } else {
      setEditLeave({ leave_name: "", count: 0, is_paid: false });
    }
    setModalOpen(true);
  };

  const handleModalChange = (field: keyof Leave, value: string | number | boolean) => {
    setEditLeave(prev => ({ ...prev, [field]: value }));
  };

  const saveLeave = async () => {
    setLoading(true);
    try {
      if (editLeave.id) {
        await axiosInstance.put(`app/leaves/${editLeave.id}/`, editLeave);
        toast.success("Updated successfully", { position: "bottom-right" });
      } else {
        await axiosInstance.post(`app/leaves/`, editLeave);
        toast.success("Added successfully", { position: "bottom-right" });
      }
      setModalOpen(false);
      setEditLeave({});
      fetchLeaves();
    } catch {
      toast.error("Failed to save leave", { position: "bottom-right" });
    }
    setLoading(false);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`app/leaves/${deleteId}/`);
      setLeaves(prev => prev.filter(l => l.id !== deleteId));
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete", { position: "bottom-right" });
    }
    setDeleteId(null);
    setDeleteName("");
    setLoading(false);
  };

  return (
    <div className="p-4 min-h-screen">
      <ComponentCard title="Leave Configuration" className="bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
            onClick={() => openModal()}
          >
            <FaPlus /> Add Leave
          </button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

        <Table className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <TableRow className="bg-gray-100 dark:bg-gray-700">
            <TableCell isHeader className="px-4 py-2 text-center dark:text-gray-200">S.no</TableCell>
            <TableCell isHeader className="px-4 py-2 text-center dark:text-gray-200">Leave Name</TableCell>
            <TableCell isHeader className="px-4 py-2 text-center dark:text-gray-200">Count</TableCell>
            <TableCell isHeader className="px-4 py-2 text-center dark:text-gray-200">Is Paid</TableCell>
            <TableCell isHeader className="px-4 py-2 text-center dark:text-gray-200">Actions</TableCell>
          </TableRow>
          <TableBody>
            {leaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500 dark:text-gray-300">
                  No leave policies available.
                </TableCell>
              </TableRow>
            ) : (
              leaves.map((leave, idx) => (
                <TableRow key={leave.id} className="hover:bg-gray-200 dark:hover:bg-gray-700">
                  <TableCell className="px-4 py-2 text-center dark:text-gray-300">{idx + 1}</TableCell>
                  <TableCell className="px-4 py-2 text-center dark:text-gray-300">{leave.leave_name}</TableCell>
                  <TableCell className="px-4 py-2 text-center dark:text-gray-300">{leave.count}</TableCell>
                  <TableCell className="px-4 py-2 text-center dark:text-gray-300">{leave.is_paid ? "Yes" : "No"}</TableCell>
                  <TableCell className="px-4 py-2 flex gap-2 justify-center">
                    <button
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-700 dark:text-blue-100 dark:hover:bg-blue-600 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                      title="Edit Leave"
                      onClick={() => openModal(leave)}
                      disabled={loading}
                    >
                      <FaEdit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                      title="Delete Leave"
                      onClick={() => handleDeleteClick(leave.id, leave.leave_name)}
                      disabled={loading}
                    >
                      <FaTrash className="w-3 h-3" /> Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ComponentCard>

      {/* Edit/Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editLeave.id ? "Edit Leave" : "Add Leave"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Leave Name</label>
                <input
                  type="text"
                  value={editLeave.leave_name || ""}
                  onChange={e => handleModalChange("leave_name", e.target.value)}
                  className="border rounded px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Count</label>
                <input
                  type="number"
                  value={editLeave.count || 0}
                  min={0}
                  onChange={e => handleModalChange("count", Number(e.target.value))}
                  className="border rounded px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Is Paid</label>
                <select
                  value={editLeave.is_paid ? "true" : "false"}
                  onChange={e => handleModalChange("is_paid", e.target.value === "true")}
                  className="border rounded px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 dark:text-gray-200 text-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveLeave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirm Delete</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete leave <span className="font-semibold">{deleteName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 dark:text-gray-200 text-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCountPage;
