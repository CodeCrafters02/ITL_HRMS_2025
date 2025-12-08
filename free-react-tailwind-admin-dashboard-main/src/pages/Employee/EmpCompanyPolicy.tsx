import { useEffect, useState } from "react";
import { axiosInstance } from "../Employee/api";
import { FaFileAlt, FaSearch, FaTh, FaList, FaChevronLeft, FaChevronRight, FaDownload, FaTimes, FaEye } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface Policy {
  id: number;
  name: string;
  document?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

type ViewType = 'card' | 'table';

export default function EmpCompanyPolicy() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/employee-companypolicies/")
      .then((res) => {
        // Filter only active policies for employees
        const activePolicies = res.data.filter((p: Policy) => p.is_active !== false);
        setPolicies(activePolicies);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.detail || err.message || "Failed to fetch policies"
        );
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = [...policies];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPolicies(filtered);
    setCurrentPage(1);
  }, [policies, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
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
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl">
            <FaFileAlt className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Policies</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and download company policy documents</p>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Active Policies</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{policies.length}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <FaFileAlt className="text-2xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-end gap-3">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <FaTimes /> Clear Search
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

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredPolicies.length} of {policies.length} policies</span>
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
            {searchTerm ? 'Try adjusting your search criteria' : 'No company policies available'}
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => policy.document && window.open(policy.document, '_blank')}
              >
                <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-center">
                  <FaFileAlt className="text-6xl text-white/30" />
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">{policy.name}</h3>

                  {policy.document ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={policy.document}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        <FaEye />
                        View
                      </a>
                      <a
                        href={policy.document}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        <FaDownload />
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No document available</p>
                  )}
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
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedPolicies.map((policy, idx) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{policy.name}</td>
                    <td className="px-6 py-4">
                      {policy.document ? (
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={policy.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg transition-all"
                            title="View"
                          >
                            <FaEye />
                          </a>
                          <a
                            href={policy.document}
                            download
                            className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-all"
                            title="Download"
                          >
                            <FaDownload />
                          </a>
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-400">No document</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
