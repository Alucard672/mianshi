import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export const http = axios.create({
  baseURL: apiBase,
  timeout: 60_000
});

http.interceptors.request.use((config) => {
  const employeeToken = String(localStorage.getItem("employee_token") || "").trim();

  if (employeeToken) config.headers["x-employee-token"] = employeeToken;
  return config;
});

export function uploadsUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${apiBase}${path}`;
}
