import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { axiosInstance } from "../Dashboard/api";
import { Info } from 'lucide-react';

export default function LevelForm() {
  const [levelName, setLevelName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [levelNameError, setLevelNameError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const navigate = useNavigate();

  const validateLevelName = (value: string) => {
    const isValid = value.trim().length >= 2;
    setLevelNameError(!isValid);
    return isValid;
  };

  const validateDescription = (value: string) => {
    const isValid = value.trim().length >= 5;
    setDescriptionError(!isValid);
    return isValid;
  };

  const handleLevelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLevelName(value);
    if (value.trim()) {
      validateLevelName(value);
    }
    setError("");
    setSuccess("");
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDescription(value);
    if (value.trim()) {
      validateDescription(value);
    }
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isLevelNameValid = validateLevelName(levelName);
    const isDescriptionValid = validateDescription(description);
    
    if (!isLevelNameValid || !isDescriptionValid) {
      setError("Please fill in all fields correctly.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await axiosInstance.post("/levels/", {
        level_name: levelName.trim(),
        description: description.trim(),
      });
      setSuccess("Level created successfully!");
      setTimeout(() => navigate("/admin/branch-mgt/level"), 1500);
    } catch (err: unknown) {
      type AxiosErrorType = { response?: { data?: { detail?: string } } };
      const errorObj = err as AxiosErrorType;
      const errorMessage = errorObj.response?.data?.detail || "Failed to create level. Please try again.";
      setError(errorMessage);
      console.error("Error creating level:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/branch-mgt/level");
  };

  return (
    <>
      <PageMeta title="Add Level | HRMS" description="Form to add a new organizational level" />
      <PageBreadcrumb pageTitle="Add Level" />    

      <div className="space-y-6">
        <ComponentCard 
          title="Level Information" 
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
                    Use level names in the format <b>Level1 or L1, Level2 or L2, …</b>. Assign Level1 as the highest authority when defining designations.              </p>
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="levelName">
                Level Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="levelName"
                name="levelName"
                type="text"
                value={levelName}
                onChange={handleLevelNameChange}
                placeholder="e.g., L1, L2 etc."
                error={levelNameError}
                success={levelName.trim().length >= 2 && !levelNameError}
                
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                name="description"
                type="text"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="e.g., Responsible for managing team operations and strategic decisions"
                error={descriptionError}
                success={description.trim().length >= 5 && !descriptionError}
                
                disabled={loading}
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
                disabled={loading || !levelName.trim() || !description.trim() || levelNameError || descriptionError}
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
                  'Create Level'
                )}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
