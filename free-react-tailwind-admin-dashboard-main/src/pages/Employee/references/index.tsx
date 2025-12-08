import { useEffect, useState } from "react";
import { FaSearch, FaUser, FaTrash, FaEdit, FaEye, FaTimes, FaDownload, FaUserTie, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaPlus, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getEmployeeReferenceList,
  deleteEmployeeReference,
  EmployeeReferenceData,
} from "./api";
import EditEmployeeReference from "./EditReference";

type FilterType = 'all' | 'approved' | 'pending' | 'rejected';
type SortType = 'newest' | 'oldest' | 'az';
type ViewType = 'card' | 'table';

const EmployeeReferencePage: React.FC = () => {
  const navigate = useNavigate();
  const [references, setReferences] = useState<EmployeeReferenceData[]>([]);
  const [filteredReferences, setFilteredReferences] = useState<EmployeeReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<EmployeeReferenceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReferenceId, setEditReferenceId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

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

  // Filter and search logic
  useEffect(() => {
    let result = [...references];

    // Apply search
    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter
    if (filterType !== 'all') {
      result = result.filter(item => item.status.toLowerCase() === filterType);
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortType === 'az') return a.name.localeCompare(b.name);
      if (sortType === 'oldest') return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(); // newest
    });

    setFilteredReferences(result);
    setCurrentPage(1);
  }, [searchQuery, filterType, sortType, references]);

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
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
      setDeleteName("");
    }
  };

  const onReferenceUpdated = () => {
    fetchReferences();
    setIsEditModalOpen(false);
    setEditReferenceId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved') {
      return { icon: FaCheckCircle, label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    }
    if (statusLower === 'rejected') {
      return { icon: FaTimesCircle, label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
    return { icon: FaClock, label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReferences = filteredReferences.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="text-xl">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 2xl:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
              <FaUserTie className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee References</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your professional references</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/employee/reference/add")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <FaPlus />
            Add Reference
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter by Status */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A-Z</option>
          </select>
        </div>

        {/* Results Count and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredReferences.length} of {references.length} references</span>
          <div className="flex items-center gap-3">
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <FaTimes /> Clear Filters
              </button>
            )}
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('card')}
                className={`p-2 rounded-md transition-all ${viewType === 'card'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <FaTh className="text-lg" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-all ${viewType === 'table'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Pagination */}
      {filteredReferences.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Items:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer text-sm"
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
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft className="text-sm" />
              </button>

              {totalPages <= 5 ? (
                Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    {page}
                  </button>
                ))
              ) : (
                <>
                  <button onClick={() => setCurrentPage(1)} className={`px-3 py-1.5 rounded-lg border text-sm ${currentPage === 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>1</button>
                  {currentPage > 3 && <span className="text-gray-500">...</span>}
                  {currentPage > 2 && currentPage < totalPages - 1 && (
                    <button className="px-3 py-1.5 rounded-lg border text-sm bg-blue-600 text-white">{currentPage}</button>
                  )}
                  {currentPage < totalPages - 2 && <span className="text-gray-500">...</span>}
                  <button onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1.5 rounded-lg border text-sm ${currentPage === totalPages ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{totalPages}</button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredReferences.length)}</span> of <span className="font-medium">{filteredReferences.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredReferences.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaUserTie className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No References Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterType !== 'all' ? 'Try adjusting your search or filter criteria' : 'Click "Add Reference" to create your first reference'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedReferences.map((ref) => {
            const statusBadge = getStatusBadge(ref.status);
            return (
              <div
                key={ref.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <FaUser className="text-6xl text-white/50" />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{ref.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                      <statusBadge.icon className="text-xs" />
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Designation:</span> {ref.designation}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Contact:</span> {ref.contact_number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Email:</span> {ref.email}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewItem(ref)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-lg font-medium text-sm transition-all"
                    >
                      <FaEye className="text-xs" />
                      View
                    </button>
                    <button
                      onClick={() => {
                        setEditReferenceId(ref.id);
                        setIsEditModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-3 py-2 rounded-lg font-medium text-sm transition-all"
                    >
                      <FaEdit className="text-xs" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(ref.id, ref.name)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg font-medium text-sm transition-all"
                    >
                      <FaTrash className="text-xs" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Designation</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedReferences.map((ref, idx) => {
                  const statusBadge = getStatusBadge(ref.status);
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{startIndex + idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{ref.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{ref.designation}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{ref.contact_number}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{ref.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          <statusBadge.icon className="text-xs" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewItem(ref)}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => {
                              setEditReferenceId(ref.id);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-lg transition-all"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(ref.id, ref.name)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPreviewItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaEye className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{previewItem.name}</h2>
                    <p className="text-blue-100 mt-1">Reference Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm text-white hover:rotate-90 rounded-xl transition-all duration-300"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-180px)]">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Designation</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{previewItem.designation}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted On</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{new Date(previewItem.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Contact Number</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{previewItem.contact_number}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Email</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 break-all">{previewItem.email}</p>
                </div>
              </div>

              {previewItem.status && (() => {
                const statusBadge = getStatusBadge(previewItem.status);
                const StatusIcon = statusBadge.icon;
                return (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Status</label>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusBadge.color}`}>
                      <StatusIcon />
                      {previewItem.status}
                    </span>
                  </div>
                );
              })()}

              {previewItem.admin_comment && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Admin Comment</label>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{previewItem.admin_comment}</p>
                </div>
              )}

              {previewItem.resume && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-600 rounded-2xl">
                        <FaDownload className="text-white text-3xl" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Resume Available</h3>
                        <p className="text-gray-600 dark:text-gray-400">Download attached resume</p>
                      </div>
                    </div>
                    <a
                      href={previewItem.resume}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                    >
                      <FaDownload className="text-xl" />
                      Download
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted On</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{new Date(previewItem.submitted_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editReferenceId !== null && (
        <EditEmployeeReference
          referenceId={editReferenceId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onReferenceUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setIsDeleteModalOpen(false); setDeleteId(null); setDeleteName(""); }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <FaTrash className="text-white text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Delete</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">
                Are you sure you want to delete <span className="font-semibold text-red-600 dark:text-red-500">"{deleteName}"</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This action cannot be undone and will permanently remove this reference.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setDeleteId(null); setDeleteName(""); }}
                  className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-all flex items-center gap-2"
                >
                  <FaTrash />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeReferencePage;
