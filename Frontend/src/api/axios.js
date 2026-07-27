import axios from "axios";
import { auth } from "../firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Needed so the Meta OAuth state cookies (set by the backend on
  // /api/meta/connect) survive across requests when frontend and backend
  // are on different origins.
  withCredentials: true,
});

// Attach the current user's Firebase ID token to every outgoing request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
