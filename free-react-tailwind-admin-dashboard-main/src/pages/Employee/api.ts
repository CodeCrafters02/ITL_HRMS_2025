// Declare global variable from Vite config
declare const __API_URL__: string;
import axios, { InternalAxiosRequestConfig } from "axios";
import { jwtDecode } from "jwt-decode";

export const axiosInstance = axios.create({
  baseURL: `${__API_URL__}employee/`,
  headers: {
    "Content-Type": "application/json",
  },
});

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

// Add token to all requests automatically
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (token && isTokenExpired(token) && refreshToken) {
      try {
        const response = await axios.post(
          `${__API_URL__}/app/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );
        token = response.data.access;
        if (token) {
          localStorage.setItem("access_token", token);
        }
      } catch {
        // Automatic logout on refresh failure
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return Promise.reject(new Error(" Please sign in again."));
      }
    }
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);
