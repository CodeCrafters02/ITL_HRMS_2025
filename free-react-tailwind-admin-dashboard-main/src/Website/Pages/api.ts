import { createApiUrl, getAuthHeaders } from "../../access/access.ts";
import axios from "axios";

export interface ServiceData {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubServiceData {
  id: number;
  name: string;
  description?: string;
  service: number;               
  service_details?: ServiceData; 
}

export interface DemoRequestCreateData {
  name: string;
  email: string;
  contact_number: string;
  service_id: number;
  preferred_datetime: string; 
  message?: string | null;
}

export interface ProductData {
  id: number;
  name: string;
  description?: string;
  service_details?:ServiceData;
  image?: string; 
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ContactRequestCreateData {
  name: string;
  email: string;
  contact_number: string;
  message?: string | null;
}

export const getServiceList = async (): Promise<ServiceData[]> => {
  const url = createApiUrl("/website/service/");
  const response = await axios.get<ServiceData[]>(url);
  return response.data;
};
export const getSubServiceList = async (): Promise<SubServiceData[]> => {
  const url = createApiUrl("/website/subservice/");
  const response = await axios.get<SubServiceData[]>(url);
  return response.data;
};
export const postDemoRequest = async (data: DemoRequestCreateData): Promise<void> => {
  const url = createApiUrl("/website/demorequest/");
  await axios.post(url, data);
};

export const getProductList = async (): Promise<ProductData[]> => {
  const url = createApiUrl("/website/product/");
  const response = await axios.get<ProductData[]>(url);
  return response.data;
};

export const postContactRequest = async (data: ContactRequestCreateData): Promise<void> => {
  const url = createApiUrl("/website/contactrequest/");
  await axios.post(url, data);
};
