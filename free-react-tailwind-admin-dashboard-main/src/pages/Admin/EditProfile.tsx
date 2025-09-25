import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import FileInput from "../../components/form/input/FileInput";
import { axiosInstance } from "../Dashboard/api";

const API_URL = "app/company-update";

type Company = {
  id: number;
  name: string;
  address: string;
  location?: string;
  email: string;
  phone_number: string;
  logo?: File | string;
  logo_url?: string;
};

const EditCompanyProfile: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const navigate = useNavigate();
  // Removed unused originalCompany state
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Removed unused originalLogoPreview state

  useEffect(() => {
    axiosInstance.get(`${API_URL}/`)
      .then(res => {
        // Deep copy to avoid reference issues
        setCompany({ ...res.data });
  setLogoPreview(res.data.logo_url || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!company) return;
    setCompany({ ...company, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && company) {
      const file = e.target.files[0];
      setCompany({ ...company, logo: file });
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  // no-op

    if (!company) return;
    const data = new FormData();
    data.append("name", company.name);
    data.append("address", company.address);
    data.append("location", company.location || "");
    data.append("email", company.email);
    data.append("phone_number", company.phone_number);
    if (company.logo instanceof File) {
      data.append("logo", company.logo);
    }

    try {
      const res = await axiosInstance.put(`${API_URL}/${company.id}/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  // success
      setCompany(res.data);
      setLogoPreview(res.data.logo_url || null);
    } catch {
      // Handle error if needed
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <ComponentCard title="Edit Company Profile" desc="Update your company details below.">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 font-medium">Company Name</label>
          <Input
            name="name"
            value={company?.name || ""}
            onChange={handleChange}
            disabled
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Address</label>
          <TextArea
            value={company?.address || ""}
            onChange={val => handleChange({
              target: { name: "address", value: val }
            } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)}
            rows={4}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Location</label>
          <Input
            name="location"
            value={company?.location || ""}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Email</label>
          <Input
            name="email"
            value={company?.email || ""}
            onChange={handleChange}
            disabled
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Phone Number</label>
          <Input
            name="phone_number"
            value={company?.phone_number || ""}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Company Logo</label>
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Company Logo"
              className="mb-2 rounded border w-32 h-32 object-contain"
            />
          )}
          <FileInput
            name="logo"
            onChange={handleLogoChange}
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Update
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            onClick={() => {
              navigate(-1);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default EditCompanyProfile;