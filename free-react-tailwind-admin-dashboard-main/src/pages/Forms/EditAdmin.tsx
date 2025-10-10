import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import type { AxiosError } from "axios";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

export default function EditAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAdmin = async () => {
    try {
      const response = await axiosInstance.get(`app/admin-register/${id}/`);
      setAdmin(response.data);
      setUsername(response.data.username);
      setEmail(response.data.email);
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || "Failed to fetch admin details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await axiosInstance.put(`app/admin-register/${id}/`, {
        username,
        email,
      });
      toast.success("Admin updated successfully!");
      setTimeout(() => navigate("/master/admin"), 1200);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response && error.response.data) {
        const data = error.response.data as unknown as { detail?: string };
        setError(data?.detail || JSON.stringify(data) || error.message || "Failed to update admin");
      } else {
        setError(error.message || "Failed to update admin");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading admin details...</div>;
  if (!admin) return <div className="text-red-500">Admin not found.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      <PageMeta title="Edit Admin" description="Edit admin user" />
      <PageBreadcrumb pageTitle="Edit Admin" />

      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Admin</h1>
      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg dark:shadow-gray-700"
      >
        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <div className="text-red-500 text-sm md:col-span-2">{error}</div>}

        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            onClick={() => navigate("/master/admin")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
