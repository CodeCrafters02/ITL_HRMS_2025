import { createApiUrl } from "../../access/access.ts";
import axios from "axios";

export interface ProductImageData {
  id: number;
  image: string; // image URL
}

export interface ProductData {
  id: number;
  name: string;
  description?: string;
  client?:string;
  service?: number; // Service ID
  service_name?: string; // Optional service name
  images?: ProductImageData[];  // array of image objects
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
  client?:string
  service?: number;
  images?: File[]; // multiple files now
  is_active: boolean;
}
export const createProduct = async (data: ProductCreateData) => {
  const url = createApiUrl("/website/product/");
  const formData = new FormData();
  formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.client) formData.append("client", data.client);
  if (data.service !== undefined && data.service !== null)
    formData.append("service", String(data.service));
  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => formData.append("images", file)); // or "images[]"
  }
  formData.append("is_active", String(data.is_active));

  const response = await axios.post(url, formData); // Let axios set headers
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
  client?:string;
  images?: File[];
  is_active: boolean;
}

// export const updateProduct = async (id: number, data: ProductEditData) => {
//   const url = createApiUrl(`/website/product/${id}/`);
//   const formData = new FormData();
//   formData.append("name", data.name);
//   if (data.description) formData.append("description", data.description);
//   if (data.service) formData.append("service", String(data.service));
//   if (data.images && data.images.length > 0) {
//     data.images.forEach((file) => formData.append("images", file));
//   }  formData.append("is_active", String(data.is_active));

//   const response = await axios.put(url, formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return response.data;
// };

export const updateProduct = async (id: number, data: FormData, isFormData = false) => {
  const url = createApiUrl(`/website/product/${id}/`);
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};
  const response = await axios.put(url, data, config);
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
