import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      const { logout } = useTVStore.getState();
      logout();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Import here to avoid circular dependency
import { useTVStore } from '../store/useTVStore';