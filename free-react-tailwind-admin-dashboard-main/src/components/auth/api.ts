// Declare global variable from Vite config
declare const __API_URL__: string;
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Use global API URL from Vite config
const API_URL = __API_URL__;

// 👉 Create an axios instance
export const axiosInstance = axios.create({
  baseURL: API_URL,
});

// 👉 Attach access token automatically
// Helper to check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const decoded: { exp?: number } = jwtDecode(token);
    if (!decoded.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
}

// Add token to all requests automatically, refresh if expired
axiosInstance.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (token && isTokenExpired(token) && refreshToken) {
      try {
        const response = await axios.post(`${API_URL}/app/token/refresh/`, {
          refresh: refreshToken,
        });
        token = response.data.access;
        if (token) {
          localStorage.setItem("access_token", token);
        }
      } catch {
        // Optionally handle refresh failure (e.g., logout)
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 👉 Handle 401: refresh token automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh_token")
    ) {
      originalRequest._retry = true;

      try {
        // Get new access token
        const refreshResponse = await axios.post(
          `${API_URL}/token/refresh/`,
          { refresh: localStorage.getItem("refresh_token") }
        );

        const newAccessToken = refreshResponse.data.access;

        // Save new token & update header
        localStorage.setItem("access_token", newAccessToken);
        axiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry original request with new token
        return axiosInstance(originalRequest);
      } catch (err) {
        // If refresh fails → log out
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
