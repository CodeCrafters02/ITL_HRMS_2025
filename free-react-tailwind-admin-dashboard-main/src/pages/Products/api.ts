import { createApiUrl } from "../../access/access.ts";
import axios from "axios";

export interface ProductData {
  id: number;
  name: string;
  description?: string;
  service?: number; // Service ID
  service_name?: string; // If API returns service name
  image?: string; // Image URL
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getProductList = async (): Promise<ProductData[]> => {
  const url = createApiUrl("/website/product/");
  const response = await axios.get<ProductData[]>(url);
  return response.data;
};

export interface ProductCreateData {
  name: string;
  description?: string;
  service?: number;
  image?: File; // New
  is_active: boolean;
}

export const createProduct = async (data: ProductCreateData) => {
  const url = createApiUrl("/website/product/");
  const formData = new FormData();
  formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.service) formData.append("service", String(data.service));
  if (data.image) formData.append("image", data.image);
  formData.append("is_active", String(data.is_active));

  const response = await axios.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getProductById = async (id: number) => {
  const url = createApiUrl(`/website/product/${id}/`);
  const response = await axios.get(url);
  return response.data;
};

export interface ProductEditData {
  name: string;
  description?: string;
  service?: number;
  image?: File | null; // optional image
  is_active: boolean;
}

export const updateProduct = async (id: number, data: ProductEditData) => {
  const url = createApiUrl(`/website/product/${id}/`);
  const formData = new FormData();
  formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.service) formData.append("service", String(data.service));
  if (data.image instanceof File) formData.append("image", data.image);
  formData.append("is_active", String(data.is_active));

  const response = await axios.put(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteProduct = async (id: number) => {
  const url = createApiUrl(`/website/product/${id}/`);
  const response = await axios.delete(url);
  return response.data;
};

// Service List
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
