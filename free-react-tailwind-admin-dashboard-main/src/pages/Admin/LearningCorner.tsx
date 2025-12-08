import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';
import { FaTrash, FaEdit, FaSearch, FaImage, FaVideo, FaFileAlt, FaPlus, FaEye, FaTimes, FaDownload, FaGraduationCap, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaSave } from "react-icons/fa";
import Label from '../../components/form/Label';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import FileInput from '../../components/form/input/FileInput';
import { toast } from 'react-toastify';

interface LearningCorner {
  id: number;
  title: string;
  description?: string;
  image?: string;
  document?: string;
  video?: string;
  company?: number;
}

type FilterType = 'all' | 'image' | 'video' | 'document';
type SortType = 'newest' | 'oldest' | 'az';
type ViewType = 'card' | 'table';

const LearningCornerPage: React.FC = () => {
  const [items, setItems] = useState<LearningCorner[]>([]);
  const [filteredItems, setFilteredItems] = useState<LearningCorner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', image: null, document: null, video: null });
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const [previewItem, setPreviewItem] = useState<LearningCorner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    axiosInstance.get('app/learning-corner/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data);
        setFilteredItems(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load learning corner items');
        setLoading(false);
      });
  };

  // Filter and search logic
  useEffect(() => {
    let result = [...items];

    // Apply search
    if (searchQuery) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter
    if (filterType !== 'all') {
      result = result.filter(item => {
        if (filterType === 'image') return item.image;
        if (filterType === 'video') return item.video;
        if (filterType === 'document') return item.document;
        return true;
      });
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortType === 'az') return a.title.localeCompare(b.title);
      if (sortType === 'oldest') return a.id - b.id;
      return b.id - a.id; // newest
    });

    setFilteredItems(result);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchQuery, filterType, sortType, items]);

  const handleEditClick = (item: LearningCorner) => {
    setEditId(item.id);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      image: null,
      document: null,
      video: null
    });
    setShowModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    if (type === 'file' && files) {
      setEditForm(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', editForm.title);
      data.append('description', editForm.description);
      if (editForm.image && typeof editForm.image === 'object') data.append('image', editForm.image);
      if (editForm.document && typeof editForm.document === 'object') data.append('document', editForm.document);
      if (editForm.video && typeof editForm.video === 'object') data.append('video', editForm.video);
      await axiosInstance.patch(`app/learning-corner/${editId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowModal(false);
      setEditId(null);
      toast.success('Updated successfully!', { position: 'bottom-right' });
      fetchItems();
    } catch {
      setError('Failed to update item');
      toast.error('Failed to update', { position: 'bottom-right' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`app/learning-corner/${deleteId}/`);
      setItems(items.filter(item => item.id !== deleteId));
      setDeleteId(null);
      setDeleteName("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      setError('Failed to delete item');
      toast.error('Failed to delete', { position: 'bottom-right' });
    } finally {
      setLoading(false);
    }
  };

  const getContentBadges = (item: LearningCorner) => {
    const badges = [];
    if (item.image) badges.push({ icon: FaImage, label: 'Image', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' });
    if (item.video) badges.push({ icon: FaVideo, label: 'Video', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' });
    if (item.document) badges.push({ icon: FaFileAlt, label: 'Document', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' });
    return badges;
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Page number range for display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <FaGraduationCap className="text-4xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Learning Corner</h1>
              <p className="text-blue-100 mt-1">Manage educational resources and materials</p>
            </div>
          </div>
          <button
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            onClick={() => navigate('/admin/form-learning-corner')}
          >
            <FaPlus className="text-lg" />
            Add New Resource
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
            />
          </div>

          {/* Filter by Type */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Types</option>
              <option value="image">Images Only</option>
              <option value="video">Videos Only</option>
              <option value="document">Documents Only</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A-Z</option>
          </select>
        </div>

        {/* Results Count and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredItems.length} of {items.length} resources</span>
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
                title="Card View"
              >
                <FaTh className="text-lg" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-all ${viewType === 'table'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                title="Table View"
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Pagination - Compact */}
      {filteredItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Items per page */}
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

            {/* Center: Page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous"
              >
                <FaChevronLeft className="text-sm" />
              </button>

              {totalPages <= 5 ? (
                // Show all pages if 5 or less
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
                // Show condensed view for many pages
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentPage === 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    1
                  </button>
                  {currentPage > 3 && <span className="text-gray-500">...</span>}
                  {currentPage > 2 && currentPage < totalPages - 1 && (
                    <button
                      onClick={() => setCurrentPage(currentPage)}
                      className="px-3 py-1.5 rounded-lg border text-sm bg-blue-600 text-white border-blue-600"
                    >
                      {currentPage}
                    </button>
                  )}
                  {currentPage < totalPages - 2 && <span className="text-gray-500">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${currentPage === totalPages
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next"
              >
                <FaChevronRight className="text-sm" />
              </button>
            </div>

            {/* Right: Showing range */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredItems.length)}</span> of <span className="font-medium">{filteredItems.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View - Cards or Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaGraduationCap className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Resources Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Start by adding your first learning resource'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedItems.map((item) => {
            const badges = getContentBadges(item);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                {/* Card Image/Video */}
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : item.video ? (
                    <video
                      src={item.video}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaGraduationCap className="text-6xl text-white/30" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform"
                    >
                      <FaEye /> Quick View
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {badges.map((badge, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <badge.icon className="text-xs" />
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {item.description || 'No description available'}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-all"
                    >
                      <FaEdit className="text-xs" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item.id, item.title)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-all"
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
        /* Table View */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Preview</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Content Type</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedItems.map((item) => {
                  const badges = getContentBadges(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : item.video ? (
                            <FaVideo className="text-2xl text-white" />
                          ) : (
                            <FaGraduationCap className="text-2xl text-white/50" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                          {item.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {badges.map((badge, idx) => (
                            <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                              <badge.icon className="text-xs" />
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-all"
                            title="Quick View"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id, item.title)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all"
                            title="Delete"
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


      {/* Preview Modal - Enhanced */}
      {previewItem && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setPreviewItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Header */}
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaEye className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{previewItem.title}</h2>
                    <p className="text-blue-100 mt-1">Learning Resource Preview</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm text-white hover:rotate-90 rounded-xl transition-all duration-300"
                  title="Close"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Content with Grid Layout */}
            <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(92vh-180px)] custom-scrollbar">
              {/* Description First if exists */}
              {previewItem.description && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <FaFileAlt className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Description</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{previewItem.description}</p>
                </div>
              )}

              {/* Media Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Preview */}
                {previewItem.image && (
                  <div className="group bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={previewItem.image}
                        alt={previewItem.title}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                          <FaImage className="text-xl" />
                          <span className="font-semibold">Image Resource</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Preview */}
                {previewItem.video && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <div className="relative overflow-hidden rounded-xl">
                      <video
                        src={previewItem.video}
                        controls
                        className="w-full h-64 object-cover rounded-xl"
                      />
                      <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                        <FaVideo />
                        Video
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Download Card */}
              {previewItem.document && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-green-600 rounded-2xl">
                        <FaFileAlt className="text-white text-3xl" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Document Available</h3>
                        <p className="text-gray-600 dark:text-gray-400">Download the learning material</p>
                      </div>
                    </div>
                    <a
                      href={previewItem.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <FaDownload className="text-xl" />
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Enhanced */}
      {showModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Header */}
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaEdit className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Edit Learning Resource</h2>
                    <p className="text-blue-100 mt-1">Update resource information and media</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm text-white hover:rotate-90 rounded-xl transition-all duration-300"
                  title="Close"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-280px)] custom-scrollbar">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FaFileAlt className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="title" className="text-base font-semibold">Title *</Label>
                    <InputField
                      name="title"
                      value={editForm.title}
                      onChange={handleEditChange}
                      placeholder="Enter a descriptive title"
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                    <TextArea
                      value={editForm.description}
                      onChange={(value: string) => setEditForm(prev => ({ ...prev, description: value }))}
                      placeholder="Provide detailed information about this resource..."
                      rows={5}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <FaImage className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Media Files</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Image Upload */}
                  <div>
                    <Label htmlFor="image" className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <FaImage className="text-blue-600" />
                      Image
                    </Label>
                    {items.find(i => i.id === editId)?.image && (
                      <div className="mb-3 relative group">
                        <img
                          src={items.find(i => i.id === editId)?.image}
                          alt="Current"
                          className="w-full h-32 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-800"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">Current Image</span>
                        </div>
                      </div>
                    )}
                    <FileInput
                      name="image"
                      onChange={handleEditChange}
                      className="w-full"
                    />
                  </div>

                  {/* Video Upload */}
                  <div>
                    <Label htmlFor="video" className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <FaVideo className="text-purple-600" />
                      Video
                    </Label>
                    {items.find(i => i.id === editId)?.video && (
                      <div className="mb-3 relative group">
                        <video
                          src={items.find(i => i.id === editId)?.video}
                          className="w-full h-32 object-cover rounded-lg border-2 border-purple-200 dark:border-purple-800"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">Current Video</span>
                        </div>
                      </div>
                    )}
                    <FileInput
                      name="video"
                      onChange={handleEditChange}
                      className="w-full"
                    />
                  </div>

                  {/* Document Upload */}
                  <div>
                    <Label htmlFor="document" className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <FaFileAlt className="text-green-600" />
                      Document
                    </Label>
                    {items.find(i => i.id === editId)?.document && (
                      <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaFileAlt className="text-green-600" />
                          <a
                            href={items.find(i => i.id === editId)?.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 dark:text-green-400 hover:underline truncate"
                          >
                            Current Document
                          </a>
                        </div>
                      </div>
                    )}
                    <FileInput
                      name="document"
                      onChange={handleEditChange}
                      className="w-full"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Leave fields empty to keep existing files. Upload new files to replace them.
                </p>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-8 py-3.5 rounded-xl font-semibold transition-all transform hover:scale-105"
              >
                <FaTimes />
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setDeleteId(null); setDeleteName(""); }}>
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
                This action cannot be undone and will permanently remove this learning resource.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setDeleteId(null); setDeleteName(""); }}
                  className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
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

export default LearningCornerPage;
