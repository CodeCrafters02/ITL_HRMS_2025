import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Dashboard/api';
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import MultiSelect from "../../components/form/MultiSelect";
import DatePicker from "../../components/form/date-picker";
import FileInput from "../../components/form/input/FileInput";
import Switch from "../../components/form/switch/Switch";

interface FormData {
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
  pan_no?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  category?: string;
  date_of_joining: string;
  previous_employer?: string;
  date_of_releaving?: string;
  previous_designation_name?: string;
  previous_salary?: string;
  ctc?: string;
  gross_salary?: string;
  epf_status?: string;
  uan?: string;
  esic_status?: string;
  esic_no?: string;
  payment_method?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  source_of_employment?: string;
  department: string;
  designation: string;
  level?: string;
  reporting_manager?: string;
  who_referred?: string;
}

const initialForm: FormData = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  email: '',
  date_of_birth: '',
  mobile: '',
  temporary_address: '',
  permanent_address: '',
  photo: '',
  aadhar_no: '',
  pan_no: '',
  guardian_name: '',
  guardian_mobile: '',
  category: '',
  date_of_joining: '',
  previous_employer: '',
  date_of_releaving: '',
  previous_designation_name: '',
  previous_salary: '',
  ctc: '',
  gross_salary: '',
  epf_status: '',
  uan: '',
  esic_status: '',
  esic_no: '',
  payment_method: '',
  account_no: '',
  ifsc_code: '',
  bank_name: '',
  source_of_employment: '',
  department: '',
  designation: '',
  level: '',
  reporting_manager: '',
  who_referred: '',
};



const SOURCE_CHOICES = [
  { value: 'internalreference', label: 'Internal Reference' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'walkin', label: 'Walk In' },
  { value: 'socialmedia', label: 'Social Media' },
];

const EmployeeRegisterForm: React.FC = () => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [showPrevEmployment, setShowPrevEmployment] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showUan, setShowUan] = useState(false);
  const [showEsic, setShowEsic] = useState(false);
  const [assetOptions, setAssetOptions] = useState<{ id: number; name: string }[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string; department: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; department: string }[]>([]);
  // employees: all employees; reportingManagers: array of {id, name} for dropdown
  // employees: all employees; reportingManagers: array of {id, name} for dropdown
  // const [employees, setEmployees] = useState<{ id: string; name: string; level?: number | string }[]>([]); // kept for future use if needed
  const [reportingManagers, setReportingManagers] = useState<{ id: number | string; name: string }[]>([]);
  // Store the full employee API response for reporting_manager_name lookup
// Removed unused EmployeeApi and employeeApiData
  const navigate = useNavigate();

  // Fetch dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, desigRes, assetRes] = await Promise.all([
          axiosInstance.get('/departments/'),
          axiosInstance.get('/designations/'),
          axiosInstance.get('/assets/'),
        ]);
        setDepartments(
          deptRes.data.map((dept: { id?: string | number; department_id?: string | number; _id?: string | number; name?: string; department_name?: string; dept_name?: string; title?: string }) => ({
            id: String(dept.id ?? dept.department_id ?? dept._id),
            name: String(dept.name ?? dept.department_name ?? dept.dept_name ?? dept.title)
          }))
        );
        setDesignations(
          desigRes.data.map((desig: { id?: string | number; designation_id?: string | number; _id?: string | number; name?: string; designation_name?: string; title?: string; department?: string | number; department_id?: string | number }) => ({
            id: String(desig.id ?? desig.designation_id ?? desig._id),
            name: String(desig.name ?? desig.designation_name ?? desig.title),
            department: String(desig.department ?? desig.department_id ?? '')
          }))
        );
        setAssetOptions(
          assetRes.data.map((asset: { id?: number; asset_id?: number; _id?: number; name?: string; asset_name?: string; title?: string }) => ({
            id: Number(asset.id ?? asset.asset_id ?? asset._id),
            name: String(asset.name ?? asset.asset_name ?? asset.title)
          }))
        );
        // Fetch initial level choices and reporting managers for default level
        const url = form.level ? `/employee/get-reporting-manager-choices/?reporting_level_id=${form.level}` : '/employee/get-reporting-manager-choices/';
        const res = await axiosInstance.get(url);
        setLevels((Array.isArray(res.data.level_choices) ? res.data.level_choices : []).map((lvl: { id: number | string; name: string }) => ({ id: String(lvl.id), name: lvl.name })));
        setReportingManagers((Array.isArray(res.data.reporting_managers) ? res.data.reporting_managers : []).map((mgr: { id: number | string; name: string }) => ({ id: mgr.id, name: mgr.name })));
      } catch {
        // Optionally handle error
      }
    };
    fetchOptions();
  }, [form.level]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // For PK fields, store as number (or empty string if not selected)
    const pkFields = ['department', 'designation', 'level', 'reporting_manager'];
    if (pkFields.includes(name)) {
      setForm(prevForm => {
        const updatedForm = { ...prevForm, [name]: value === '' ? '' : Number(value) };
        // If level changes, fetch reporting managers and levels from backend endpoint
        if (name === 'level') {
          const url = `/employee/get-reporting-manager-choices/?reporting_level_id=${value}`;
          axiosInstance.get(url).then(res => {
            setReportingManagers((Array.isArray(res.data.reporting_managers) ? res.data.reporting_managers : []).map((mgr: { id: number | string; name: string }) => ({ id: mgr.id, name: mgr.name })));
            setLevels((Array.isArray(res.data.level_choices) ? res.data.level_choices : []).map((lvl: { id: number | string; name: string }) => ({ id: String(lvl.id), name: lvl.name })));
          });
          updatedForm.reporting_manager = '';
        }
        return updatedForm;
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  // Conditional logic
  React.useEffect(() => {
    setShowBank(!!form.payment_method && form.payment_method !== 'cash');
    setShowUan(form.epf_status === 'yes');
    setShowEsic(form.esic_status === 'yes');
  }, [form.payment_method, form.epf_status, form.esic_status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      // Prepare payload: only include non-empty fields, convert PKs to int, handle file upload, and ensure date format
      const payload: Record<string, unknown> = { ...form, asset_details: selectedAssets };
      // Remove empty string fields (except required fields)
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') delete payload[key];
      });

      // Convert PK fields to int if present and not empty, else remove
      const pkFields = ['department', 'designation', 'level', 'reporting_manager'];
      pkFields.forEach((field) => {
        if (payload[field] !== undefined && payload[field] !== '') {
          const parsed = parseInt(payload[field] as string, 10);
          if (!isNaN(parsed)) {
            payload[field] = parsed;
          } else {
            delete payload[field];
          }
        } else {
          delete payload[field];
        }
      });

      // Only send who_referred if source_of_employment is 'internalreference'
      if (payload.source_of_employment !== 'internalreference') {
        delete payload.who_referred;
      }

      // Ensure date fields are in YYYY-MM-DD format (if present)
      const dateFields = ['date_of_birth', 'date_of_joining', 'date_of_releaving'];
      dateFields.forEach((field) => {
        if (payload[field]) {
          const val = payload[field] as string;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              payload[field] = d.toISOString().slice(0, 10);
            }
          }
        }
      });

      // Handle file upload for photo (if present and is a File)
      let dataToSend: FormData | Record<string, unknown> = payload;
      let config = {};
      // Type guard for File
      const isFile = (f: unknown): f is File => typeof File !== 'undefined' && f instanceof File;
      if (form.photo && isFile(form.photo)) {
        // Use FormData for file upload
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'photo' && isFile(value)) {
            formData.append('photo', value as Blob);
          } else if (Array.isArray(value)) {
            value.forEach((v, i) => formData.append(`${key}[${i}]`, String(v)));
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            formData.append(key, String(value));
          }
        });
        dataToSend = formData as unknown as FormData | Record<string, unknown>;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }

      await axiosInstance.post('/employee/', dataToSend, config);
      setSuccess('Employee registered successfully!');
      setTimeout(() => navigate(-1), 1200);
    } catch (err: unknown) {
      // Try to extract backend error message
      let errorMsg = 'Failed to register employee';
      type AxiosErrorType = { response?: { data?: unknown } };
      const errorObj = err as AxiosErrorType;
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in errorObj &&
        errorObj.response &&
        'data' in errorObj.response
      ) {
        const respData = errorObj.response.data;
        if (typeof respData === 'string') {
          errorMsg = respData;
        } else if (typeof respData === 'object' && respData !== null) {
          // Recursively extract all error messages from the object
          const extractMessages = (obj: unknown): string[] => {
            if (Array.isArray(obj)) {
              return obj.map(extractMessages).flat();
            } else if (typeof obj === 'object' && obj !== null) {
              return Object.values(obj).map(extractMessages).flat();
            } else if (typeof obj === 'string') {
              return [obj];
            } else {
              return [];
            }
          };
          errorMsg = extractMessages(respData).join(' ');
        }
        
        console.error('Backend error:', respData);
      } else {
        console.error('Unknown error:', err);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelectChange = (name: string) => (value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setForm(prev => ({ ...prev, [name]: file }));
    }
  };

  const handleDateChange = (name: string) => (_dates: Date[], currentDateString: string) => {
    setForm(prev => ({ ...prev, [name]: currentDateString }));
  };

  return (
    <>
   
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Register Employee</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Add a new employee to the system with complete details</p>
          </div>
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <>
              <ComponentCard title="Personal Information" desc="Basic personal details of the employee">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input 
                        id="first_name"
                        name="first_name" 
                        value={form.first_name} 
                        onChange={handleChange} 
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="middle_name">Middle Name</Label>
                      <Input 
                        id="middle_name"
                        name="middle_name" 
                        value={form.middle_name} 
                        onChange={handleChange} 
                        placeholder="Enter middle name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input 
                        id="last_name"
                        name="last_name" 
                        value={form.last_name} 
                        onChange={handleChange} 
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Gender *</Label>
                      <Select
                        options={genderOptions}
                        placeholder="Select gender"
                        onChange={handleSelectChange('gender')}
                        defaultValue={form.gender}
                      />
                    </div>
                    <div>
                      <DatePicker
                        id="date_of_birth"
                        label="Date of Birth *"
                        placeholder="Select date of birth"
                        defaultDate={form.date_of_birth}
                        onChange={handleDateChange('date_of_birth')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="mobile">Mobile Number *</Label>
                      <Input 
                        id="mobile"
                        name="mobile" 
                        value={form.mobile} 
                        onChange={handleChange} 
                        type="tel"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input 
                        id="email"
                        name="email" 
                        value={form.email} 
                        onChange={handleChange} 
                        type="email"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="temporary_address">Temporary Address</Label>
                      <Input 
                        id="temporary_address"
                        name="temporary_address" 
                        value={form.temporary_address} 
                        onChange={handleChange} 
                        placeholder="Enter temporary address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="permanent_address">Permanent Address</Label>
                      <Input 
                        id="permanent_address"
                        name="permanent_address" 
                        value={form.permanent_address} 
                        onChange={handleChange} 
                        placeholder="Enter permanent address"
                      />
                    </div>
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="Additional Details" desc="Document and guardian information">
                <div className="space-y-6">
                  <div>
                    <Label>Profile Photo</Label>
                    <FileInput onChange={handleFileChange('photo')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="aadhar_no">Aadhar Number</Label>
                      <Input 
                        id="aadhar_no"
                        name="aadhar_no" 
                        value={form.aadhar_no} 
                        onChange={handleChange} 
                        placeholder="Enter Aadhar number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pan_no">PAN Number</Label>
                      <Input 
                        id="pan_no"
                        name="pan_no" 
                        value={form.pan_no} 
                        onChange={handleChange} 
                        placeholder="Enter PAN number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="aadhar_card">Aadhar Card </Label>
                      <FileInput onChange={handleFileChange('aadhar_card')} />
                    </div>
                    <div>
                      <Label htmlFor="pan_card">PAN Card</Label>
                      <FileInput onChange={handleFileChange('pan_card')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="guardian_name">Guardian Name</Label>
                      <Input 
                        id="guardian_name"
                        name="guardian_name" 
                        value={form.guardian_name} 
                        onChange={handleChange} 
                        placeholder="Enter guardian name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guardian_mobile">Guardian Mobile</Label>
                      <Input 
                        id="guardian_mobile"
                        name="guardian_mobile" 
                        value={form.guardian_mobile} 
                        onChange={handleChange} 
                        type="tel"
                        placeholder="Enter guardian mobile"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input 
                      id="category"
                      name="category" 
                      value={form.category} 
                      onChange={handleChange} 
                      placeholder="Enter category"
                    />
                  </div>

                  {assetOptions.length > 0 && (
                    <div>
                      <MultiSelect
                        label="Asset Details"
                        options={assetOptions.map(asset => ({
                          value: asset.id.toString(),
                          text: asset.name,
                          selected: selectedAssets.includes(asset.id)
                        }))}
                        onChange={(values) => setSelectedAssets(values.map(v => Number(v)))}
                      />
                    </div>
                  )}
                </div>
              </ComponentCard>

              <div className="flex justify-end">
                <button 
                  type="button" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200"
                  onClick={handleNext}
                >
                  Next 
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <ComponentCard title="Employment Details" desc="Department, designation and employment information">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Department *</Label>
                      <Select
                        options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                        placeholder="Select department"
                        onChange={handleSelectChange('department')}
                        defaultValue={form.department}
                      />
                    </div>
                    <div>
                      <Label>Designation *</Label>
                      <Select
                        options={designations
                          .filter(desig => String(desig.department) === String(form.department))
                          .map(desig => ({ value: desig.id, label: desig.name }))}
                        placeholder="Select designation"
                        onChange={handleSelectChange('designation')}
                        defaultValue={form.designation}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <DatePicker
                        id="date_of_joining"
                        label="Date of Joining *"
                        placeholder="Select joining date"
                        defaultDate={form.date_of_joining}
                        onChange={handleDateChange('date_of_joining')}
                      />
                    </div>
                    <div>
                      <Label>Source of Employment</Label>
                      <Select
                        options={SOURCE_CHOICES}
                        placeholder="Select source"
                        onChange={handleSelectChange('source_of_employment')}
                        defaultValue={form.source_of_employment}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Reporting Level</Label>
                      <Select
                        options={levels.map(level => ({ value: level.id, label: level.name }))}
                        placeholder="Select level"
                        onChange={value => {
                          handleSelectChange('level')(value);
                          // Update reporting managers for selected level
                         
                          
                          setForm(prev => ({ ...prev, reporting_manager: '' }));
                        }}
                        defaultValue={form.level}
                      />
                    </div>
                    <div>
                      <Label>Reporting Manager</Label>
                      <Select
                        options={reportingManagers.map(mgr => ({ value: mgr.id.toString(), label: mgr.name }))}
                        placeholder="Select reporting manager"
                        onChange={handleSelectChange('reporting_manager')}
                        defaultValue={form.reporting_manager}
                      />
                    </div>
                  </div>

                  {form.source_of_employment === 'internalreference' && (
                    <div>
                      <Label htmlFor="who_referred">Who Referred</Label>
                      <Input 
                        id="who_referred"
                        name="who_referred" 
                        value={form.who_referred} 
                        onChange={handleChange} 
                        placeholder="Enter name of referrer"
                      />
                    </div>
                  )}
                </div>
              </ComponentCard>

              <ComponentCard title="Previous Employment" desc="Previous work experience (optional)">
                <div className="space-y-6">
                  <div className="flex items-center">
                    <Switch
                      label="Add Previous Employment Details"
                      defaultChecked={showPrevEmployment}
                      onChange={setShowPrevEmployment}
                    />
                  </div>

                  {showPrevEmployment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="previous_employer">Previous Employer</Label>
                        <Input 
                          id="previous_employer"
                          name="previous_employer" 
                          value={form.previous_employer} 
                          onChange={handleChange} 
                          placeholder="Enter previous employer"
                        />
                      </div>
                      <div>
                        <DatePicker
                          id="date_of_releaving"
                          label="Date of Leaving"
                          placeholder="Select leaving date"
                          defaultDate={form.date_of_releaving}
                          onChange={handleDateChange('date_of_releaving')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="previous_designation_name">Previous Designation</Label>
                        <Input 
                          id="previous_designation_name"
                          name="previous_designation_name" 
                          value={form.previous_designation_name} 
                          onChange={handleChange} 
                          placeholder="Enter previous designation"
                        />
                      </div>
                      <div>
                        <Label htmlFor="previous_salary">Previous Salary</Label>
                        <Input 
                          id="previous_salary"
                          name="previous_salary" 
                          value={form.previous_salary} 
                          onChange={handleChange} 
                          type="number"
                          placeholder="Enter previous salary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>

              <ComponentCard title="Salary & Benefits" desc="Compensation and benefit details">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label>Payment Method</Label>
                      <Select
                        options={paymentOptions}
                        placeholder="Select payment method"
                        onChange={handleSelectChange('payment_method')}
                        defaultValue={form.payment_method}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ctc">CTC</Label>
                      <Input 
                        id="ctc"
                        name="ctc" 
                        value={form.ctc} 
                        onChange={handleChange} 
                        type="number"
                        placeholder="Enter CTC amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gross_salary">Gross Salary</Label>
                      <Input 
                        id="gross_salary"
                        name="gross_salary" 
                        value={form.gross_salary} 
                        onChange={handleChange} 
                        type="number"
                        placeholder="Enter gross salary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Switch
                      label="Add Bank Details"
                      defaultChecked={showBank}
                      onChange={setShowBank}
                    />
                  </div>

                  {showBank && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="account_no">Account Number</Label>
                        <Input 
                          id="account_no"
                          name="account_no" 
                          value={form.account_no} 
                          onChange={handleChange} 
                          placeholder="Enter account number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input 
                          id="ifsc_code"
                          name="ifsc_code" 
                          value={form.ifsc_code} 
                          onChange={handleChange} 
                          placeholder="Enter IFSC code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input 
                          id="bank_name"
                          name="bank_name" 
                          value={form.bank_name} 
                          onChange={handleChange} 
                          placeholder="Enter bank name"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>EPF Status</Label>
                      <Select
                        options={epfEsicOptions}
                        placeholder="Select EPF status"
                        onChange={handleSelectChange('epf_status')}
                        defaultValue={form.epf_status}
                      />
                    </div>
                    <div>
                      <Label>ESIC Status</Label>
                      <Select
                        options={epfEsicOptions}
                        placeholder="Select ESIC status"
                        onChange={handleSelectChange('esic_status')}
                        defaultValue={form.esic_status}
                      />
                    </div>
                  </div>

                 

                  {showUan && (
                    <div>
                      <Label htmlFor="uan">UAN Number</Label>
                      <Input 
                        id="uan"
                        name="uan" 
                        value={form.uan} 
                        onChange={handleChange} 
                        placeholder="Enter UAN number"
                      />
                    </div>
                  )}


                  {showEsic && (
                    <div>
                      <Label htmlFor="esic_no">ESIC Number</Label>
                      <Input 
                        id="esic_no"
                        name="esic_no" 
                        value={form.esic_no} 
                        onChange={handleChange} 
                        placeholder="Enter ESIC number"
                      />
                    </div>
                  )}
                </div>
              </ComponentCard>

              <div className="flex justify-between">
                <button 
                  type="button" 
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default EmployeeRegisterForm;
