
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from "../Dashboard/api";
import ComponentCard from "../../components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  email: string;
  date_of_birth: string;
  mobile: string;
  temporary_address?: string;
  permanent_address?: string;
  photo?: string;
  aadhar_no?: string;
  aadhar_card?: string;
  pan_no?: string;
  pan_card?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  category?: string;
  date_of_joining: string;
  previous_employer?: string;
  date_of_releaving?: string;
  previous_designation_name?: string;
  previous_salary?: number;
  ctc: number;
  gross_salary: number;
  epf_status?: string;
  uan?: string;
  esic_status?: string;
  esic_no?: string;
  payment_method?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  source_of_employment?: string;
  department: number;
  department_name?: string;
  designation: number;
  designation_name?: string;
  reporting_level_name?: string;
  reporting_manager?: { id: number; first_name: string; last_name: string } | string;
  reporting_manager_name?: string | { id: number; first_name: string; last_name: string } | Array<{ id: number; first_name: string; last_name: string }>;
  who_referred?: string | { id: number; first_name: string; last_name: string } | Array<{ id: number; first_name: string; last_name: string }>;
  asset_names?: string[];
}



const EmployeeRegister: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  // Delete employee handler
  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await axiosInstance.delete(`/employee/${deleteId}/`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== deleteId));
      toast.success('Deleted successfully');
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setDeleteId(null);
  };

  useEffect(() => {

    const fetchAll = async () => {
      try {
        const empRes = await axiosInstance.get('/employee/');
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch employee data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);



  // Export employees to CSV
  const handleExportCSV = () => {
    if (!employees.length) return;
    const replacer = (_key: string, value: unknown) => (value === null || value === undefined ? '' : value);
    const header = Object.keys(employees[0]);
    const csv = [
      header.join(','),
      ...employees.map(row =>
        header.map(fieldName => {
          const val = row[fieldName as keyof Employee];
          if (Array.isArray(val)) return '"' + val.join('; ') + '"';
          if (typeof val === 'object' && val !== null) return '"' + JSON.stringify(val) + '"';
          return JSON.stringify(val, replacer);
        }).join(',')
      )
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_register.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };


  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!employees.length) return <div>No employees found</div>;


  const filteredEmployees = employees.filter(emp => {
    const searchLower = search.toLowerCase();
    return (
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      {/* Delete confirmation popup */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-blur bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg  mb-4 text-gray-900 dark:text-white">Are you sure to delete {employees.find(emp => emp.id === deleteId)?.first_name} {employees.find(emp => emp.id === deleteId)?.last_name}?</h2>
            <div className="flex justify-end gap-2">
              <button onClick={cancelDelete} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-2 md:space-y-0">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white m-0">Employee Register</h1>
            <p className="text-gray-600 dark:text-gray-400 m-0 text-sm">Manage all employee records and information</p>
          </div>
          <div className="hidden md:block" style={{ flexBasis: '10%' }}></div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Employee ID or Name"
            className="md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ minWidth: 0 }}
          />
          <div className="flex gap-2">
            <button
              className="border border-gray-600 text-gray-600 font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 w-full md:w-auto text-sm md:text-base bg-white hover:bg-blue-50"
              onClick={handleExportCSV}
              type="button"
            >
              Export Data
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2 w-full md:w-auto text-sm md:text-base"
              onClick={() => navigate('/admin/form-employee-register')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </button>
          </div>
        </div>

        <ComponentCard 
          title="Employee Records" 
          desc={`Total employees: ${filteredEmployees.length}`}
        >
          <div className="overflow-x-auto" ref={tableRef}>
            <Table className="border-collapse border border-gray-200 dark:border-gray-700">
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Actions</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Employee ID</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-9 text-left font-semibold text-gray-900 dark:text-white text-sm">Name & Photo</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Gender</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Birth</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Email</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Mobile</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Temporary Address</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Permanent Address</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Aadhar & Doc</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">PAN & Doc</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Guardian Name</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Guardian Mobile</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Category</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Department</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Designation</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Reporting Level</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Reporting Manager</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Joining</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Employer</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Releaving</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Designation</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Salary</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">CTC</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Gross Salary</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">EPF Status</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">UAN</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">ESIC Status</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">ESIC No</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Payment Method</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Bank Name</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Account No</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">IFSC Code</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Source of Employment</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Referred By</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-6 text-left font-semibold text-gray-900 dark:text-white text-sm">Assets Assigned</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Actions */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex gap-2">
                        {/* Update (Edit) Icon Button */}
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                          title="Update"
                          onClick={() => navigate(`/admin/update-employee-form/${emp.id}`)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4 13.362-13.303z" />
                          </svg>
                        </button>
                        {/* Delete Icon Button */}
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900"
                          title="Delete"
                          onClick={() => handleDelete(emp.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                    {/* Employee ID */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4 font-mono text-sm">
                      <span className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-gray-800 dark:text-gray-200">
                        {emp.employee_id}
                      </span>
                    </TableCell>
                    {/* Name */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-4">
                        {/* Add photo if available */}
                        {emp.photo ? (
                          <img src={emp.photo} alt="Employee" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <span className="text-xl">👤</span>
                          </div>
                        )}
                        <span>{[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ')}</span>
                      </div>
                    </TableCell>
                    {/* Gender */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.gender || '-'}</span>
                    </TableCell>
                    {/* Date of Birth */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    {/* Email */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <a href={`mailto:${emp.email}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                        {emp.email}
                      </a>
                    </TableCell>
                    {/* Mobile */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <a href={`tel:${emp.mobile}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                        {emp.mobile}
                      </a>
                    </TableCell>
                    {/* Temporary Address */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.temporary_address || '-'}</span>
                    </TableCell>
                    {/* Permanent Address */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.permanent_address || '-'}</span>
                    </TableCell>
                    {/* Aadhar & Doc */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <div className="space-y-1">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.aadhar_no || '-'}</span>
                        {emp.aadhar_card && (
                          <a href={emp.aadhar_card} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">View</a>
                        )}
                      </div>
                    </TableCell>
                    {/* PAN & Doc */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <div className="space-y-1">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.pan_no || '-'}</span>
                        {emp.pan_card && (
                          <a href={emp.pan_card} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">View</a>
                        )}
                      </div>
                    </TableCell>
                    {/* Guardian Name */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.guardian_name || '-'}</span>
                    </TableCell>
                    {/* Guardian Mobile */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.guardian_mobile || '-'}</span>
                    </TableCell>
                    {/* Category */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.category || '-'}</span>
                    </TableCell>
                    {/* Department */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {emp.department_name || '-'}
                      </span>
                    </TableCell>
                    {/* Designation */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {emp.designation_name || '-'}
                      </span>
                    </TableCell>
                    {/* Reporting Level */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.reporting_level_name || '-'}</span>
                    </TableCell>
                    {/* Reporting Manager */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {Array.isArray(emp.reporting_manager_name) && emp.reporting_manager_name.length > 0
                          ? emp.reporting_manager_name.map((mgr) => [mgr.first_name, mgr.last_name].filter(Boolean).join(' ')).join(', ')
                          : emp.reporting_manager && typeof emp.reporting_manager === 'object' && emp.reporting_manager.first_name
                            ? [emp.reporting_manager.first_name, emp.reporting_manager.last_name].filter(Boolean).join(' ')
                            : emp.reporting_manager_name && typeof emp.reporting_manager_name === 'object' && 'first_name' in emp.reporting_manager_name
                              ? [emp.reporting_manager_name.first_name, emp.reporting_manager_name.last_name].filter(Boolean).join(' ')
                              : typeof emp.reporting_manager_name === 'string' && emp.reporting_manager_name
                                ? emp.reporting_manager_name
                                : typeof emp.reporting_manager === 'string' && emp.reporting_manager
                                  ? emp.reporting_manager
                                  : '-'}
                      </span>
                    </TableCell>
                    {/* Date of Joining */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    {/* Previous Employer */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.previous_employer || '-'}</span>
                    </TableCell>
                    {/* Date of Releaving */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {emp.date_of_releaving ? new Date(emp.date_of_releaving).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    {/* Previous Designation */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.previous_designation_name || '-'}</span>
                    </TableCell>
                    {/* Previous Salary */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {emp.previous_salary ? `₹${emp.previous_salary.toLocaleString()}` : '-'}
                      </span>
                    </TableCell>
                    {/* CTC */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        ₹{emp.ctc?.toLocaleString() || '0'}
                      </span>
                    </TableCell>
                    {/* Gross Salary */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {emp.gross_salary ? `₹${emp.gross_salary.toLocaleString()}` : '-'}
                      </span>
                    </TableCell>
                    {/* EPF Status */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                        emp.epf_status === 'Yes' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {emp.epf_status || 'No'}
                      </span>
                    </TableCell>
                    {/* UAN */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.uan || '-'}</span>
                    </TableCell>
                    {/* ESIC Status */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                        emp.esic_status === 'Yes' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {emp.esic_status || 'No'}
                      </span>
                    </TableCell>
                    {/* ESIC No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.esic_no || '-'}</span>
                    </TableCell>
                    {/* Payment Method */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.payment_method || '-'}</span>
                    </TableCell>
                    {/* Bank Name */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.bank_name || '-'}</span>
                    </TableCell>
                    {/* Account No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.account_no || '-'}</span>
                    </TableCell>
                    {/* IFSC Code */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.ifsc_code || '-'}</span>
                    </TableCell>
                    {/* Source of Employment */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{emp.source_of_employment || '-'}</span>
                    </TableCell>
                    {/* Referred By */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{
                        Array.isArray(emp.who_referred) && emp.who_referred.length > 0
              ? emp.who_referred
                .filter((ref): ref is { id: number; first_name: string; last_name: string } => typeof ref === 'object' && ref !== null && 'id' in ref && 'first_name' in ref && 'last_name' in ref)
                .map((ref) => [ref.first_name, ref.last_name].filter(Boolean).join(' ')).join(', ')
                          : emp.who_referred && typeof emp.who_referred === 'object' && !Array.isArray(emp.who_referred) && 'first_name' in emp.who_referred && 'last_name' in emp.who_referred
                            ? [emp.who_referred.first_name, emp.who_referred.last_name].filter(Boolean).join(' ')
                            : typeof emp.who_referred === 'string' && emp.who_referred
                              ? emp.who_referred
                              : '-'
                      }</span>
                    </TableCell>
                    {/* Assets Assigned */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{Array.isArray(emp.asset_names) ? emp.asset_names.join(', ') : (emp.asset_names || '-')}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>
      </div>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
};

export default EmployeeRegister;