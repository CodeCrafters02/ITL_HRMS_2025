import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { toast } from "react-toastify";

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

const EditAdminPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await axiosInstance.get(`app/admin-register/${id}/`);
        setAdmin(res.data);
        setUsername(res.data.username);
        setEmail(res.data.email);
      } catch {
        toast.error("Failed to fetch admin data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`app/admin-register/${id}/`, { username, email });
      toast.success("Admin updated successfully.");
      navigate("/master/admin");
    } catch {
      toast.error("Failed to update admin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!admin) return <div>Admin not found</div>;

  return (
    <div className="p-8 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-4">
      <h1 className="text-xl font-bold dark:text-white">Edit Admin</h1>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          className="bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-white px-4 py-2 rounded hover:bg-gray-400"
          onClick={() => navigate("/master/admin")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditAdminPage;
