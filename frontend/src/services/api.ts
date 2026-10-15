import axios from 'axios';
import { Participant, DrawRecord } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const backendApi = {
  healthCheck: async () => {
    try {
      const res = await api.get('/health');
      return res.data;
    } catch {
      return null;
    }
  },

  getStatus: async () => {
    const res = await api.get('/students/status');
    return res.data;
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/students/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  createDraw: async () => {
    const res = await api.post('/draws');
    return res.data;
  },

  getHistory: async () => {
    const res = await api.get('/draws/history');
    return res.data;
  },
};

export default api;
