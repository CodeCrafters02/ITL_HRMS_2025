import { useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../pages/Dashboard/api";

export default function CreateAdmin() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const accessToken = localStorage.getItem("access");
      await axiosInstance.post(
        "app/admin-register/",
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
      let errorMsg = "Failed to create admin";
      if (err && typeof err === "object") {
        const axiosErr = err as AxiosError;
        if (axiosErr.response && axiosErr.response.data) {
          if (typeof axiosErr.response.data === "string") {
            errorMsg = axiosErr.response.data;
          } else if (typeof axiosErr.response.data === "object" && "detail" in axiosErr.response.data) {
            const dataObj = axiosErr.response.data as Record<string, unknown>;
            if (typeof dataObj.detail === "string") {
              errorMsg = dataObj.detail;
            }
          }
        } else if (axiosErr.message) {
          errorMsg = axiosErr.message;
        }
      }
      setError(errorMsg);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Admin</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
          <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => navigate("/master/admin")}>Cancel</button>
        </div>
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {success && <div className="text-green-500 mt-2">{success}</div>}
      </form>
    </div>
  );
}
