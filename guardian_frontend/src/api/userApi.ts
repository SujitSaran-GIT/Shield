// src/api/userApi.js
import axiosInstance from './axiosConfig';

export const userApi = {
  getAllUsers: (params: unknown, signal?: AbortSignal) => axiosInstance.get('/users', { params, signal }),
  searchUsers: (query: string, params: Record<string, unknown>) => 
    axiosInstance.get('/users/search', { params: { query, ...params } }),
  getUserById: (id: string) => axiosInstance.get(`/users/${id}`),
  getUserSessions: (id: string) => axiosInstance.get(`/users/${id}/sessions`),
  blockUser: (id: string) => axiosInstance.put(`/users/${id}/block`),
  unblockUser: (id: string) => axiosInstance.put(`/users/${id}/unblock`),
  deleteUser: (id: string) => axiosInstance.delete(`/users/${id}`),
  
  // Admin Management
  getAdminById: (id: string) => axiosInstance.get(`/admin/admins/${id}`),
  updateAdminRole: (id: string, role: string) => 
    axiosInstance.put(`/admin/admins/${id}/role`, { newAdminRole: role }),
  deactivateAdmin: (id: string) => axiosInstance.put(`/admin/admins/${id}/deactivate`),
  activateAdmin: (id: string) => axiosInstance.put(`/admin/admins/${id}/activate`),
};
