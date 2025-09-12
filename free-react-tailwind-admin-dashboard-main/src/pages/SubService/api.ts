import { createApiUrl} from "../../access/access.ts";
import axios from "axios";

export interface ServiceData {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubServiceData {
  id: number;
  service: number | null;              // ID of the related service (write-only in serializer)
  service_details: ServiceData | null; // Full service object (read-only)
  name: string;
  description?: string | null;
}

// Fetch all subservices
export const getSubServiceList = async (): Promise<SubServiceData[]> => {
  const url = createApiUrl("/website/subservice/");
  const response = await axios.get<SubServiceData[]>(url, {
    
  });
  return response.data;
};

export interface SubServiceCreateData {
  service: number | null;  // service ID to link
  name: string;
  description?: string | null;
}

// Create subservice
export const createSubService = async (data: SubServiceCreateData) => {
  const url = createApiUrl("/website/subservice/");
  const response = await axios.post(url, data, {
  
  });
  return response.data;
};

// Get subservice by ID
export const getSubServiceById = async (id: number): Promise<SubServiceData> => {
  const url = createApiUrl(`/website/subservice/${id}/`);
  const response = await axios.get(url, {
 
  });
  return response.data;
};

export interface SubServiceEditData {
  service: number | null;  // ID only on update
  name: string;
  description?: string | null;
}

// Update subservice
export const updateSubService = async (id: number, data: SubServiceEditData) => {
  const url = createApiUrl(`/website/subservice/${id}/`);
  const response = await axios.put(url, data, {
  
  });
  return response.data;
};

// Delete subservice
export const deleteSubService = async (id: number) => {
  const url = createApiUrl(`/website/subservice/${id}/`);
  const response = await axios.delete(url, {
  
  });
  return response.data;
};
