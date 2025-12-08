import React, { useEffect, useState } from 'react';
import { axiosInstance } from './api';
import { FaSearch, FaImage, FaVideo, FaFileAlt, FaEye, FaTimes, FaDownload, FaGraduationCap, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface LearningCorner {
  id: number;
  title: string;
  description: string;
  image?: string | null;
  video?: string | null;
  document?: string | null;
}

type FilterType = 'all' | 'image' | 'video' | 'document';
type SortType = 'newest' | 'oldest' | 'az';
type ViewType = 'card' | 'table';

const EmployeeLearningCorner: React.FC = () => {
  const [items, setItems] = useState<LearningCorner[]>([]);
  const [filteredItems, setFilteredItems] = useState<LearningCorner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LearningCorner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axiosInstance.get('emp-learning-corner/');
      setItems(res.data);
      setLoading(false);
    } catch {
      setError('Failed to load learning resources');
      setLoading(false);
    }
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
    setCurrentPage(1);
  }, [searchQuery, filterType, sortType, items]);

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
          <p className="text-xl">{error}</p>
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
              <FaGraduationCap className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Corner</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Explore company learning resources and materials</p>
            </div>
          </div>
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
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter by Type */}
          <div className="relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
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

      {/* Top Pagination */}
      {filteredItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Items per page selector */}
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

            {/* Page navigation */}
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
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredItems.length)}</span> of <span className="font-medium">{filteredItems.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaGraduationCap className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Resources Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterType !== 'all' ? 'Try adjusting your search or filter criteria' : 'No learning resources available'}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map((item) => {
            const badges = getContentBadges(item);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : item.video ? (
                    <video src={item.video} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FaGraduationCap className="text-6xl text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaEye className="text-4xl text-white" />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{item.description || 'No description'}</p>

                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <badge.icon className="text-xs" />
                        {badge.label}
                      </span>
                    ))}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Preview</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Content Type</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
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
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">{item.description || 'No description'}</div>
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
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
                            title="View Details"
                          >
                            <FaEye />
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
      )
      }

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPreviewItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(92vh-180px)]">
              {previewItem.description && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{previewItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {previewItem.image && (
                  <div className="group bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <img src={previewItem.image} alt={previewItem.title} className="w-full h-64 object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}

                {previewItem.video && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <video src={previewItem.video} controls className="w-full h-64 object-cover rounded-xl" />
                  </div>
                )}
              </div>

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
                      className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
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
      )
      }
    </div >
  );
};

export default EmployeeLearningCorner;
