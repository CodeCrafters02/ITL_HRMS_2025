import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

interface Company {
  id: number;
  name: string;
  address: string;
  location: string;
  email: string;
  phone_number: string;
  logo: string | null;
  admin_username: string | null;
  admin?: number; // admin user id
}

interface AdminUser {
  id: number;
  username: string;
}

const CompanyList: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const navigate = useNavigate();
  // Fetch admin users for dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axiosInstance.get("app/admin-register/");
        setAdminUsers(response.data);
      } catch {
        // ignore
      }
    };
    fetchAdmins();
  }, []);
  // Delete handler
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };
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

  // Start editing a row
  const handleEdit = (company: Company) => {
    setEditId(company.id);
    // Prefill admin field with admin user id if available
    let adminId = company.admin;
    // If adminId is not set, try to find by username
    if (!adminId && company.admin_username) {
      const found = adminUsers.find(a => a.username === company.admin_username);
      if (found) adminId = found.id;
    }
    setEditCompany({ ...company, admin: adminId });
    setLogoFile(null); // Reset logo file on edit
  };

  // Cancel editing
  const handleCancel = () => {
    setEditId(null);
    setEditCompany({});
    setLogoFile(null);
  };

  // Save update
  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(editCompany).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Only handle string and number values for FormData
          formData.append(key, String(value));
        }
      });
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      const response = await axiosInstance.put(`app/company-with-admin/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...response.data } : c
        )
      );
      handleCancel();
    } catch {
      toast.error("Failed to update company.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
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
    fetchCompanies();
  }, []);

  if (loading) return <div>Loading companies...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />
      <PageMeta title="Company List" description="Company management page" />
      <PageBreadcrumb pageTitle="Company List" />
      <div className="space-y-6">
        <ComponentCard title="Company List">
          <button
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => navigate("/master/company/create")}
          >
            Create Company
          </button>
          <table className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden">
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">S.no</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Name</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Address</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Location</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Email</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Phone</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Logo</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Admin</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-2 text-gray-400">
                    No companies found.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                    <td className="px-5 py-4 text-start">{companies.findIndex(c => c.id === company.id) + 1}</td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-32"
                          value={editCompany.name || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, name: e.target.value }))}
                          disabled={saving}
                        />
                      ) : (
                        company.name
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-40"
                          value={editCompany.address || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, address: e.target.value }))}
                          disabled={saving}
                        />
                      ) : (
                        company.address
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-32"
                          value={editCompany.location || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, location: e.target.value }))}
                          disabled={saving}
                        />
                      ) : (
                        company.location
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <input
                          type="email"
                          className="border rounded px-2 py-1 w-40"
                          value={editCompany.email || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, email: e.target.value }))}
                          disabled={saving}
                        />
                      ) : (
                        company.email
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-32"
                          value={editCompany.phone_number || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, phone_number: e.target.value }))}
                          disabled={saving}
                        />
                      ) : (
                        company.phone_number
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <div className="flex flex-col gap-2">
                          {editCompany.logo && typeof editCompany.logo === "string" && (
                            <img
                              src={editCompany.logo}
                              alt={`${editCompany.name} Logo`}
                              className="h-10 w-auto rounded"
                            />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                setLogoFile(e.target.files[0]);
                              }
                            }}
                            disabled={saving}
                          />
                        </div>
                      ) : company.logo ? (
                        <img
                          src={company.logo}
                          alt={`${company.name} Logo`}
                          className="h-10 w-auto rounded"
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === company.id ? (
                        <select
                          className="border rounded px-2 py-1 w-40"
                          value={editCompany.admin || ""}
                          onChange={e => setEditCompany(ec => ({ ...ec, admin: Number(e.target.value) }))}
                          disabled={saving}
                        >
                          <option value="">Select Admin</option>
                          {adminUsers.map((admin) => (
                            <option key={admin.id} value={admin.id}>{admin.username}</option>
                          ))}
                        </select>
                      ) : (
                        company.admin_username || "N/A"
                      )}
                    </td>
                    <td className="px-5 py-4 text-start flex gap-3 items-center">
                      {editId === company.id ? (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 font-semibold"
                            title="Save"
                            onClick={() => handleSave(company.id)}
                            disabled={saving}
                          >
                            Save
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-800 font-semibold"
                            title="Cancel"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                            onClick={() => handleEdit(company)}
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                            onClick={() => handleDelete(company.id)}
                          >
                            <FiTrash2 />
                          </button>
                          {deleteConfirmId === company.id && (
                            <div className="fixed inset-0 flex items-center justify-center z-50  bg-opacity-30">
                              <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                                <div className="mb-4 text-lg font-semibold text-gray-800">Confirm Delete</div>
                                <div className="mb-6 text-gray-600">Are you sure you want to delete this <b>{company.name}</b>?</div>
                                <div className="flex gap-4 justify-end">
                                  <button
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    onClick={() => confirmDelete(company.id)}
                                  >
                                    Delete
                                  </button>
                                  <button
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                    onClick={() => setDeleteConfirmId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ComponentCard>
      </div>
    </>
  );
};

export default CompanyList;
