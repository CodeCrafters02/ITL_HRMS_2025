import { useEffect, useState, useMemo } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { FiTrash2, FiPlus, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

const AdminPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof AdminUser>("username");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await axiosInstance.get("app/admin-register/");
      setAdmins(response.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => setDeleteConfirmId(id);

  const confirmDelete = async (id: number) => {
    try {
      await axiosInstance.delete(`app/admin-register/${id}/`);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success("Admin deleted successfully.");
    } catch {
      toast.error("Failed to delete admin.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSort = (field: keyof AdminUser) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filteredAdmins = useMemo(
    () => admins.filter((a) => a.username.toLowerCase().includes(searchTerm.toLowerCase())),
    [admins, searchTerm]
  );

  const sortedAdmins = useMemo(() => {
    return [...filteredAdmins].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      if (sortDirection === "asc") return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      else return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });
  }, [filteredAdmins, sortField, sortDirection]);

  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAdmins.slice(start, start + pageSize);
  }, [sortedAdmins, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAdmins.length / pageSize);

  if (loading) return <div>Loading admins...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <PageMeta title="Admin Management" description="Manage admins" />
      <PageBreadcrumb pageTitle="Admin Management" />

      <div className="space-y-6">
        {/* Search & Create */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => navigate("/master/admin/create")}
            >
              <FiPlus /> Create Admin
            </button>
          </div>
        </div>

        {/* Admin Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-gray-500 text-start dark:text-white">S.No</TableCell>
                  <TableCell
                    isHeader
                    onClick={() => handleSort("username")}
                    className="px-5 py-3 text-gray-500 text-start cursor-pointer dark:text-white"
                  >
                    Username {sortField === "username" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </TableCell>
                  <TableCell
                    isHeader
                    onClick={() => handleSort("email")}
                    className="px-5 py-3 text-gray-500 text-start cursor-pointer dark:text-white"
                  >
                    Email {sortField === "email" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-gray-500 text-start dark:text-white">Actions</TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center p-4 text-gray-400" colSpan={4}>
                      {searchTerm ? "No admins match your search." : "No admins found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAdmins.map((admin, index) => (
                    <TableRow key={admin.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                      <TableCell className="px-5 py-4 dark:text-white">
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="px-5 py-4 dark:text-white">{admin.username}</TableCell>
                      <TableCell className="px-5 py-4 dark:text-white">{admin.email}</TableCell>
                      <TableCell className="px-5 py-4 flex gap-3">
                        <button
                          className="text-blue-600"
                          onClick={() => navigate(`/master/admin/edit/${admin.id}`)}
                        >
                          <FiEdit />
                        </button>
                        <button className="text-red-600" onClick={() => handleDelete(admin.id)}>
                          <FiTrash2 />
                        </button>

                        {deleteConfirmId === admin.id && (
                          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-80">
                              <div className="mb-4 font-semibold text-gray-800 dark:text-white">Confirm Delete</div>
                              <div className="mb-6 text-gray-600 dark:text-gray-300">
                                Are you sure you want to delete {admin.username}?
                              </div>
                              <div className="flex justify-end gap-4">
                                <button
                                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                  onClick={() => confirmDelete(admin.id)}
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
      </div>
    </>
  );
};

export default AdminPage;
