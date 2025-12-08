import { useEffect, useState } from "react";
import { FiEdit, FiDownload, FiFilter } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Table, TableRow, TableCell } from "../../../components/ui/table";

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-300 font-semibold">Loading references...</p>
      </motion.div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800"
      >
        <div className="text-red-500 dark:text-red-400 text-xl font-semibold">{error}</div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 p-6">
      <PageMeta title="Admin - Employee References" description="Admin review of employee references" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageBreadcrumb pageTitle="Employee Reference Review" />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
              All Employee References
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {filteredList.length} reference{filteredList.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2.5 text-sm bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 
                           border-2 border-gray-200 dark:border-gray-600 rounded-xl
                           focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                           transition-all duration-200 font-medium text-gray-700 dark:text-gray-200"
              >
                <option value="All">All Status</option>
                <option value="Pending">⏳ Pending</option>
                <option value="Approved">✓ Approved</option>
                <option value="Rejected">✗ Rejected</option>
              </select>
            </motion.div>

            <motion.select
              whileHover={{ scale: 1.02 }}
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 
                         border-2 border-gray-200 dark:border-gray-600 rounded-xl
                         focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
                         transition-all duration-200 font-medium text-gray-700 dark:text-gray-200"
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>{num} rows</option>
              ))}
            </motion.select>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="overflow-x-auto">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 dark:from-gray-700 dark:via-blue-900/20 dark:to-purple-900/20">
              <TableRow>
                {[
                  "S.No", "Employee", "Name", "Designation", "Email", "Contact",
                  "Resume", "Status", "Admin Comment", "Submitted At", "Actions"
                ].map((header, idx) => (
                  <TableCell 
                    key={header} 
                    isHeader 
                    className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200"
                  >
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {header}
                    </motion.span>
                  </TableCell>
                ))}
              </TableRow>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              <AnimatePresence mode="wait">
                {paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <FiFilter className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No references found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((ref, idx) => (
                    <motion.tr
                      key={ref.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                      className="transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full text-sm font-bold">
                          {(currentPage - 1) * rowsPerPage + idx + 1}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {ref.employee_name || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {ref.name}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {ref.designation}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {ref.email}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {ref.contact_number}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        {ref.resume ? (
                          <motion.a 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href={ref.resume} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm"
                          >
                            <FiDownload className="w-3.5 h-3.5" />
                            View
                          </motion.a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <motion.span 
                          whileHover={{ scale: 1.05 }}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                            ref.status === "Approved" 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" :
                            ref.status === "Rejected" 
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" 
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                          }`}
                        >
                          {ref.status}
                        </motion.span>
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-xs truncate text-gray-700 dark:text-gray-300">
                        {ref.admin_comment || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {new Date(ref.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(ref.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm"
                        >
                          <FiEdit className="w-4 h-4" />
                          Edit
                        </motion.button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </Table>
        </div>
      </motion.div>

      {/* Pagination Controls */}
      {filteredList.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Page <span className="font-bold text-blue-600 dark:text-blue-400">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredList.length} total)
            </span>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                currentPage === 1 
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg"
              }`}
            >
              ← Prev
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                currentPage === totalPages 
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg"
              }`}
            >
              Next →
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Admin Edit Modal */}
      <AnimatePresence>
        {editModalOpen && selectedRefId && (
          <AdminEditEmployeeReference
            referenceId={selectedRefId}
            isOpen={editModalOpen}
            onClose={closeEditModal}
            onUpdated={fetchReferences}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEmployeeReferencePage;
