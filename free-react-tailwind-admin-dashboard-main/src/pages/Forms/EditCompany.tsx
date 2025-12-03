// Declare global variable from Vite config
declare const __API_URL__: string;

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../Dashboard/api";
import { toast } from "react-toastify";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";

interface AdminUser {
  id: number;
  username: string;
  email?: string;
}

interface Company {
  id: number;
  name: string;
  address: string;
  location: string;
  email: string;
  phone_number: string;
  logo: string | null;
  logo_url?: string;
  admin?: number;
  admin_id?: number;
  admin_username?: string;
  admin_email?: string;
}

const EditCompany: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Fetch company details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await axiosInstance.get(`app/company-with-admin/${id}/`);
        setCompany(res.data);
      } catch {
        toast.error("Failed to load company details");
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id]);

  // Fetch admin users for dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await axiosInstance.get(`${__API_URL__}/app/admin-register/`);
        if (Array.isArray(res.data)) setAdmins(res.data);
      } catch {
        toast.error("Failed to load admin users");
      }
    };
    fetchAdmins();
  }, []);

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", company.name);
      formData.append("address", company.address);
      formData.append("location", company.location);
      formData.append("email", company.email);
      formData.append("phone_number", company.phone_number);
      if (company.admin) formData.append("admin", String(company.admin));
      if (logoFile) formData.append("logo", logoFile);

      await axiosInstance.put(`app/company-with-admin/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Company updated successfully");
      navigate("/master/company/");
    } catch {
      toast.error("Failed to update company");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading company details...</p>;
  if (!company) return <p>Company not found.</p>;

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Edit Company" />
      <ComponentCard title={`Editing: ${company.name}`}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-1 dark:text-white">Name</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Email</label>
            <input
              type="email"
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Address</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Location</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.location}
              onChange={(e) => setCompany({ ...company, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Phone Number</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.phone_number}
              onChange={(e) => setCompany({ ...company, phone_number: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Logo</label>
            {(company.logo_url || company.logo) && (
              <img
                src={company.logo_url || company.logo || ""}
                alt="Company Logo"
                className="h-12 mb-2 rounded"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
              }}
            />
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-white">Admin</label>
            <select
              className="border rounded px-3 py-2 w-full dark:text-white"
              value={company.admin || company.admin_id || ""}
              onChange={(e) =>
                setCompany({ ...company, admin: Number(e.target.value) })
              }
            >
              <option value="">Select Admin</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.username} {admin.email ? `(${admin.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => navigate("/master/company/")}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </ComponentCard>
    </div>
  );
};

export default EditCompany;
