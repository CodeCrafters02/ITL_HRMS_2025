import { useEffect, useState, useMemo } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

interface Company {
  id: number;
  name: string;
  address: string;
  location: string;
  email: string;
  phone_number: string;
  logo: string | null;
  admin_username: string | null;
}

const CompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof Company>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axiosInstance.get("app/company-with-admin/");
      setCompanies(response.data);
    } catch (err) {
      if ((err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<{ detail?: string }>;
        setError(axiosErr.response?.data?.detail || axiosErr.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => setDeleteConfirmId(id);

  const confirmDelete = async (id: number) => {
    try {
      await axiosInstance.delete(`app/company-with-admin/${id}/`);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast.success("Company deleted successfully.");
    } catch {
      toast.error("Failed to delete company.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSort = (field: keyof Company) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filteredCompanies = useMemo(
    () =>
      companies.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [companies, searchTerm]
  );

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      if (sortDirection === "asc") return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      else return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });
  }, [filteredCompanies, sortField, sortDirection]);

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCompanies.slice(start, start + pageSize);
  }, [sortedCompanies, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedCompanies.length / pageSize);

  if (loading) return <div>Loading companies...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <PageMeta title="Company Management" description="Manage companies" />
      <PageBreadcrumb pageTitle="Company Management" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <input
            type="text"
            placeholder="Search by company name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => navigate("/master/company/create")}
          >
            <FiPlus /> Create Company
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">S.No</TableCell>

                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    Name {sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Address
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Location
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    onClick={() => handleSort("email")}
                  >
                    Email {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Phone
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Logo
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Admin
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center p-4 text-gray-400">
                      {searchTerm ? "No companies match your search." : "No companies found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((company, idx) => (
                    <TableRow key={company.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                              <TableCell className="px-5 py-4 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.name}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.address}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.location}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.email}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.phone_number}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">
                        {company.logo ? (
                          <img src={company.logo} alt={`${company.name} Logo`} className="h-10 w-auto rounded" />
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400">{company.admin_username || "N/A"}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-gray-400 flex gap-3">
                        <button className="text-blue-600" onClick={() => navigate(`/master/company/edit/${company.id}`)}>
                          <FiEdit />
                        </button>
                        <button className="text-red-600" onClick={() => handleDelete(company.id)}>
                          <FiTrash2 />
                        </button>

                        {deleteConfirmId === company.id && (
                          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-80">
                              <div className="mb-4 font-semibold text-gray-800 dark:text-white">Confirm Delete</div>
                              <div className="mb-6 text-gray-600 dark:text-gray-300">
                                Are you sure you want to delete <b>{company.name}</b>?
                              </div>
                              <div className="flex justify-end gap-4">
                                <button
                                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                  onClick={() => confirmDelete(company.id)}
                                >
                                  Delete
                                </button>
                                <button
                                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                className="px-3 py-2 border rounded disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`px-3 py-2 border rounded ${currentPage === page ? "bg-blue-600 text-white" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="px-3 py-2 border rounded disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
            <div>
              <label className="mr-2 text-gray-600 dark:text-gray-400">Show</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-white"
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="ml-1 text-gray-600 dark:text-gray-400">entries</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CompanyPage;
