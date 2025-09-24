import { useEffect, useState } from "react";
import { axiosInstance } from "../Dashboard/api";
import { useNavigate } from "react-router-dom";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";

interface AdminUser {
  id: number;
  username: string;
}

export default function CreateCompany() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    location: "",
    email: "",
    phone_number: "",
    logo: null as File | null,
    admin_id: ""
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await axiosInstance.get("https://apihrms.innovyxtechlabs.com/api/app/admin-register/");
        console.log("Admin API response:", res.data); // Debug output
        if (Array.isArray(res.data)) {
          setAdmins(res.data.map((a) => ({ id: a.id, username: a.username })));
        } else {
          setAdmins([]);
        }
      } catch (err) {
        console.error("Failed to fetch admins", err);
        setAdmins([]);
      }
    };
    fetchAdmins();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    if (type === "file" && files) {
      setForm({ ...form, [name]: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("address", form.address);
      formData.append("location", form.location);
      formData.append("email", form.email);
      formData.append("phone_number", form.phone_number);
      if (form.logo) {
        formData.append("logo", form.logo);
      }
      if (form.admin_id) {
        formData.append("admin", form.admin_id);
      }
      const res = await axiosInstance.post("/company-with-admin/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Company creation response:", res.data);
      navigate("/master/company"); 
    } catch (err: unknown) {
      console.error("Company creation error:", err);
  type AxiosErrorType = { response?: { data?: { detail?: string } }, message?: string };
  const errorObj = err as AxiosErrorType;
      if (errorObj.response) {
        setFormError(
          errorObj.response.data?.detail ||
          JSON.stringify(errorObj.response.data) ||
          "Failed to create company"
        );
      } else {
        setFormError("Failed to create company: " + (errorObj.message || String(err)));
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Company</h1>
      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="space-y-4">
          <Label htmlFor="name">Name</Label>
          <Input type="text" name="name" id="name" value={form.name} onChange={handleFormChange} required className="w-full" />
        </div>
        <div className="space-y-4">
          <Label htmlFor="address">Address</Label>
          <Input type="text" name="address" id="address" value={form.address} onChange={handleFormChange} required className="w-full" />
        </div>
        <div className="space-y-4">
          <Label htmlFor="location">Location</Label>
          <Input type="text" name="location" id="location" value={form.location} onChange={handleFormChange} required className="w-full" />
        </div>
        <div className="space-y-4">
          <Label htmlFor="email">Email</Label>
          <Input type="email" name="email" id="email" value={form.email} onChange={handleFormChange} required className="w-full" />
        </div>
        <div className="space-y-4">
          <Label htmlFor="phone_number">Phone Number</Label>
          <Input type="text" name="phone_number" id="phone_number" value={form.phone_number} onChange={handleFormChange} required className="w-full" />
        </div>
        <div className="space-y-4">
          <Label htmlFor="logo">Logo</Label>
          <Input type="file" name="logo" id="logo" accept="image/*" onChange={handleFormChange} className="w-full" />
        </div>
        <div className="space-y-4 md:col-span-2">
          <Label htmlFor="admin_id">Admin</Label>
          <Select
            options={admins.map(admin => ({ value: String(admin.id), label: admin.username }))}
            placeholder="Select Admin"
            onChange={value => setForm(f => ({ ...f, admin_id: value }))}
            className="w-full"
            defaultValue={form.admin_id}
          />
          {admins.length === 0 && (
            <div className="text-red-500 text-xs mt-1">No admin users found. Please register an admin first.</div>
          )}
        </div>
        {formError && <div className="text-red-500 text-sm">{formError}</div>}
        <div className="flex gap-2">
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
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
