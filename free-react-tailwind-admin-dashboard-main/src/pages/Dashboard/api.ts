// src/components/auth/api.ts
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000/app/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to all requests automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
