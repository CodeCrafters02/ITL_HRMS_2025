import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

const AdminPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axiosInstance.get(
          "/admin-register/"
        );
        setAdmins(response.data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  if (loading) return <div>Loading admins...</div>;
  if (error) return <div>Error: {error}</div>;

  // Delete handler
  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };
  const confirmDelete = async (id: number) => {
    try {
      await axiosInstance.delete(`/admin-register/${id}/`);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success("Admin deleted successfully.");
    } catch {
      toast.error("Failed to delete admin.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Start editing a row
  const handleEdit = (admin: AdminUser) => {
    setEditId(admin.id);
    setEditUsername(admin.username);
    setEditEmail(admin.email);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditId(null);
    setEditUsername("");
    setEditEmail("");
  };

  // Save update
  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const response = await axiosInstance.put(`/admin-register/${id}/`, {
        username: editUsername,
        email: editEmail,
      });
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, username: response.data.username, email: response.data.email } : a
        )
      );
      handleCancel();
      toast.success("Admin updated successfully.");
    } catch {
      toast.error("Failed to update admin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />
      <PageMeta title="Admin List" description="Admin management page" />
      <PageBreadcrumb pageTitle="Admin List" />
      <div className="space-y-6">
        <ComponentCard title="Admin List">
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => navigate("/master/admin/create")}
          >
            Create Admin
          </button>
          <table className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden" aria-label="Admin List">
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">S.no</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Username</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Email</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-2 text-gray-400">
                    No admins found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                    <td className="px-5 py-4 text-start">{admins.findIndex(a => a.id === admin.id) + 1}</td>
                    <td className="px-5 py-4 text-start">
                      {editId === admin.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-32"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                          disabled={saving}
                        />
                      ) : (
                        admin.username
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      {editId === admin.id ? (
                        <input
                          type="email"
                          className="border rounded px-2 py-1 w-40"
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          disabled={saving}
                        />
                      ) : (
                        admin.email
                      )}
                    </td>
                    <td className="px-5 py-4 text-start flex gap-3 items-center">
                      {editId === admin.id ? (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 font-semibold"
                            title="Save"
                            onClick={() => handleSave(admin.id)}
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
                            onClick={() => handleEdit(admin)}
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                            onClick={() => handleDelete(admin.id)}
                          >
                            <FiTrash2 />
                          </button>
                          {deleteConfirmId === admin.id && (
                            <div className="fixed inset-0 flex items-center justify-center z-50  bg-opacity-30">
                              <div className="bg-white rounded-lg shadow-lg p-6 w-80">
                                <div className="mb-4 text-lg font-semibold text-gray-800">Confirm Delete</div>
                                <div className="mb-6 text-gray-600">Are you sure you want to delete this {admin.username}?</div>
                                <div className="flex gap-4 justify-end">
                                  <button
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    onClick={() => confirmDelete(admin.id)}
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

export default AdminPage;
