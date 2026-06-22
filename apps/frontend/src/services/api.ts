import axios, { AxiosError } from "axios";

const TOKEN_KEY = "hyper_market_access_token";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const message = error.response?.data?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join(", ")
      : message || error.response?.data?.error || error.message || "Unexpected API error";

    return Promise.reject(new Error(normalizedMessage));
  },
);
