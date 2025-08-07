import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from "../Dashboard/api";
import ComponentCard from "../../components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";


export interface Employee {
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
  level?: number;
  level_name?: string;
  reporting_manager?: { id: number; first_name: string; last_name: string };
  reporting_manager_name?: string | { id: number; first_name: string; last_name: string } | Array<{ id: number; first_name: string; last_name: string }>;
  who_referred?: string | { id: number; first_name: string; last_name: string } | Array<{ id: number; first_name: string; last_name: string }>;
  asset_details?: string[];
  asset_names?: string[];
  is_active?: boolean;
}

const EmployeeRegister: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  
  interface EditFormType extends Partial<Employee> {
    reporting_manager_id?: string | number;
    who_referred_id?: string | number;
  }
  
  const [editForm, setEditForm] = useState<EditFormType>({});
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: number; name: string; department: number }[]>([]);
  const [employeesList, setEmployeesList] = useState<{ id: number; name: string }[]>([]);
  
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];
  
  const paymentOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
  ];
  
  const epfEsicOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  const sourceOptions = [
    { value: 'internalreference', label: 'Internal Reference' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'walkin', label: 'Walk In' },
    { value: 'socialmedia', label: 'Social Media' },
  ];

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [empRes, deptRes, desigRes] = await Promise.all([
          axiosInstance.get('/employee/'),
          axiosInstance.get('/departments/'),
          axiosInstance.get('/designations/'),
        ]);
        
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        setDepartments(
          deptRes.data.map((d: any) => ({
            id: d.id || d.department_id || d._id,
            name: d.name || d.department_name || d.dept_name || d.title
          }))
        );
        setDesignations(
          desigRes.data.map((d: any) => ({
            id: d.id || d.designation_id || d._id,
            name: d.name || d.designation_name || d.title,
            department: d.department || d.department_id || ''
          }))
        );
        setEmployeesList(
          empRes.data.map((emp: any) => ({
            id: emp.id,
            name: [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ')
          }))
        );
      } catch (err) {
        console.error(err);
        setError('Failed to fetch employee data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      const file = fileInput.files?.[0];
      if (file) {
        // Create a URL for preview (in real app, you'd upload to server)
        const fileUrl = URL.createObjectURL(file);
        setEditForm((prev: EditFormType) => ({ ...prev, [name]: fileUrl }));
        
      }
    } else if (type === 'checkbox' && name === 'asset_details') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm((prev: EditFormType) => {
        const prevAssets = Array.isArray(prev.asset_details) ? prev.asset_details : [];
        let newAssets;
        if (checked) {
          newAssets = [...prevAssets, value];
        } else {
          newAssets = prevAssets.filter((v: string) => v !== value);
        }
        return { ...prev, asset_details: newAssets };
      });
    } else if (name === 'asset_details' || name === 'asset_names') {
      // Handle comma-separated asset input for both asset_details and asset_names
      const assetArray = value.split(',').map(v => v.trim()).filter(v => v);
      setEditForm((prev: EditFormType) => ({ ...prev, [name]: assetArray }));
    } else {
      setEditForm((prev: EditFormType) => ({ ...prev, [name]: value }));
    }
  };

  const startEdit = (emp: Employee) => {
    setEditRowId(emp.id);
    setEditForm({
      ...emp,
      reporting_manager_id:
        typeof emp.reporting_manager === 'object' && emp.reporting_manager !== null && 'id' in emp.reporting_manager
          ? emp.reporting_manager.id
          : typeof emp.reporting_manager_name === 'object' && emp.reporting_manager_name !== null && 'id' in emp.reporting_manager_name
            ? emp.reporting_manager_name.id
            : typeof emp.reporting_manager === 'number' || typeof emp.reporting_manager === 'string'
              ? emp.reporting_manager
              : '',
      who_referred_id:
        typeof emp.who_referred === 'object' && emp.who_referred !== null && !Array.isArray(emp.who_referred) && 'id' in emp.who_referred
          ? emp.who_referred.id
          : typeof emp.who_referred === 'number' || typeof emp.who_referred === 'string'
            ? emp.who_referred
            : '',
    });
  };


  const cancelEdit = () => {
    setEditRowId(null);
    setEditForm({});
  };

  const deleteEmployee = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await axiosInstance.delete(`/employee/${id}/`);
      setEmployees((prev) => prev.filter(emp => emp.id !== id));
      alert('Employee deleted successfully');
    } catch {
      alert('Failed to delete employee');
    }
  };

  const saveEdit = async (id: number) => {
    try {
      const payload: Partial<Employee> = { ...editForm };
      if ('reporting_manager_id' in editForm) {
        (payload as any).reporting_manager = editForm.reporting_manager_id;
        delete (payload as any).reporting_manager_id;
      }
      if ('who_referred_id' in editForm) {
        (payload as any).who_referred = editForm.who_referred_id;
        delete (payload as any).who_referred_id;
      }
      
      await axiosInstance.patch(`/employee/${id}/`, payload);
      setEmployees((prev) => prev.map(emp => emp.id === id ? { ...emp, ...payload } : emp));
      setEditRowId(null);
      setEditForm({});
    } catch {
      alert('Failed to update employee');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!employees.length) return <div>No employees found</div>;

  return (
    <>
           
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Register</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all employee records and information</p>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            onClick={() => navigate('/admin/form-employee-register')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>

        <ComponentCard 
          title="Employee Records" 
          desc={`Total employees: ${employees.length}`}
        >
          <div className="overflow-x-auto">
            <Table className="border-collapse border border-gray-200 dark:border-gray-700">
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Actions</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Employee ID</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Name & Photo</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Gender</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Birth</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Email</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Mobile</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Temporary Address</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Permanent Address</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Aadhar & Doc</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">PAN & Doc</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Guardian Name</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Guardian Mobile</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Category</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Department</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Designation</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Reporting Level</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Reporting Manager</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Joining</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Employer</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Date of Releaving</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Designation</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Previous Salary</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">CTC</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Gross Salary</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">EPF Status</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">UAN</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">ESIC Status</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">ESIC No</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Payment Method</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Bank Name</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Account No</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">IFSC Code</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Source of Employment</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Referred By</TableCell>
                  <TableCell isHeader className="border border-gray-200 dark:border-gray-700 p-4 text-left font-semibold text-gray-900 dark:text-white text-sm">Assets Assigned</TableCell>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Actions */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2">
                        {editRowId === emp.id ? (
                          <>
                            <button 
                              className="text-green-600 hover:text-green-800 font-semibold px-3 py-2 rounded bg-green-50 hover:bg-green-100 transition-colors duration-150 text-sm" 
                              onClick={() => saveEdit(emp.id)}
                            >
                              Save
                            </button>
                            <button 
                              className="text-gray-600 hover:text-gray-800 font-semibold px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors duration-150 text-sm" 
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors duration-150"
                              onClick={() => startEdit(emp)}
                              title="Edit Employee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors duration-150"
                              title="Delete Employee"
                              onClick={() => deleteEmployee(emp.id)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
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
                      {editRowId === emp.id ? (
                        <div className="space-y-2">
                          {/* Profile Photo Upload */}
                          <div className="mb-3">
                            <input 
                              name="photo" 
                              type="file" 
                              accept="image/*"
                              onChange={handleEditChange} 
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            />
                            <label className="text-sm text-gray-500">Upload Photo</label>
                          </div>
                          {/* Name inputs */}
                          <input 
                            name="first_name" 
                            value={editForm.first_name || ''} 
                            onChange={handleEditChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="First Name"
                          />
                          <input 
                            name="middle_name" 
                            value={editForm.middle_name || ''} 
                            onChange={handleEditChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="Middle Name"
                          />
                          <input 
                            name="last_name" 
                            value={editForm.last_name || ''} 
                            onChange={handleEditChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="Last Name"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          {/* Profile Photo Display */}
                          <div className="flex-shrink-0">
                            {emp.photo ? (
                              <img 
                                src={emp.photo} 
                                alt="Profile" 
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* Name Display */}
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ")}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Gender */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select 
                          name="gender" 
                          value={editForm.gender || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          {genderOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.gender || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Date of Birth */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="date_of_birth" 
                          type="date" 
                          value={editForm.date_of_birth || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Email */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="email" 
                          value={editForm.email || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          type="email"
                        />
                      ) : (
                        <a href={`mailto:${emp.email}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                          {emp.email}
                        </a>
                      )}
                    </TableCell>
                    
                    {/* Mobile */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="mobile" 
                          value={editForm.mobile || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          type="tel"
                        />
                      ) : (
                        <a href={`tel:${emp.mobile}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                          {emp.mobile}
                        </a>
                      )}
                    </TableCell>
                    
                    {/* Temporary Address */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="temporary_address" 
                          value={editForm.temporary_address || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.temporary_address || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Permanent Address */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="permanent_address" 
                          value={editForm.permanent_address || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.permanent_address || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Aadhar No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <div className="space-y-1">
                          <input 
                            name="aadhar_no" 
                            value={editForm.aadhar_no || ''} 
                            onChange={handleEditChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="Aadhar Number"
                          />
                          <input 
                            name="aadhar_card" 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={handleEditChange} 
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                          <label className="text-sm text-gray-500">Upload Aadhar</label>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-900 dark:text-gray-100 font-mono block">{emp.aadhar_no || '-'}</span>
                          {emp.aadhar_card && (
                            <a 
                              href={emp.aadhar_card} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              View
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* PAN No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <div className="space-y-1">
                          <input 
                            name="pan_no" 
                            value={editForm.pan_no || ''} 
                            onChange={handleEditChange} 
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="PAN Number"
                          />
                          <input 
                            name="pan_card" 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={handleEditChange} 
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                          <label className="text-sm text-gray-500">Upload PAN</label>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-900 dark:text-gray-100 font-mono block">{emp.pan_no || '-'}</span>
                          {emp.pan_card && (
                            <a 
                              href={emp.pan_card} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              View
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Guardian Name */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="guardian_name" 
                          value={editForm.guardian_name || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.guardian_name || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Guardian Mobile */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="guardian_mobile" 
                          value={editForm.guardian_mobile || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          type="tel"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.guardian_mobile || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Category */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="category" 
                          value={editForm.category || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.category || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Department */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select
                          name="department"
                          value={editForm.department || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {emp.department_name || '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Designation */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select
                          name="designation"
                          value={editForm.designation || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Designation</option>
                          {designations
                            .filter(d => !editForm.department || d.department === Number(editForm.department))
                            .map((desig) => (
                              <option key={desig.id} value={desig.id}>{desig.name}</option>
                            ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {emp.designation_name || '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Reporting Level */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="level_name" 
                          value={editForm.level_name || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.level_name || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Reporting Manager */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select
                          name="reporting_manager_id"
                          value={editForm.reporting_manager_id || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Manager</option>
                          {employeesList
                            .filter(e => e.id !== emp.id)
                            .map((manager) => (
                              <option key={manager.id} value={manager.id}>{manager.name}</option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {Array.isArray(emp.reporting_manager_name)
                            ? emp.reporting_manager_name.map((mgr) => [mgr.first_name, mgr.last_name].filter(Boolean).join(' ')).join(', ')
                            : typeof emp.reporting_manager_name === 'object' && emp.reporting_manager_name !== null
                              ? [emp.reporting_manager_name.first_name, emp.reporting_manager_name.last_name].filter(Boolean).join(' ')
                              : typeof emp.reporting_manager_name === 'string' && emp.reporting_manager_name
                                ? emp.reporting_manager_name
                                : emp.reporting_manager && (emp.reporting_manager.first_name || emp.reporting_manager.last_name)
                                  ? [emp.reporting_manager.first_name, emp.reporting_manager.last_name].filter(Boolean).join(' ')
                                  : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Date of Joining */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="date_of_joining" 
                          type="date" 
                          value={editForm.date_of_joining || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Previous Employer */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="previous_employer" 
                          value={editForm.previous_employer || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.previous_employer || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Date of Releaving */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="date_of_releaving" 
                          type="date" 
                          value={editForm.date_of_releaving || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {emp.date_of_releaving ? new Date(emp.date_of_releaving).toLocaleDateString() : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Previous Designation */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="previous_designation_name" 
                          value={editForm.previous_designation_name || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.previous_designation_name || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Previous Salary */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="previous_salary" 
                          type="number" 
                          value={editForm.previous_salary || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {emp.previous_salary ? `₹${emp.previous_salary.toLocaleString()}` : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* CTC */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="ctc" 
                          type="number" 
                          value={editForm.ctc || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="0"
                        />
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          ₹{emp.ctc?.toLocaleString() || '0'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Gross Salary */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="gross_salary" 
                          type="number" 
                          value={editForm.gross_salary || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {emp.gross_salary ? `₹${emp.gross_salary.toLocaleString()}` : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* EPF Status */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select 
                          name="epf_status" 
                          value={editForm.epf_status || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          {epfEsicOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                          emp.epf_status === 'Yes' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {emp.epf_status || 'No'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* UAN */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="uan" 
                          value={editForm.uan || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.uan || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* ESIC Status */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select 
                          name="esic_status" 
                          value={editForm.esic_status || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          {epfEsicOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                          emp.esic_status === 'Yes' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {emp.esic_status || 'No'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* ESIC No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="esic_no" 
                          value={editForm.esic_no || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.esic_no || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Payment Method */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select 
                          name="payment_method" 
                          value={editForm.payment_method || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Method</option>
                          {paymentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.payment_method || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Bank Name */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="bank_name" 
                          value={editForm.bank_name || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">{emp.bank_name || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Account No */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="account_no" 
                          value={editForm.account_no || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.account_no || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* IFSC Code */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="ifsc_code" 
                          value={editForm.ifsc_code || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{emp.ifsc_code || '-'}</span>
                      )}
                    </TableCell>
                    
                    {/* Source of Employment */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select 
                          name="source_of_employment" 
                          value={editForm.source_of_employment || ''} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Source</option>
                          {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {sourceOptions.find(opt => opt.value === emp.source_of_employment)?.label || emp.source_of_employment || '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Referred By */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <select
                          name="who_referred_id"
                          value={editForm.who_referred_id || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Referrer</option>
                          {employeesList
                            .filter(e => e.id !== emp.id)
                            .map((referrer) => (
                              <option key={referrer.id} value={referrer.id}>{referrer.name}</option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {Array.isArray(emp.who_referred)
                            ? emp.who_referred.map((ref) => [ref.first_name, ref.last_name].filter(Boolean).join(' ')).join(', ')
                            : typeof emp.who_referred === 'object' && emp.who_referred !== null
                              ? [emp.who_referred.first_name, emp.who_referred.last_name].filter(Boolean).join(' ')
                              : typeof emp.who_referred === 'string' && emp.who_referred
                                ? emp.who_referred
                                : '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Assets Assigned */}
                    <TableCell className="border border-gray-200 dark:border-gray-700 p-4">
                      {editRowId === emp.id ? (
                        <input 
                          name="asset_details" 
                          value={Array.isArray(editForm.asset_details) ? editForm.asset_details.join(', ') : (editForm.asset_details || '')} 
                          onChange={handleEditChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="Asset details..."
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {/* Display asset_names if available, otherwise asset_details */}
                          {Array.isArray(emp.asset_names) && emp.asset_names.length > 0 
                            ? emp.asset_names.join(', ')
                            : Array.isArray(emp.asset_details) && emp.asset_details.length > 0 
                              ? emp.asset_details.join(', ') 
                              : emp.asset_names || emp.asset_details || '-'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>
      </div>
    </>
  );
};

export default EmployeeRegister;
