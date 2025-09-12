import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import { axiosInstance } from "../Dashboard/api";
import { AxiosError } from "axios";

interface DesignationErrorResponse {
  designation_name?: string;
  detail?: string;
}
import { Info } from 'lucide-react';

interface Department {
  id: number;
  department_name: string;
}

interface Level {
  id: number;
  level_name: string;
}

export default function DesignationForm() {
  const [designationName, setDesignationName] = useState("");
  const [department, setDepartment] = useState<number | "">("");
  const [level, setLevel] = useState<number | "">("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [designationNameError, setDesignationNameError] = useState(false);
  const navigate = useNavigate();

  const validateDesignationName = (value: string) => {
    const isValid = value.trim().length >= 2;
    setDesignationNameError(!isValid);
    return isValid;
  };

  const handleDesignationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDesignationName(value);
    if (value.trim()) {
      validateDesignationName(value);
    }
    setError("");
    setSuccess("");
  };

  const handleDepartmentChange = (value: string) => {
    setDepartment(value ? Number(value) : "");
    setError("");
    setSuccess("");
  };

  const handleLevelChange = (value: string) => {
    setLevel(value ? Number(value) : "");
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const [depRes, lvlRes] = await Promise.all([
          axiosInstance.get("/departments/"),
          axiosInstance.get("/levels/")
        ]);
        setDepartments(depRes.data);
        setLevels(lvlRes.data);
      } catch {
        setError("Failed to load departments or levels");
      }
    };
    fetchDeps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate form
    const isDesignationNameValid = validateDesignationName(designationName);
    if (!isDesignationNameValid || !department || !level) {
      setError("Please fill in all fields correctly.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axiosInstance.post("/designations/", {
        designation_name: designationName.trim(),
        department,
        level,
      });
      setSuccess("Designation created successfully!");
      setTimeout(() => navigate("/admin/branch-mgt/designation"), 1500);
    } catch (err) {
      let errorMessage = "Failed to create designation. Please try again.";
      if (err && (err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<DesignationErrorResponse>;
        const data = axiosErr.response?.data;
        if (data?.designation_name) {
          errorMessage = data.designation_name;
        } else if (data?.detail) {
          errorMessage = data.detail;
        }
      }
      setError(errorMessage);
      console.error("Error creating designation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/branch-mgt/designation");
  };

  return (
    <>
          <PageBreadcrumb pageTitle="Add Designation" />
      
      <div className="space-y-6">
        

        <ComponentCard 
          title="Designation Information" 
         
        >
          {/* Info Card */}
      <div className="mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Assign Level1 or L1 ,.. etc in ascending order as the highest authority when defining designations.              </p>
            </div>
          </div>
        </div>
      </div>
          <div className="space-y-6">
            <div>
              <Label htmlFor="designationName">
                Designation Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="designationName"
                name="designationName"
                type="text"
                value={designationName}
                onChange={handleDesignationNameChange}
                placeholder="e.g., Software Engineer, Marketing Manager, HR Specialist"
                error={designationNameError}
                success={designationName.trim().length >= 2 && !designationNameError}
                hint={
                  designationNameError 
                    ? "Designation name must be at least 2 characters long" 
                    : designationName.trim().length >= 2 
                      ? "Valid designation name" 
                      : " "
                }
                disabled={loading}
              />
            </div>

            <div>
              <Label>
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                options={departments.map(d => ({
                  value: d.id.toString(),
                  label: d.department_name
                }))}
                placeholder="Select Department"
                onChange={handleDepartmentChange}
                defaultValue={department ? department.toString() : ""}
                className={loading ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>

            <div>
              <Label>
                Level <span className="text-red-500">*</span>
              </Label>
              <Select
                options={levels.map(l => ({
                  value: l.id.toString(),
                  label: l.level_name
                }))}
                placeholder="Select Level"
                onChange={handleLevelChange}
                defaultValue={level ? level.toString() : ""}
                className={loading ? "opacity-50 cursor-not-allowed" : ""}
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !designationName.trim() || !department || !level || designationNameError}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Designation'
                )}
              </button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
