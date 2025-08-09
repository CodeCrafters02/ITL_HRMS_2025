import { useEffect, useState } from "react";
import { FiTrash2, FiEdit } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { getUserList, deleteUser,userId } from "./api";
import AddUser from "./AddUser";
import EditUser from "./EditUser";

export interface UserRegister {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  created_by?: number;
  // Add other fields if needed
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const userList = await getUserList(userId);
      setUsers(userList);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert("Failed to delete user.");
    }
  };

  // Called after adding a new user
  const onUserAdded = (newUser: UserRegister) => {
    setUsers((prev) => [newUser, ...prev]);
    setIsAddModalOpen(false);
  };

  // Called after updating a user
  const onUserUpdated = () => {
    fetchUsers();
    setIsEditModalOpen(false);
    setEditUserId(null);
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <PageMeta title="User Management" description="Manage users" />
      <PageBreadcrumb pageTitle="User Management" />
      <div className="space-y-6">
        <ComponentCard title="Users List">
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New User
          </button>

          <table
            className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden"
            aria-label="Users List"
          >
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  S.no
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Username
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Email
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  First Name
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Last Name 
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Role
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Active
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 text-left text-theme-xs dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-2 text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.08]"
                  >
                    <td className="px-5 py-4 text-start">{idx + 1}</td>
                    <td className="px-5 py-4 text-start">{user.username}</td>
                    <td className="px-5 py-4 text-start">{user.email}</td>
                    <td className="px-5 py-4 text-start">{user.first_name}</td>
                    <td className="px-5 py-4 text-start">{user.last_name}</td>
                    <td className="px-5 py-4 text-start">{user.role}</td>
                    <td className="px-5 py-4 text-start">{user.is_active ? "Yes" : "No"}</td>
                    <td className="px-5 py-4 text-start flex gap-3 items-center">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                        onClick={() => {
                          setEditUserId(user.id);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                        onClick={() => handleDelete(user.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ComponentCard>
      </div>

      {isAddModalOpen && (
        <AddUser
          onClose={() => setIsAddModalOpen(false)}
          onAdd={onUserAdded}
        />
      )}
      {isEditModalOpen && editUserId !== null && (
        <EditUser
          userId={editUserId}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onUserUpdated}
        />
      )}
    </>
  );
};

export default UserManagementPage;
