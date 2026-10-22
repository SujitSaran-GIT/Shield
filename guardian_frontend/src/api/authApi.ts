// src/api/authApi.js
import axiosInstance from './axiosConfig';

export const authApi = {
  // User Auth
  register: (data: unknown) => axiosInstance.post('/auth/register', data),
  login: (data: unknown) => axiosInstance.post('/auth/login', data),
  
  // Admin Auth
  loginAdmin: (data: unknown) => axiosInstance.post('/auth/login/admin', data),
  
  // Token Management
  refreshToken: (data: unknown) => axiosInstance.post('/auth/refresh', data),
  logout: () => axiosInstance.post('/auth/logout'),
};
