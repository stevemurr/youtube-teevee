import axios from 'axios';
import { useTVStore } from '../store/useTVStore';

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useTVStore.getState();
      logout();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);