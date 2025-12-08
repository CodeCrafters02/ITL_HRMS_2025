import { useEffect, useState, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { axiosInstance } from "./api";
import { toast } from "react-toastify";

interface AdminUser {
  username: string;
  email: string;
}

interface Company {
  id: number;
  name: string;
  address: string;
  location: string;
  email: string;
  phone_number: string;
  logo: string | null;
  admins: AdminUser[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: number; isPositive: boolean };
  delay?: number;
}

const StatCard = ({ title, value, icon, gradient, trend, delay = 0 }: StatCardProps) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${trend.isPositive ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d={trend.isPositive ? "M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" : "M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"} clipRule="evenodd" />
            </svg>
            {trend.value}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium opacity-90 mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
    <div className="absolute -right-6 -bottom-6 opacity-10">
      <div className="scale-[2.5]">{icon}</div>
    </div>
  </div>
);

const MasterDashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Company>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    location: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await axiosInstance.get("app/master-dashboard/");
      setCompanies(res.data.companies);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditForm({
      name: company.name,
      email: company.email,
      phone_number: company.phone_number,
      address: company.address,
      location: company.location
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;
    
    try {
      console.log("Attempting to update company:", editingCompany.id, editForm);
      await axiosInstance.put(`app/company-with-admin/${editingCompany.id}/`, editForm);
      console.log("Company update successful");
      toast.success("Company updated successfully");
      setEditingCompany(null);
      fetchCompanies(); // Refresh the list
    } catch (err: unknown) {
      console.error("Error updating company:", err);
      toast.error("Failed to update company");
    }
  };

  const handleSort = (field: keyof Company) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      const aValue = a[sortField] ?? "";
      const bValue = b[sortField] ?? "";
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });
  }, [filteredCompanies, sortField, sortDirection]);

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCompanies.slice(start, start + pageSize);
  }, [sortedCompanies, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedCompanies.length / pageSize);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const totalAdmins = companies.reduce((sum, c) => sum + c.admins.length, 0);
    const companiesWithLogo = companies.filter(c => c.logo).length;
    const avgAdminsPerCompany = totalCompanies > 0 ? (totalAdmins / totalCompanies).toFixed(1) : 0;
    
    return {
      totalCompanies,
      totalAdmins,
      companiesWithLogo,
      avgAdminsPerCompany
    };
  }, [companies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Master Dashboard | HRMS" description="Comprehensive overview of all companies and administrators" />
      <PageBreadcrumb pageTitle="Master Dashboard" />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fadeIn">
        <StatCard
          title="Total Companies"
          value={stats.totalCompanies}
          icon={
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          }
          gradient="from-blue-600 to-blue-800"
          trend={{ value: 12, isPositive: true }}
          delay={0}
        />
        <StatCard
          title="Total Administrators"
          value={stats.totalAdmins}
          icon={
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          }
          gradient="from-purple-600 to-purple-800"
          trend={{ value: 8, isPositive: true }}
          delay={100}
        />
        <StatCard
          title="Companies with Logos"
          value={stats.companiesWithLogo}
          icon={
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          }
          gradient="from-green-600 to-green-800"
          trend={{ value: 5, isPositive: true }}
          delay={200}
        />
        <StatCard
          title="Avg Admins/Company"
          value={stats.avgAdminsPerCompany}
          icon={
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          }
          gradient="from-orange-600 to-orange-800"
          delay={300}
        />
      </div>

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 shadow-sm hover:shadow-md"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-4 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchTerm && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white dark:bg-gray-600 shadow-md" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                title="Table View"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-600 shadow-md" : "hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                title="Grid View"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchCompanies}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border-0 bg-transparent text-sm font-medium dark:text-white focus:ring-0"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Table or Grid View */}
      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg">
          <div className="max-w-full overflow-x-auto">        
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-blue-500 dark:border-blue-400">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider"
                  >
                    #
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors uppercase text-xs tracking-wider"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Company Name
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider"
                  >
                    Logo
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors uppercase text-xs tracking-wider"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider"
                  >
                    Phone
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider"
                  >
                    Admin
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No companies found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((c, idx) => (
                    <TableRow key={c.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <TableCell className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                          <span className="font-semibold text-gray-800 dark:text-white text-base">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        {c.logo ? (
                          <div className="relative group">
                            <img src={c.logo} alt={c.name} className="w-12 h-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-600 object-cover group-hover:ring-blue-500 transition-all" />
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          <span className="text-sm">{c.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          <span className="text-sm">{c.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                              {c.admins[0]?.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white text-sm">
                                {c.admins[0]?.username || "No admin"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {c.admins[0]?.email || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCompany(c)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditCompany(c)}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedCompanies.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <svg className="w-24 h-24 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-xl font-medium">No companies found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your search criteria</p>
            </div>
          ) : (
            paginatedCompanies.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 group hover:border-blue-500 dark:hover:border-blue-400 transform hover:-translate-y-2"
              >
                {/* Card Header with Logo */}
                <div className="relative h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute -bottom-10 left-6">
                    {c.logo ? (
                      <img
                        src={c.logo}
                        alt={c.name}
                        className="w-20 h-20 rounded-xl ring-4 ring-white dark:ring-gray-800 object-cover shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl ring-4 ring-white dark:ring-gray-800 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="pt-14 px-6 pb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {c.name}
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-400 truncate">{c.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-400">{c.phone_number}</span>
                    </div>
                  </div>

                  {/* Admin Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {c.admins[0]?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {c.admins[0]?.username || "No admin"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {c.admins[0]?.email || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCompany(c)}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      View Details
                    </button>
                    <button onClick={() => handleEditCompany(c)} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-800 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-gray-800 dark:text-white">
                {Math.min(currentPage * pageSize, sortedCompanies.length)}
              </span>{" "}
              of <span className="font-semibold text-gray-800 dark:text-white">{sortedCompanies.length}</span> companies
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-all"
                title="First Page"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-all"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 text-sm font-semibold rounded-lg transition-all ${
                        currentPage === pageNum
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-110"
                          : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-all"
              >
                Next
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-all"
                title="Last Page"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 animate-slideUp">
            {/* Modal Header */}
            <div className="relative h-32 bg-gradient-to-br from-green-600 via-blue-600 to-purple-600">
              <button
                onClick={() => setEditingCompany(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute -bottom-12 left-8">
                {editingCompany.logo ? (
                  <img
                    src={editingCompany.logo}
                    alt={editingCompany.name}
                    className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800 object-cover shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="pt-16 px-8 pb-8 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Edit Company</h2>
              
              <div className="space-y-6">
                {/* Company Information Form */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" clipRule="evenodd" />
                    </svg>
                    Company Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={editForm.phone_number}
                          onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Address
                      </label>
                      <textarea
                        value={editForm.address}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter company address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setEditingCompany(null)}
                  className="flex-1 py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 animate-slideUp">
            {/* Modal Header */}
            <div className="relative h-32 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
              <button
                onClick={() => setSelectedCompany(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute -bottom-12 left-8">
                {selectedCompany.logo ? (
                  <img
                    src={selectedCompany.logo}
                    alt={selectedCompany.name}
                    className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800 object-cover shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="pt-16 px-8 pb-8 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{selectedCompany.name}</h2>
              
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                      <p className="text-gray-800 dark:text-white font-medium">{selectedCompany.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                      <p className="text-gray-800 dark:text-white font-medium">{selectedCompany.phone_number}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
                      <p className="text-gray-800 dark:text-white font-medium">{selectedCompany.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                      <p className="text-gray-800 dark:text-white font-medium">{selectedCompany.location}</p>
                    </div>
                  </div>
                </div>

                {/* Administrator Information */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Administrators ({selectedCompany.admins.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedCompany.admins.map((admin, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {admin.username[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-white">{admin.username}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{admin.email}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MasterDashboard;
