import { useEffect, useState } from "react";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import Button from "../../../components/ui/button/Button";
import { Table, TableRow, TableCell } from '../../../components/ui/table';

import {
  getEmployeeReferenceList,
  deleteEmployeeReference,
  EmployeeReferenceData,
} from "./api";
import EditEmployeeReference from "./EditReference";

const EmployeeReferencePage: React.FC = () => {
  const navigate = useNavigate();
  const [references, setReferences] = useState<EmployeeReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReferenceId, setEditReferenceId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const list = await getEmployeeReferenceList();
      setReferences(list);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load references");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReference = () => navigate("/employee/reference/add");

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteEmployeeReference(deleteId);
      setReferences((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success("Reference deleted successfully!");
    } catch {
      toast.error("Failed to delete reference.");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  const onReferenceUpdated = () => {
    fetchReferences();
    setIsEditModalOpen(false);
    setEditReferenceId(null);
  };

  if (loading) return <div>Loading references...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="Employee References" description="Manage professional references" />
      <PageBreadcrumb pageTitle="Employee References" />

      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold dark:text-white">Manage Employee References</h3>
        <Button onClick={handleAddReference} className="flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          Add New Reference
        </Button>
      </div>

      <Table>
        <thead>
          <TableRow>
            <TableCell
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">S.No</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Name</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Designation</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Contact</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Email</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Resume</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Status</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Admin Comment</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Submitted</TableCell>
            <TableCell                   
            isHeader
            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Actions</TableCell>
          </TableRow>
        </thead>
        <tbody>
          {references.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500">
                No references found.
              </TableCell>
            </TableRow>
          ) : (
            references.map((ref, idx) => (
              <TableRow key={ref.id}>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{idx + 1}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{ref.name}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{ref.designation}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{ref.contact_number}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{ref.email}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">
                  {ref.resume ? (
                    <a href={ref.resume} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View
                    </a>
                  ) : "-"}
                </TableCell>
                <TableCell
                  className={
                    ref.status === "Approved"
                      ? "text-green-600"
                      : ref.status === "Rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }
                >
                  {ref.status}
                </TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{ref.admin_comment}</TableCell>
                <TableCell  className="px-5 py-4 sm:px-6 text-start dark:text-white">{new Date(ref.submitted_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex gap-2 px-5 py-4 sm:px-6 text-start dark:text-white">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setEditReferenceId(ref.id);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <FiEdit />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDeleteClick(ref.id)}
                  >
                    <FiTrash2 />
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>

      {isEditModalOpen && editReferenceId !== null && (
        <EditEmployeeReference
          referenceId={editReferenceId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onReferenceUpdated}
        />
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete <strong>{references.find(r => r.id === deleteId)?.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleConfirmDelete}
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

export default EmployeeReferencePage;
