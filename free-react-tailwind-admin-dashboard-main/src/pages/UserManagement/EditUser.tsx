import React, { useEffect, useState } from "react";
import { getUserById, updateUser, UserRegister } from "./api";

interface EditUserProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const EditUser: React.FC<EditUserProps> = ({ userId, isOpen, onClose, onUpdated }) => {
  const [userData, setUserData] = useState<Partial<UserRegister>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError("");
    getUserById(userId)
      .then((data) => {
        setUserData(data);
      })
      .catch(() => {
        setError("Failed to load user data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, userId]);

  const handleChange = (field: keyof UserRegister, value: any) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      // Build data to update; include password only if provided
      const updateData: Partial<UserRegister> & { password?: string } = {
        username: userData.username!,
        email: userData.email!,
        role: userData.role!,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_active: userData.is_active,
      };

      if (password) {
        updateData.password = password;
      }

      await updateUser(userId, updateData);
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) return <div>Loading user data...</div>;

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit User</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Username</label>
            <input
              type="text"
              required
              value={userData.username || ""}
              onChange={(e) => handleChange("username", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              required
              value={userData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">First Name</label>
            <input
              type="text"
              value={userData.first_name || ""}
              onChange={(e) => handleChange("first_name", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Last Name</label>
            <input
              type="text"
              value={userData.last_name || ""}
              onChange={(e) => handleChange("last_name", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Role</label>
            <select
              value={userData.role || "employee"}
              onChange={(e) => handleChange("role", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="master">Master</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {/* <div>
            <label className="block mb-1 font-medium">New Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Confirm new password"
            />
          </div> */}

            <div className="flex items-center space-x-2">
                <input
                id="isActive"
                type="checkbox"
                checked={!!userData.is_active}
                onChange={() => handleChange("is_active", !userData.is_active)}
                className="h-4 w-4"
                />
                <label htmlFor="isActive" className="font-medium">
                Active
                </label>
            </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
