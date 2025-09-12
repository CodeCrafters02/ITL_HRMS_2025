import React, { useState, useEffect } from "react";
import { createUser, UserRegister, userId, getCompanies, Company } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Checkbox from "../../components/form/input/Checkbox";
import Label from "../../components/form/Label";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "employee",
    firstName: "",
    lastName: "",
    isActive: true,
    password: "",
    confirmPassword: "",
    company: "",
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        console.log("Fetching companies...");
        const companiesData = await getCompanies();
        console.log("Companies fetched:", companiesData);
        setCompanies(companiesData);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
        toast.error("Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Handle select changes
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      // Clear company when role is not employee
      company: value === "employee" ? prev.company : ""
    }));
  };

  // Handle company select changes
  const handleCompanySelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      company: value
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const newUser: UserRegister & { password: string; created_by: number } = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        first_name: formData.firstName,
        last_name: formData.lastName,
        is_active: formData.isActive,
        password: formData.password,
        created_by: parseInt(userId),
      };

      // Add company if role is employee
      if (formData.role === "employee" && formData.company) {
        newUser.company = parseInt(formData.company);
      }

      await createUser(newUser);
      toast.success("User created successfully!");
      navigate("/master/usermanagement");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel - navigate back to user management page
  const handleCancel = () => {
    navigate("/master/usermanagement");
  };

  // Prepare role options for Select component
  const roleOptions = [
    { value: "master", label: "Master" },
    { value: "admin", label: "Admin" },
    { value: "employee", label: "Employee" }
  ];

  // Prepare company options for Select component
  const companyOptions = companies.map(company => ({
    value: company.id.toString(),
    label: company.name
  }));

  return (
    <>
      <PageMeta title="Add User" description="Add new user to the system" />
      <PageBreadcrumb pageTitle="Add User" />
      
      <div className="space-y-6">
        <ComponentCard title="User Information">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Username */}
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter username"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    required
                    disabled={loading}
                  />
                </div>

                {/* First Name */}
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    disabled={loading}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Role */}
                <div>
                  <Label>Role *</Label>
                  <Select
                    options={roleOptions}
                    placeholder="Select a role"
                    onChange={handleSelectChange}
                    defaultValue={formData.role}
                    className="dark:bg-gray-900"
                  />
                </div>

                {/* Company - Show only for employee role */}
                {formData.role === "employee" && (
                  <div>
                    <Label>Company</Label>
                    <Select
                      options={companyOptions}
                      placeholder={loadingCompanies ? "Loading companies..." : "Select a company"}
                      onChange={handleCompanySelectChange}
                      defaultValue={formData.company}
                      className="dark:bg-gray-900"
                    />
                  </div>
                )}

                {/* Password */}
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password (min 6 characters)"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 pt-4">
                  <Checkbox
                    checked={formData.isActive}
                    onChange={handleCheckboxChange}
                    disabled={loading}
                  />
                  <Label className="mb-0 cursor-pointer">
                    User is active
                  </Label>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-600">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel} 
                disabled={loading}
                className="px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  loading || 
                  !formData.username.trim() || 
                  !formData.email.trim()
                }
                className="px-8"
              >
                {loading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
};

export default AddUser;
