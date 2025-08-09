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

interface Leave {
  id: number;
  leave_name: string;
  count: number;
  is_paid: boolean;
}

const LeaveCountPage: React.FC = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLeave, setEditLeave] = useState<Partial<Leave>>({});
  const [loading, setLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      const accessToken = localStorage.getItem("access");
      const response = await axiosInstance.get("/leaves/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setLeaves(response.data);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        // @ts-expect-error accessing error.response from axios error object
        setError(err.response?.data?.detail || "Failed to load leave data");
      } else {
        setError("Failed to load leave data");
      }
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const startEdit = (leave: Leave) => {
    setEditId(leave.id);
    setEditLeave({ ...leave });
  };

  const handleEditChange = (field: keyof Leave, value: string | number | boolean) => {
    setEditLeave((prev) => ({ ...prev, [field]: value }));
  };

  const updateLeave = async (id: number) => {
    setLoading(true);
    try {
      await axiosInstance.put(`/leaves/${id}/`, editLeave);
      setEditId(null);
      setEditLeave({});
      fetchLeaves();
    } catch {
      setError("Failed to update leave policy.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this leave policy?")) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`/leaves/${id}/`);
      setLeaves((prev) => prev.filter((leave) => leave.id !== id));
    } catch {
      setError("Failed to delete leave policy.");
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    setEditId(0);
    setEditLeave({ leave_name: "", count: 0, is_paid: false });
  };

  const addLeave = async () => {
    setLoading(true);
    try {
      await axiosInstance.post(`/leaves/`, editLeave);
      setEditId(null);
      setEditLeave({});
      fetchLeaves();
    } catch {
      setError("Failed to add leave policy.");
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <ComponentCard title="Leave Configuration">
        <div className="flex items-center justify-between mb-4">
          {/* Heading moved to card title */}
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-2 shadow"
            onClick={handleAdd}
          >
            <FaPlus /> Add Leave
          </button>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <Table className="w-full rounded-lg overflow-hidden">
          <TableHeader>
            <TableRow className="bg-gray-100 text-left">
              <TableCell isHeader className="px-4 py-2 text-center">S.no</TableCell>
              <TableCell isHeader className="px-4 py-2">Leave Name</TableCell>
              <TableCell isHeader className="px-4 py-2">Count</TableCell>
              <TableCell isHeader className="px-4 py-2">Is Paid</TableCell>
              <TableCell isHeader className="px-4 py-2 text-center">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editId === 0 && (
              <TableRow className="bg-yellow-50">
                <TableCell className="px-4 py-2 text-center">-</TableCell>
                <TableCell className="px-4 py-2">
                  <input
                    type="text"
                    value={editLeave.leave_name || ""}
                    onChange={e => handleEditChange("leave_name", e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Leave Name"
                  />
                </TableCell>
                <TableCell className="px-4 py-2">
                  <input
                    type="number"
                    value={editLeave.count || 0}
                    onChange={e => handleEditChange("count", Number(e.target.value))}
                    className="border rounded px-2 py-1 w-full"
                    min={0}
                  />
                </TableCell>
                <TableCell className="px-4 py-2">
                  <select
                    value={editLeave.is_paid ? "true" : "false"}
                    onChange={e => handleEditChange("is_paid", e.target.value === "true")}
                    className="border rounded px-2 py-1 w-full"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </TableCell>
                <TableCell className="px-4 py-2 flex gap-2 justify-center">
                  <button
                    className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                    title="Save"
                    onClick={addLeave}
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button
                    className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                    title="Cancel"
                    onClick={() => { setEditId(null); setEditLeave({}); }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </TableCell>
              </TableRow>
            )}
            {leaves.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-4 text-gray-500">No leave policies available.</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
                <TableCell>{""}</TableCell>
              </TableRow>
            ) : (
              leaves.map((leave, idx) => (
                <TableRow key={leave.id} className="hover:bg-gray-50">
                  {editId === leave.id ? (
                    <>
                      <TableCell className="px-4 py-2 text-center">{idx + 1}</TableCell>
                      <TableCell className="px-4 py-2">
                        <input
                          type="text"
                          value={editLeave.leave_name || ""}
                          onChange={e => handleEditChange("leave_name", e.target.value)}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <input
                          type="number"
                          value={editLeave.count || 0}
                          onChange={e => handleEditChange("count", Number(e.target.value))}
                          className="border rounded px-2 py-1 w-full"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <select
                          value={editLeave.is_paid ? "true" : "false"}
                          onChange={e => handleEditChange("is_paid", e.target.value === "true")}
                          className="border rounded px-2 py-1 w-full"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </TableCell>
                      <TableCell className="px-4 py-2 flex gap-2 justify-center">
                        <button
                          className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                          title="Save"
                          onClick={() => updateLeave(leave.id)}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                          title="Cancel"
                          onClick={() => { setEditId(null); setEditLeave({}); }}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="px-4 py-2 text-center">{idx + 1}</TableCell>
                      <TableCell className="px-4 py-2">{leave.leave_name}</TableCell>
                      <TableCell className="px-4 py-2">{leave.count}</TableCell>
                      <TableCell className="px-4 py-2">{leave.is_paid ? "Yes" : "No"}</TableCell>
                      <TableCell className="px-4 py-2 flex gap-2 justify-center">
                        <button
                          className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                          title="Edit Leave"
                          onClick={() => startEdit(leave)}
                          disabled={loading}
                        >
                          <FaEdit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                          title="Delete Leave"
                          onClick={() => handleDelete(leave.id)}
                          disabled={loading}
                        >
                          <FaTrash className="w-3 h-3" />
                          Delete
                        </button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ComponentCard>
    </div>
  );
};

export default LeaveCountPage;
