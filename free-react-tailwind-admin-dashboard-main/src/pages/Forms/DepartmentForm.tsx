import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { axiosInstance } from "../Dashboard/api";

export default function DepartmentForm() {
  const [departmentName, setDepartmentName] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const navigate = useNavigate();

  const validateDepartmentName = (value: string) => {
    const isValid = value.trim().length >= 2;
    setFieldError(!isValid);
    return isValid;
  };

  const handleDepartmentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDepartmentName(value);
    if (value.trim()) {
      validateDepartmentName(value);
    }
    // Clear previous messages
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateDepartmentName(departmentName)) {
      setError("Please enter a valid department name (minimum 2 characters).");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      await axiosInstance.post("app/departments/", { department_name: departmentName.trim() });
      setSuccess("Department created successfully!");
      setTimeout(() => navigate("/admin/branch-mgt/department"), 1500);
    } catch (err) {
      setError("Failed to create department. Please try again.");
      console.error("Error creating department:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/branch-mgt/department");
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Add Department" />
      
      <div className="space-y-6">
        

        <ComponentCard 
          title="Department Information" 
          
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="departmentName">
                Department Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="departmentName"
                name="departmentName"
                type="text"
                value={departmentName}
                onChange={handleDepartmentNameChange}
                placeholder="e.g., Human Resources, Information Technology"
                error={fieldError}
                success={departmentName.trim().length >= 2 && !fieldError}
                hint={
                  fieldError 
                    ? "Department name must be at least 2 characters long" 
                    : departmentName.trim().length >= 2 
                      ? "Valid department name" 
                      : "Enter a descriptive name for the department"
                }
                disabled={isLoading}
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
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !departmentName.trim() || fieldError}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Department'
                )}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
