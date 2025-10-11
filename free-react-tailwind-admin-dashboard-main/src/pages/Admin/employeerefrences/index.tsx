import { useEffect, useState } from "react";
import { FiEdit } from "react-icons/fi";

import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Table, TableRow, TableCell } from "../../../components/ui/table";
import Button from "../../../components/ui/button/Button";

import {
  getAllEmployeeReferences,
  EmployeeReferenceData,
} from "./api";

import AdminEditEmployeeReference from "./EditEmployeeReferences";

const AdminEmployeeReferencePage: React.FC = () => {
  const [references, setReferences] = useState<EmployeeReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRefId, setSelectedRefId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const data = await getAllEmployeeReferences();
      setReferences(data);
    } catch (err) {
      setError("Failed to fetch references");
    } finally {
      setLoading(false);
    }
  };

  const filteredList =
    filter === "All" ? references : references.filter((r) => r.status === filter);

  const totalPages = Math.ceil(filteredList.length / rowsPerPage);

  const paginatedList = filteredList.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const openEditModal = (id: number) => {
    setSelectedRefId(id);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setSelectedRefId(null);
    setEditModalOpen(false);
    fetchReferences(); // refresh after edit
  };

  if (loading) return <div>Loading references...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <>
      <PageMeta title="Admin - Employee References" description="Admin review of employee references" />
      <PageBreadcrumb pageTitle="Employee Reference Review" />

      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">All Employee References</h3>

        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              setCurrentPage(1); // reset to first page when filter changes
            }}
            className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1); // reset page
            }}
            className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            {[5, 10, 20, 50].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded shadow border border-gray-200 dark:border-gray-600">
        <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <TableRow>
              {[
                "S.No", "Employee", "Name", "Designation", "Email", "Contact",
                "Resume", "Status", "Admin Comment", "Submitted At", "Actions"
              ].map((header) => (
                <TableCell key={header} isHeader className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">{header}</TableCell>
              ))}
            </TableRow>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {paginatedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-4">
                  No references found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((ref, idx) => (
                <TableRow key={ref.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <TableCell className="px-4 py-2">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                  <TableCell className="px-4 py-2">{ref.employee_name || "-"}</TableCell>
                  <TableCell className="px-4 py-2">{ref.name}</TableCell>
                  <TableCell className="px-4 py-2">{ref.designation}</TableCell>
                  <TableCell className="px-4 py-2">{ref.email}</TableCell>
                  <TableCell className="px-4 py-2">{ref.contact_number}</TableCell>
                  <TableCell className="px-4 py-2">
                    {ref.resume ? (
                      <a href={ref.resume} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell className={`px-4 py-2 font-semibold ${
                    ref.status === "Approved" ? "text-green-600" :
                    ref.status === "Rejected" ? "text-red-600" : "text-yellow-600"
                  }`}>{ref.status}</TableCell>
                  <TableCell className="px-4 py-2">{ref.admin_comment || "-"}</TableCell>
                  <TableCell className="px-4 py-2">{new Date(ref.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell className="px-4 py-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(ref.id)}>
                      <FiEdit className="inline mr-1" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredList.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editModalOpen && selectedRefId && (
        <AdminEditEmployeeReference
          referenceId={selectedRefId}
          isOpen={editModalOpen}
          onClose={closeEditModal}
          onUpdated={fetchReferences}
        />
      )}
    </>
  );
};

export default AdminEmployeeReferencePage;
