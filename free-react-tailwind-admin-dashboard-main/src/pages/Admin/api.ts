import { createApiUrl,getAuthHeaders} from "../../access/access.ts";
import axios from "axios";

export interface EmployeeLevel {
  id: number;
  name: string;
}

export interface SourceChoice {
  value: string;
  label: string;
}
export interface ShiftAssigned {
  id: number;
  shift_type: string;
  checkin: string;
  checkout: string;
}
export interface EmployeeData {
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
  aadhar_card?: string | null;
  pan_no?: string;
  pan_card?: string | null;
  guardian_name?: string;
  guardian_mobile?: string;
  category?: string;
  department?: number;
  department_name?: string;
  designation?: number;
  designation_name?: string;
  level?: number;
  level_name?: EmployeeLevel;
  reporting_manager?: number | null;
  reporting_level?: number | null;
  payment_method?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  source_of_employment?: string;
  who_referred?: string;
  date_of_joining?: string;
  previous_employer?: string;
  date_of_releaving?: string;
  previous_designation_name?: string;
  previous_salary?: string;
  ctc?: string;
  gross_salary?: string;
  epf_status?: string;
  uan?: string;
  asset_details?: any[];
  asset_names?: string[];
  esic_status?: string;
  esic_no?: string;
  source_choices?: SourceChoice[];
  shift_assigned?: ShiftAssigned | null;

}

export const getEmployeeList = async (): Promise<EmployeeData[]> => {
  const url = createApiUrl("/app/employee/");
//   const headers = await getAuthHeaders(); // ✅ await here
  const response = await axios.get<EmployeeData[]>(url);
  return response.data;
};
