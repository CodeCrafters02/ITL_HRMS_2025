import { useEffect, useState, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { axiosInstance } from "./api";

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

const MasterDashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Company>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  if (loading)
    return <div className="text-gray-500 dark:text-gray-400">Loading companies...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <>
      <PageMeta title="Master Dashboard" description="Overview of all companies" />
      <PageBreadcrumb pageTitle="Master Dashboard" />

      {/* Search and PageSize */}
      <div className="mb-6 space-y-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
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
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Show:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">entries</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] z-index-[100000000]">
        <div className="max-w-full overflow-x-auto">        
          <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
              >
                #
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Name {sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </TableCell>
              {/* <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                onClick={() => handleSort("address")}
              >
                Address {sortField === "address" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </TableCell> */}
              {/* <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                onClick={() => handleSort("location")}
              >
                Location {sortField === "location" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </TableCell> */}
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400"
              >
                Logo
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                onClick={() => handleSort("email")}
              >
                Email {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400"
              >
                Phone
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400"
              >
                Admin
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400"
              >
                Admin Email
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              paginatedCompanies.map((c, idx) => (
                <TableRow key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                  <TableCell className="px-5 py-4 font-semibold text-gray-800 dark:text-white">{c.name}</TableCell>
                  {/* <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.address}</TableCell> */}
                  {/* <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.location}</TableCell> */}
                  <TableCell className="px-5 py-4">
                    {c.logo ? <img src={c.logo} alt="Logo" className="w-10 h-10 rounded-full" /> : <span className="text-gray-400 dark:text-gray-500">No logo</span>}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.email}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.phone_number}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.admins[0]?.username ?? <span className="text-gray-400 dark:text-gray-500">No admin</span>}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.admins[0]?.email ?? <span className="text-gray-400 dark:text-gray-500">No admin</span>}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white border border-blue-600"
                      : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </>
  );
};

export default MasterDashboard;
