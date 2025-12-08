import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";
import { FaFileAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaTimes, FaCheckCircle, FaTimesCircle, FaDownload } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

interface Policy {
  id: number;
  name: string;
  document: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company: number | { name?: string };
}

type ViewType = 'card' | 'table';
type FilterType = 'all' | 'active' | 'inactive';

const CompanyPolicy: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    let filtered = [...policies];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filter === 'active') {
      filtered = filtered.filter(policy => policy.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(policy => !policy.is_active);
    }

    setFilteredPolicies(filtered);
    setCurrentPage(1);
  }, [policies, searchTerm, filter]);

  const fetchPolicies = () => {
    axiosInstance
      .get("app/policies/")
      .then((res) => {
        setPolicies(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch policies");
        setLoading(false);
      });
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDeletePolicy = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`app/policies/${deleteId}/`);
      setPolicies(prev => prev.filter(policy => policy.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Policy deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete policy", { position: "bottom-right" });
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  // Stats
  const activeCount = policies.filter(p => p.is_active).length;
  const inactiveCount = policies.filter(p => !p.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-indigo-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl">
              <FaFileAlt className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Policies</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and organize company policies</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/form-company-policy')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <FaPlus />
            Add Policy
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Policies</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{policies.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FaFileAlt className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{inactiveCount}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Results and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredPolicies.length} of {policies.length} policies</span>
          <div className="flex items-center gap-3">
            {(searchTerm || filter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilter('all'); }}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <FaTimes /> Clear Filters
              </button>
            )}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('card')}
                className={`p-2 rounded-md transition-all ${viewType === 'card' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaTh className="text-lg" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-all ${viewType === 'table' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredPolicies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Items:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white cursor-pointer text-sm"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft className="text-sm" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredPolicies.length)}</span> of <span className="font-medium">{filteredPolicies.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredPolicies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaFileAlt className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Policies Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Start by creating your first policy'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {paginatedPolicies.map((policy, index) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg line-clamp-2 flex-1">{policy.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/form-company-policy/${policy.id}`)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                      title="Edit"
                    >
                      <FaEdit className="text-white" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(policy.id, policy.name)}
                      className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-all"
                      title="Delete"
                    >
                      <FaTrash className="text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${policy.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {policy.document && (
                      <a
                        href={policy.document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
                      >
                        <FaDownload />
                        Document
                      </a>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p><span className="font-medium">Last Updated:</span> {new Date(policy.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Policy Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Document</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Last Updated</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedPolicies.map((policy, idx) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{policy.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${policy.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {policy.is_active ? <FaCheckCircle /> : <FaTimesCircle />}
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {policy.document ? (
                        <a
                          href={policy.document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                        >
                          <FaDownload />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(policy.updated_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/form-company-policy/${policy.id}`)}
                          className="p-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(policy.id, policy.name)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => { setDeleteId(null); setDeleteName(""); }}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-br from-red-600 via-red-500 to-pink-600 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaTrash className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Confirm Delete</h3>
                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{deleteName}</span>?
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteName(""); }}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePolicy}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                Delete Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPolicy;
