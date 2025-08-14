import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import React, { useState, useRef, useEffect } from 'react';
import { axiosInstance } from '../Dashboard/api';
import { Modal } from '../../components/ui/modal';
import { useModal } from "../../hooks/useModal";
import DatePicker from '../../components/form/date-picker';
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

const RelievedEmployee: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<EmployeeSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [relievingDate, setRelievingDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { isOpen: showConfirmModal, openModal, closeModal } = useModal(false);
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
    } catch (err) {
      setError('Failed to search employees');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle employee selection from suggestions
  const handleEmployeeSelect = (employee: EmployeeSearchResult) => {
    setSelectedEmployee(employee);
    setSearchTerm(employee.full_name);
    setShowSuggestions(false);
    openModal();
    setRelievingDate('');
    setRemarks('');
  };

  // Handle relieving confirmation
  const handleConfirmRelieve = async () => {
    if (!selectedEmployee || !relievingDate) {
      setError('Please select a relieving date');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axiosInstance.post('relieved-employees/', {
        employee: selectedEmployee.id,
        relieving_date: relievingDate,
        remarks: remarks.trim(),
      });
      setSuccess(`${selectedEmployee.full_name} has been successfully relieved`);
      closeModal();
      setSelectedEmployee(null);
      setSearchTerm('');
      setRelievingDate('');
      setRemarks('');
    } catch (err) {
      setError('Failed to relieve employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    closeModal();
    setSelectedEmployee(null);
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
                    onClick={() => handleEmployeeSelect(employee)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {employee.full_name} ({employee.employee_id})
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {employee.department} • {employee.designation}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* No results message */}
            {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && !searchLoading && (
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
            {/* Empty state like Department page */}
            {searchTerm.length < 2 && !error && !success && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">👥 </div>
                <p className="text-lg font-medium mb-2">No employee selected</p>
                <p className="text-sm text-gray-500">Search for an employee to relieve them from the company</p>
              </div>
            )}
            {/* Table of relieved employee details after success */}
            {success && selectedEmployee && (
              <div className="overflow-x-auto mt-8">
                <Table className="min-w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg">
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Relieving Letter</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Employee ID</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Name & Photo</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">DOB</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Email</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Phone</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Designation</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Department</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Date of Joining</TableCell>
                      <TableCell isHeader className="p-4 border-b text-left text-sm font-semibold text-gray-900 dark:text-white">Date of Relieving</TableCell>
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
                      <TableCell className="p-4 border-b text-blue-600 underline cursor-pointer">Download</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployee.employee_id}</TableCell>
                      <TableCell className="p-4 border-b flex items-center gap-2">
                        {/* Placeholder for photo */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          <span className="text-xl">👤</span>
                        </div>
                        <span>{selectedEmployee.full_name}</span>
                      </TableCell>
                      <TableCell className="p-4 border-b">-</TableCell> {/* DOB */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Email */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Phone */}
                      <TableCell className="p-4 border-b">{selectedEmployee.designation}</TableCell>
                      <TableCell className="p-4 border-b">{selectedEmployee.department}</TableCell>
                      <TableCell className="p-4 border-b">-</TableCell> {/* Date of Joining */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Date of Relieving */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Address */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Asset Details */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Aadhar No */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* PAN No */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Guardian Name */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Guardian Mobile */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* CTC */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Gross Salary */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Payment Method */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Account No */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* IFSC Code */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* Bank Name */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* ESIC Status */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* ESIC No */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* EPF Status */}
                      <TableCell className="p-4 border-b">-</TableCell> {/* UAN */}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* Confirmation Modal */}
        <Modal isOpen={showConfirmModal} onClose={handleCloseModal}>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Confirm Employee Relief
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Are you sure you want to add <span className="font-semibold">{selectedEmployee?.full_name}</span> to the relieved employees list?
              </p>
              <div className="text-sm text-yellow-600 mt-1">
                Employee ID: {selectedEmployee?.employee_id} • {selectedEmployee?.department} • {selectedEmployee?.designation}
              </div>
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <DatePicker
                  id="relieving-date"
                  label="Relieving Date *"
                  placeholder="Select relieving date"
                  onChange={(dates: Date[]) => {
                    const date = dates && dates[0];
                    setRelievingDate(date ? date.toISOString().slice(0, 10) : '');
                  }}
                  defaultDate={relievingDate || undefined}
                />
              </div>
              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional remarks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={loading}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRelieve}
                disabled={loading || !relievingDate}
                type="button"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : 'Confirm Relief'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default RelievedEmployee;