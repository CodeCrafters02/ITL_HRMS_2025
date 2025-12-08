import { useEffect, useState } from "react";
import { getEmployeeReportees, EmployeeReporteeData, getEmployeeProfessionalDetails, EmployeeProfessionalData } from "./api";
import { FaSearch, FaUsers, FaUserCheck, FaUserClock, FaEye, FaTimes, FaFilter, FaTh, FaList, FaChevronLeft, FaChevronRight, FaUser, FaBriefcase, FaPhone, FaEnvelope, FaBirthdayCake, FaClock } from "react-icons/fa";

type FilterType = 'all' | 'online' | 'away' | 'dnd' | 'offline';
type SortType = 'name' | 'department' | 'designation';
type ViewType = 'card' | 'table';

const EmployeeReporteesPage: React.FC = () => {
  const [reportees, setReportees] = useState<EmployeeReporteeData[]>([]);
  const [filteredReportees, setFilteredReportees] = useState<EmployeeReporteeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('name');
  const [viewType, setViewType] = useState<ViewType>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfessionalData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchReportees();
  }, []);

  useEffect(() => {
    let filtered = [...reportees];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(rep =>
        rep.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rep.department_name && rep.department_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rep.designation_name && rep.designation_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(rep => rep.status === filterType);
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortType === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortType === 'department') return (a.department_name || '').localeCompare(b.department_name || '');
      if (sortType === 'designation') return (a.designation_name || '').localeCompare(b.designation_name || '');
      return 0;
    });

    setFilteredReportees(filtered);
    setCurrentPage(1);
  }, [reportees, searchTerm, filterType, sortType]);

  const fetchReportees = async () => {
    try {
      const employee_id = localStorage.getItem("employee_id");
      if (!employee_id) throw new Error("Employee ID not found in localStorage");

      const list = await getEmployeeReportees({ employee_id });
      setReportees(list);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load reportees");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Determine effective status based on check-in
  const getEffectiveStatus = (reportee: EmployeeReporteeData): string => {
    // If employee is checked in, they are online
    if (reportee.is_checked_in) {
      return 'online';
    }
    // Otherwise use the status from the API
    return reportee.status;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'online': return { color: 'bg-green-500', label: 'Online', textColor: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' };
      case 'away': return { color: 'bg-yellow-500', label: 'Away', textColor: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
      case 'dnd': return { color: 'bg-red-500', label: 'DND', textColor: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
      case 'offline': return { color: 'bg-gray-400', label: 'Offline', textColor: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
      default: return { color: 'bg-gray-400', label: 'Unknown', textColor: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
    }
  };

  const handleViewProfile = async (employeeId: string) => {
    setModalLoading(true);
    setModalOpen(true);
    try {
      const employeeData = await getEmployeeProfessionalDetails(employeeId);
      setSelectedEmployee(employeeData);
    } catch (err) {
      console.error("Failed to load employee details:", err);
      setSelectedEmployee(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEmployee(null);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredReportees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReportees = filteredReportees.slice(startIndex, endIndex);

  // Stats calculations - use effective status
  const onlineCount = reportees.filter(r => getEffectiveStatus(r) === 'online').length;
  const awayCount = reportees.filter(r => getEffectiveStatus(r) === 'away').length;
  const offlineCount = reportees.filter(r => getEffectiveStatus(r) === 'offline').length;

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
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
            <FaUsers className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Reportees</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view your team members</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reportees</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{reportees.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FaUsers className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Online</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{onlineCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <FaUserCheck className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Away</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{awayCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <FaUserClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offline</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{offlineCount}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <FaUser className="text-2xl text-gray-600 dark:text-gray-400" />
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
              placeholder="Search reportees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="dnd">Do Not Disturb</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
          >
            <option value="name">Sort by Name</option>
            <option value="department">Sort by Department</option>
            <option value="designation">Sort by Designation</option>
          </select>
        </div>

        {/* Results Count and View Toggle */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {filteredReportees.length} of {reportees.length} reportees</span>
          <div className="flex items-center gap-3">
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
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
      {filteredReportees.length > 0 && (
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
                <option value={8}>8</option>
                <option value={16}>16</option>
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
              <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredReportees.length)}</span> of <span className="font-medium">{filteredReportees.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {filteredReportees.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <FaUsers className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Reportees Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filterType !== 'all' ? 'Try adjusting your search or filter criteria' : "You don't have any reportees assigned"}
          </p>
        </div>
      ) : viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedReportees.map((rep) => {
            const effectiveStatus = getEffectiveStatus(rep);
            const statusConfig = getStatusConfig(effectiveStatus);
            return (
              <div
                key={rep.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
                onClick={() => handleViewProfile(rep.employee_id)}
              >
                <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {rep.photo ? (
                    <img src={rep.photo} alt={rep.full_name} className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-white font-bold text-2xl ${rep.photo ? 'hidden' : ''}`}
                    style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                  >
                    {getInitials(rep.full_name)}
                  </div>
                  <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${statusConfig.color}`} title={statusConfig.label}></div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{rep.full_name}</h3>

                  <div className="flex justify-center mb-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                      <div className={`w-2 h-2 rounded-full ${statusConfig.color}`}></div>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{rep.department_name || "N/A"}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Designation:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{rep.designation_name || "N/A"}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProfile(rep.employee_id);
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  >
                    <FaEye />
                    View Profile
                  </button>
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Designation</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedReportees.map((rep) => {
                  const effectiveStatus = getEffectiveStatus(rep);
                  const statusConfig = getStatusConfig(effectiveStatus);
                  return (
                    <tr key={rep.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {rep.photo ? (
                            <img src={rep.photo} alt={rep.full_name} className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling!.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${rep.photo ? 'hidden' : ''}`}
                            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                          >
                            {getInitials(rep.full_name)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{rep.full_name}</div>
                            <div className="text-xs text-gray-500">{rep.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{rep.department_name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{rep.designation_name || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          <div className={`w-2 h-2 rounded-full ${statusConfig.color}`}></div>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleViewProfile(rep.employee_id)}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-all"
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
      )}

      {/* View Profile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <FaUser className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Employee Profile</h2>
                    <p className="text-blue-100 mt-1">Professional Details</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm text-white hover:rotate-90 rounded-xl transition-all duration-300"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-180px)]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
                  </div>
                </div>
              ) : selectedEmployee ? (
                <>
                  {/* Header Section */}
                  <div className="flex items-center gap-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      {selectedEmployee.photo ? (
                        <img src={selectedEmployee.photo} alt={selectedEmployee.first_name} className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg" />
                      ) : (
                        <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-white dark:border-gray-700 shadow-lg"
                          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                        >
                          {getInitials(`${selectedEmployee.first_name} ${selectedEmployee.last_name}`)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedEmployee.first_name} {selectedEmployee.middle_name || ""} {selectedEmployee.last_name}
                      </h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{selectedEmployee.designation_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Employee ID: {selectedEmployee.employee_id}</p>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                      <FaBriefcase className="text-blue-600" />
                      Professional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date of Birth */}
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl">
                        <FaBirthdayCake className="text-pink-500 text-xl mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Date of Birth</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedEmployee.date_of_birth ? new Date(selectedEmployee.date_of_birth).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl">
                        <FaBriefcase className="text-blue-500 text-xl mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Department</p>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.department_name || "N/A"}</p>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl">
                        <FaPhone className="text-green-500 text-xl mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Mobile</p>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedEmployee.mobile || "N/A"}</p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl">
                        <FaEnvelope className="text-purple-500 text-xl mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Email</p>
                          <p className="font-medium text-gray-900 dark:text-white text-sm break-all">{selectedEmployee.email || "N/A"}</p>
                        </div>
                      </div>

                      {/* Shift */}
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl md:col-span-2">
                        <FaClock className="text-orange-500 text-xl mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Shift</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedEmployee.shift_assigned?.shift_type || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FaUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Failed to load employee details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeReporteesPage;
