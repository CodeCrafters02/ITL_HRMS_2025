import { createApiUrl} from "../../access/access.ts";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';


interface JwtPayload {
  user_id: string;
  username?: string;
  email?: string;
}

const token = localStorage.getItem('access_token');

if (!token) {
  throw new Error("No token found");
}

const decoded = jwtDecode<JwtPayload>(token);
export const userId = decoded.user_id;
export const username = decoded.username ?? "Unknown";
export const email = decoded.email ?? "Unknown";

console.log("user_id", userId);
console.log("username", username);
console.log("email", email);


export interface UserRegister {
  id?: number;                 // optional for creation
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;                // e.g., 'admin', 'master', 'user', etc.
  is_active?: boolean;
  created_by?: number;         // user ID of creator, optional for creation
  company?: number;            // company ID for employees
  company_name?: string;       // company name (read-only)
  // Add other fields your model uses, e.g.:
  // date_joined?: string;     // ISO date string
  // phone_number?: string;
}

export interface Company {
  id: number;
  name: string;
  address: string;
  location?: string;
  email: string;
  phone_number: string;
  logo?: string;
  logo_url?: string;
}

// Fetch all companies
export const getCompanies = async (): Promise<Company[]> => {
  const url = createApiUrl("/app/company-with-admin/");
  
  // Get token from localStorage
  const access_token = localStorage.getItem('access') || localStorage.getItem('access_token');
  
  if (!access_token) {
    throw new Error("No authentication token found");
  }

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

// Create a new user
export const createUser = async (data: UserRegister) => {
  const url = createApiUrl("/app/usermanagement/");
  const response = await axios.post(url, data, { });
  return response.data;
};

// Get user by ID
export const getUserById = async (id: number) => {
  const url = createApiUrl(`/app/usermanagement/${id}/`);
  const response = await axios.get(url, {  });
  return response.data;
};

// Update user by ID (full update)
export const updateUser = async (id: number, data: Partial<UserRegister>) => {
  const url = createApiUrl(`/app/usermanagement/${id}/`);
  const response = await axios.put(url, data, {  });
  return response.data;
};

// Delete user by ID
export const deleteUser = async (id: number) => {
  const url = createApiUrl(`/app/usermanagement/${id}/`);
  const response = await axios.delete(url, {  });
  return response.data;
};
// Get full list of users
// api.ts

export const getUserList = async (createdBy?: number): Promise<UserRegister[]> => {
  let url = createApiUrl("/app/usermanagement/");
  if (createdBy) {
    url += `?created_by=${createdBy}`;
  }
  const response = await axios.get(url, {  /* add headers if needed */ });
  return response.data;
};

