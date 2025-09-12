import { createApiUrl} from "../../access/access.ts";
import axios from "axios";

export interface ServiceData {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export const getServiceList = async (): Promise<ServiceData[]> => {
  const url = createApiUrl("/website/service/");
  const response = await axios.get<ServiceData[]>(url);
  return response.data;
};

export interface ServiceCreateData {
  name: string;
  description?: string;
  is_active: boolean;
}

export const createService = async (data: ServiceCreateData) => {
  const url = createApiUrl("/website/service/");
  const response = await axios.post(url, data);
  return response.data;
};
export const getServiceById = async (id: number) => {
  const url = createApiUrl(`/website/service/${id}/`);
  const response = await axios.get(url);
  return response.data;
};

export interface ServiceEditData {
  name: string;
  description?: string;
  is_active: boolean;
}

export const updateService = async (id: number, data: ServiceEditData) => {
  const url = createApiUrl(`/website/service/${id}/`);
  const response = await axios.put(url, data);
  return response.data;
};
export const deleteService = async (id: number) => {
  const url = createApiUrl(`/website/service/${id}/`);
  const response = await axios.delete(url);
  return response.data;
};
