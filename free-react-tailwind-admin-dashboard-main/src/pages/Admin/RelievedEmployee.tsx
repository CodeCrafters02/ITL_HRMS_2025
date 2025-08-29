import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import React, { useState, useRef, useEffect } from 'react';
import { axiosInstance } from '../Dashboard/api';
import { useModal } from "../../hooks/useModal";
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Alert from '../../components/ui/alert/Alert';

interface EmployeeSearchResult {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
}


interface EmployeeDetails {
  id: number;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  dob?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  designation?: string;
  designation_name?: string;
  department?: string;
  department_name?: string;
  date_of_joining?: string;
  address?: string;
  temporary_address?: string;
  permanent_address?: string;
  asset_details?: string;
  asset_names?: string[];
  aadhar_no?: string;
  pan_no?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  ctc?: string;
  gross_salary?: string;
  payment_method?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  esic_status?: string;
  esic_no?: string;
  epf_status?: string;
  uan?: string;
  photo?: string;
}

interface RelievedEmployeeDetails {
  id: number;
  employee: EmployeeDetails | number;
  employee_details?: EmployeeDetails; // Nested details from backend
  employee_name: string;
  employee_id: string;
  relieving_date?: string;
  remarks?: string;
  // Keep flat fields for selectedEmployeeDetails compatibility
  dob?: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  address?: string;
  asset_details?: string;
  aadhar_no?: string;
  pan_no?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  ctc?: string;
  gross_salary?: string;
  payment_method?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  esic_status?: string;
  esic_no?: string;
  epf_status?: string;
  uan?: string;
  photo_url?: string;
  // Fallback fields for flexible display
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  mobile?: string;
  designation_name?: string;
  department_name?: string;
  temporary_address?: string;
  permanent_address?: string;
  asset_names?: string[];
}

const RelievedEmployee: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<EmployeeSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [relievingDate, setRelievingDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [relievedDetails, setRelievedDetails] = useState<RelievedEmployeeDetails | null>(null);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<RelievedEmployeeDetails | null>(null);
  const [relievedList, setRelievedList] = useState<RelievedEmployeeDetails[]>([]);
  // Checkbox state for delete
  const [showDelete, setShowDelete] = useState(false);

  // Add state for template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<Array<{id: number, title: string, content?: string}>>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSelectFor, setTemplateSelectFor] = useState<number | null>(null); // relieved employee id

  // Handle delete selected employee
  const handleDeleteSelectedEmployee = async () => {
    const employeeId = selectedEmployeeDetails?.employee || selectedEmployeeDetails?.id;
    if (!selectedEmployeeDetails || !employeeId) {
      setError('No employee selected.');
      return;
    }
    setError('');
    setSuccess('');
    const dateToUse = relievingDate || new Date().toISOString().slice(0, 10);
    try {
      const res = await axiosInstance.post('relieved-employees/', {
        employee: employeeId,
        relieving_date: dateToUse,
        remarks: remarks.trim(),
      });
  setSuccess(`${selectedEmployeeDetails.employee_name} has been successfully relieved`);
  setShowSuccess(true);
      const relievedId = res.data.id;
      const detailsRes = await axiosInstance.get(`relieved-employees/${relievedId}/`);
      setRelievedDetails({ ...detailsRes.data, relieving_date: detailsRes.data.relieving_date || dateToUse });
      setSelectedEmployee(null);
      setSelectedEmployeeDetails(null);
      setShowDelete(false);
      setSearchTerm('');
      setRelievingDate('');
      setRemarks('');
    } catch (err: unknown) {
      let msg = 'Failed to relieve employee. Please try again.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as any).response;
        if (response && response.data) {
          if (typeof response.data === 'string') {
            msg = response.data;
          } else if (response.data.employee) {
            msg = Array.isArray(response.data.employee) ? response.data.employee.join(' ') : response.data.employee;
          } else if (response.data.detail) {
            msg = response.data.detail;
          }
        }
      }
      setError(msg);
    }
  };

  const { openModal, closeModal } = useModal(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search input change
  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    setError('');
    setSuccess('');
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axiosInstance.get('relieved-employees/search-employee/', { params: { q: value.trim() } });
      setSuggestions(res.data);
      setShowSuggestions(true);
    } catch {
      setError('Failed to search employees');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle employee selection from suggestions
  const handleEmployeeSelect = async (employee: EmployeeSearchResult) => {
    setSelectedEmployee(employee);
    setSearchTerm(employee.full_name);
    setShowSuggestions(false);
    setRelievingDate('');
    setRemarks('');
    setError('');
    setSuccess('');
    setShowDelete(false); // Reset delete checkbox when new employee is selected
    // Fetch full employee details
    try {
      const res = await axiosInstance.get(`employee/${employee.id}/`);
      setSelectedEmployeeDetails(res.data);
    } catch {
      setSelectedEmployeeDetails(null);
    }
    openModal();
  };

  // Handle modal close
  const handleCloseModal = () => {
    closeModal();
    setSelectedEmployee(null);
    setSelectedEmployeeDetails(null);
    setRelievingDate('');
    setRemarks('');
    setError('');
  };

  // Handle clicks outside search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch relieved employees list on success
  useEffect(() => {
    const fetchRelievedList = async () => {
      if (success) {
        try {
          const res = await axiosInstance.get('relieved-employees/');
          setRelievedList(res.data);
        } catch {
          setRelievedList([]);
        }
      }
    };
    fetchRelievedList();
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, showSuccess]);

  // Fetch all relieved employees on mount
  useEffect(() => {
    const fetchRelieved = async () => {
      try {
        const res = await axiosInstance.get('relieved-employees/');
        setRelievedList(res.data);
      } catch {
        // Optionally handle error
      }
    };
    fetchRelieved();
  }, []);

  // Handler for Relieve Letter button (Recruitment logic: only show modal if letter does not exist for selected template)
  const handleRelieveLetterClick = async (relievedId: number) => {
    setTemplateError(null);
    setTemplateLoading(true);
    try {
      // Fetch all generated letters for this relieved employee and type=relieve
      const generatedRes = await axiosInstance.get(`/generated-letters/?relieved_id=${relievedId}&type=relieve`);
      const generatedLetters = Array.isArray(generatedRes.data) ? generatedRes.data : [];
      if (generatedLetters.length > 0) {
        // Redirect directly to the PDF for the first letter (or you can pick the most recent, etc.)
        const letter = generatedLetters[0];
        window.location.href = `/admin/letter-pdf?id=${relievedId}&type=relieve&template_id=${letter.template}`;
        setTemplateLoading(false);
        return;
      }
      // If no letter exists, show the template modal
      const tplRes = await axiosInstance.get('/letter-templates/');
      setTemplateOptions(tplRes.data);
      setShowTemplateModal(true);
      setTemplateSelectFor(relievedId);
    } catch {
      setTemplateError('Failed to load templates or check existing letters');
    } finally {
      setTemplateLoading(false);
    }
  };

  // When user selects a template in the modal (check if letter exists, redirect if so)
  const handleTemplateSelect = async (template_id: number) => {
    if (!templateSelectFor) {
      setShowTemplateModal(false);
      setTemplateSelectFor(null);
      return;
    }
    try {
      // Check if letter already exists for this relieved employee and template, always include type=relieve
      const res = await axiosInstance.get(`/generated-letters/?relieved_id=${templateSelectFor}&template_id=${template_id}&type=relieve`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Letter already exists, redirect directly
        window.location.href = `/admin/letter-pdf?id=${templateSelectFor}&type=relieve&template_id=${template_id}`;
      } else {
        // No letter found, generate new letter and redirect (or let user proceed)
        window.location.href = `/admin/letter-pdf?id=${templateSelectFor}&type=relieve&template_id=${template_id}`;
      }
      setShowTemplateModal(false);
      setTemplateSelectFor(null);
    } catch (err) {
      // Log error for debugging
      console.error("Error checking generated letter:", err);
      setShowTemplateModal(false);
      setTemplateSelectFor(null);
    }
  };

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false);
    setTemplateSelectFor(null);
  };

  return (
    <>
      <PageMeta title="Relieve Employee" description="Relieve an employee from the company" />
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relieve Employee</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Search and relieve an employee from the company</p>
          </div>
          {/* Search Bar next to title */}
          <div className="relative w-full sm:w-96" ref={searchRef}>
            <input
              id="employee-search"
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Enter employee name or employee ID..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              autoComplete="off"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployee?.id === employee.id}
                      onChange={() => handleEmployeeSelect(employee)}
                      onClick={e => e.stopPropagation()}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {employee.full_name} ({employee.employee_id})
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {employee.department} • {employee.designation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* No results message */}
            {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !searchLoading && relievedList.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                <div className="text-gray-500 text-center">
                  No employees found matching "{searchTerm}"
                </div>
              </div>
            )}
          </div>
        </div>

        <ComponentCard title="Relieve Employee">
          <div className="space-y-6">
            {/* Alerts */}
            <div className="space-y-4">
              {error && <Alert variant="error" title="Error" message={error} />}
              {success && <Alert variant="success" title="Success" message={success} />}
            </div>
            {/* Show selected employee details before relieving, with checkbox and delete option */}
            {selectedEmployeeDetails && !success && (
              <div className="overflow-x-auto mt-8">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="select-employee-checkbox"
                    checked={showDelete}
                    disabled={!selectedEmployeeDetails}
                    onChange={() => setShowDelete((prev) => !prev)}
                    className="mr-2"
                  />
                  <label htmlFor="select-employee-checkbox" className="text-sm text-gray-700">Select employee for delete</label>
                  {showDelete && (
                    <Button
                      variant="outline"
                      className="ml-4"
                      onClick={handleDeleteSelectedEmployee}
                      disabled={
                        !selectedEmployeeDetails ||
                        (!selectedEmployeeDetails.employee && !selectedEmployeeDetails.id)
                      }
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <Table className="min-w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg">
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Employee ID</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Name & Photo</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">DOB</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Email</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Phone</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Designation</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Department</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Date of Joining</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Address</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Asset Details</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Aadhar No</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">PAN No</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Guardian Name</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Guardian Mobile</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">CTC</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Gross Salary</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Payment Method</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Account No</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">IFSC Code</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Bank Name</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">ESIC Status</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">ESIC No</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">EPF Status</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">UAN</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.employee_id}</TableCell>
                      <TableCell className="p-4 border-b flex items-center gap-2">
                        {selectedEmployeeDetails.photo_url ? (
                          <img src={selectedEmployeeDetails.photo_url} alt="Employee" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <span className="text-xl">👤</span>
                          </div>
                        )}
                        <span>{
                          selectedEmployeeDetails.employee_name ||
                          (selectedEmployeeDetails.first_name && selectedEmployeeDetails.last_name
                            ? `${selectedEmployeeDetails.first_name} ${selectedEmployeeDetails.last_name}`
                            : selectedEmployeeDetails.employee_id || '-')
                        }</span>
                      </TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.dob || selectedEmployeeDetails.date_of_birth || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.email || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.phone || selectedEmployeeDetails.mobile || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.designation || selectedEmployeeDetails.designation_name || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.department || selectedEmployeeDetails.department_name || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.date_of_joining || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.address || selectedEmployeeDetails.temporary_address || selectedEmployeeDetails.permanent_address || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.asset_details || (selectedEmployeeDetails.asset_names ? selectedEmployeeDetails.asset_names.join(', ') : '-')}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.aadhar_no || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.pan_no || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.guardian_name || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.guardian_mobile || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.ctc || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.gross_salary || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.payment_method || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.account_no || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.ifsc_code || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.bank_name || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.esic_status || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.esic_no || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.epf_status || '-'}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployeeDetails.uan || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Show success message at the top of relievedList for 2 sec */}
            {showSuccess && success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                {success}
              </div>
            )}
            {/* Show 'No relieved employees found' if relievedList is empty and not loading/searching */}
            {relievedList.length === 0 && !searchLoading && searchTerm.length < 2 && !selectedEmployeeDetails && !relievedDetails && !success && !error && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-lg font-medium mb-2">No relieved employees found</p>
                <p className="text-sm text-gray-500">No employees have been relieved yet.</p>
              </div>
            )}
            {/* Only show the table if there are relieved employees and not after success (but show success message above table for 2 sec) */}
            {relievedList.length > 0 && (
              <div className="overflow-x-auto mt-8">
                {/* Success message at the top of the table for 2 sec */}
                {showSuccess && success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                    {success}
                  </div>
                )}
                <Table className="min-w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg">
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableCell isHeader className="p-4 border-b">Action</TableCell>
                      <TableCell isHeader className="p-4 border-b">Employee ID</TableCell>
                      <TableCell isHeader className="p-4 border-b">Name & Photo</TableCell>
                      <TableCell isHeader className="p-4 border-b">DOB</TableCell>
                      <TableCell isHeader className="p-4 border-b">Email</TableCell>
                      <TableCell isHeader className="p-4 border-b">Phone</TableCell>
                      <TableCell isHeader className="p-4 border-b">Designation</TableCell>
                      <TableCell isHeader className="p-4 border-b">Department</TableCell>
                      <TableCell isHeader className="p-4 border-b">Date of Joining</TableCell>
                      <TableCell isHeader className="p-4 border-b">Date of Relieving</TableCell>
                      <TableCell isHeader className="p-4 border-b">Address</TableCell>
                      <TableCell isHeader className="p-4 border-b">Asset Details</TableCell>
                      <TableCell isHeader className="p-4 border-b">Aadhar No</TableCell>
                      <TableCell isHeader className="p-4 border-b">PAN No</TableCell>
                      <TableCell isHeader className="p-4 border-b">Guardian Name</TableCell>
                      <TableCell isHeader className="p-4 border-b">Guardian Mobile</TableCell>
                      <TableCell isHeader className="p-4 border-b">CTC</TableCell>
                      <TableCell isHeader className="p-4 border-b">Gross Salary</TableCell>
                      <TableCell isHeader className="p-4 border-b">Payment Method</TableCell>
                      <TableCell isHeader className="p-4 border-b">Account No</TableCell>
                      <TableCell isHeader className="p-4 border-b">IFSC Code</TableCell>
                      <TableCell isHeader className="p-4 border-b">Bank Name</TableCell>
                      <TableCell isHeader className="p-4 border-b">ESIC Status</TableCell>
                      <TableCell isHeader className="p-4 border-b">ESIC No</TableCell>
                      <TableCell isHeader className="p-4 border-b">EPF Status</TableCell>
                      <TableCell isHeader className="p-4 border-b">UAN</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relievedList.map((item) => {
                      const emp = item.employee_details || (typeof item.employee === 'object' ? item.employee : null);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="p-4 border-b">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRelieveLetterClick(item.id)}
                              className="text-blue-600  cursor-pointer"
                            >
                              Relieve Letter
                            </Button>
                          </TableCell>
                          <TableCell className="p-4 border-b">{item.employee_id}</TableCell>
                          <TableCell className="p-4 border-b flex items-center gap-2">
                            {emp && emp.photo ? (
                              <img src={emp.photo} alt="Employee" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                <span className="text-xl">👤</span>
                              </div>
                            )}
                            <span>{
                              item.employee_name ||
                              (emp && emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` : item.employee_id || '-')
                            }</span>
                          </TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.dob || emp.date_of_birth) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.email || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.phone || emp.mobile) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.designation_name || emp.designation) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.department_name || emp.department) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.date_of_joining || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{item.relieving_date || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.address || emp.temporary_address || emp.permanent_address) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && (emp.asset_details || (emp.asset_names ? emp.asset_names.join(', ') : '-')) || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.aadhar_no || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.pan_no || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.guardian_name || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.guardian_mobile || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.ctc || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.gross_salary || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.payment_method || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.account_no || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.ifsc_code || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.bank_name || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.esic_status || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.esic_no || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.epf_status || '-'}</TableCell>
                          <TableCell className="p-4 border-b">{emp && emp.uan || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* Template selection modal */}
        {showTemplateModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={handleCloseTemplateModal} />
            <div className="fixed left-1/2 top-1/2 z-50" style={{transform: 'translate(-50%, -50%)'}}>
              <div className="bg-white rounded-lg shadow-2xl p-8 min-w-[340px] max-w-2xl w-full mx-4 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Select Relieve Letter Template</h2>
                  <button className="text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={handleCloseTemplateModal}>&times;</button>
                </div>
                {templateLoading ? (
                  <div className="text-blue-600">Loading templates...</div>
                ) : templateError ? (
                  <div className="text-red-500">{templateError}</div>
                ) : templateOptions.length === 0 ? (
                  <div className="text-gray-500">No templates found.</div>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center max-h-[60vh] overflow-y-auto">
                    {templateOptions.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="group w-48 h-48 flex flex-col items-center justify-center border rounded-lg mb-2 cursor-pointer bg-white hover:bg-blue-50 transition relative shadow hover:shadow-lg"
                        onClick={() => handleTemplateSelect(tpl.id)}
                      >
                        <div className="font-bold text-lg mb-2 text-center line-clamp-2">{tpl.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-4 text-center px-2">
                          {tpl.content ? tpl.content.slice(0, 100) + (tpl.content.length > 100 ? '...' : '') : ''}
                        </div>
                        <div className="text-xs text-blue-500 mt-2">Click to select</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default RelievedEmployee;