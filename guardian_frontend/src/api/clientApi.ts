// src/api/clientApi.js
import axiosInstance from './axiosConfig';

export const clientApi = {
  registerClient: (data: unknown) => axiosInstance.post('/admin/clients', data),
  publicRegisterClient: (data: unknown) => axiosInstance.post('/admin/clients/public-register', data),
  getAllClients: (params?: Record<string, unknown>) => axiosInstance.get('/admin/clients', { params }),
  getClientById: (id: string) => axiosInstance.get(`/admin/clients/${id}`),
  updateClient: (id: string, data: unknown) => axiosInstance.put(`/admin/clients/${id}`, data),
  deactivateClient: (id: string) => axiosInstance.put(`/admin/clients/${id}/deactivate`),
  activateClient: (id: string) => axiosInstance.put(`/admin/clients/${id}/activate`),
};
