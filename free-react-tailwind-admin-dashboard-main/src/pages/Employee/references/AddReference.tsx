import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createEmployeeReference } from "./api";
import { axiosInstance } from "../api.ts"; // import axiosInstance
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import { toast } from "react-toastify";

interface EmployeeReferenceFormData {
  employee: number;
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
}

const AddEmployeeReference: React.FC = () => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<EmployeeReferenceFormData, "employee">>({
    name: "",
    designation: "",
    contact_number: "",
    email: "",
    resume: null,
  });

  const [loading, setLoading] = useState(false);

  // Fetch logged-in employee ID on mount
  useEffect(() => {
    const fetchEmployeeId = async () => {
      try {
        const response = await axiosInstance.get<{ id: number; full_name: string }>(
          "/employee-id/"
        );
        console.log("hshhsh",response)
        setEmployeeId(response.data.id);
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch employee info");
      }
    };
    fetchEmployeeId();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await createEmployeeReference(formData); // no employee here
    toast.success("Reference submitted successfully!");
    navigate("/employee/references");
  } catch (error) {
    console.error(error);
    toast.error("Failed to submit reference");
  } finally {
    setLoading(false);
  }
};


  const handleCancel = () => navigate("/employee/references");

  return (
    <> 
      <PageMeta title="Add Reference" description="Submit a professional reference" />
      <PageBreadcrumb pageTitle="Add Employee Reference" />

      <ComponentCard title="Reference Information">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter reference name"
              />
            </div>

            <div>
              <Label htmlFor="designation">Designation *</Label>
              <Input
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                placeholder="Enter designation"
              />
            </div>

            <div>
              <Label htmlFor="contact_number">Contact Number *</Label>
              <Input
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                required
                placeholder="Enter contact number"
              />
            </div>

            <div>
              <Label htmlFor="email">Email ID *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="resume">Upload CV (PDF/DOC)</Label>
              <Input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleChange}
              />
            </div>
          </div>

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
            <Button type="submit" disabled={loading} className="px-8">
              {loading ? "Submitting..." : "Submit Reference"}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </>
  );
};

export default AddEmployeeReference;
