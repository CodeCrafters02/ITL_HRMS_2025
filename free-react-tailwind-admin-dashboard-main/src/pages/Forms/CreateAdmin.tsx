import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import type { AxiosError } from "axios";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

export default function CreateAdmin() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);
    try {
      const accessToken = localStorage.getItem("access");
      await axiosInstance.post(
        "/admin-register/",
        { username, email, password },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSuccess("Admin created successfully!");
      setTimeout(() => navigate("/master/admin"), 1200);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response && error.response.data) {
        // Try to get detail or fallback to stringified error
        const data = error.response.data as any;
        setError(data?.detail || JSON.stringify(data) || error.message || "Failed to create admin");
      } else {
        setError(error.message || "Failed to create admin");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Admin</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="space-y-4">
          <Label htmlFor="username">Username</Label>
          <Input
            type="text"
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="space-y-4 md:col-span-2">
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full"
          />
        </div>
        {error && <div className="text-red-500 text-sm md:col-span-2">{error}</div>}
        {success && <div className="text-green-500 text-sm md:col-span-2">{success}</div>}
        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={formLoading}
          >
            {formLoading ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            onClick={() => navigate("/master/admin")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
