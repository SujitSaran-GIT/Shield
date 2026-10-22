// src/api/index.js

import axiosInstance from './axiosConfig';


export * from './authApi';
export * from './userApi';
export * from './clientApi';
export * from './auditApi';
export * from './healthApi';
export * from './notificationApi';
export * from './searchApi';

// Dashboard API module
export const dashboardApi = {
  getMetrics: () => axiosInstance.get('/dashboard/metrics'),
  getActivityData: (days = 7) => 
    axiosInstance.get('/dashboard/activity', { params: { days } }),
  getClientDistribution: () => 
    axiosInstance.get('/dashboard/clients/distribution'),
};

// Admin API module
export const adminApi = {
  getInvitations: (page = 0, size = 20) => axiosInstance.get('/admin/invitations', { params: { page, size } }),
  invite: (email: string) => axiosInstance.post('/admin/invitations', { email }),
  confirmInvitation: (id: string) => axiosInstance.put(`/admin/invitations/${encodeURIComponent(id)}/confirm`),
  revokeInvitation: (id: string) => axiosInstance.delete(`/admin/invitations/${encodeURIComponent(id)}`),
  manageAdmins: {
    getById: (id: string) => axiosInstance.get(`/admin/admins/${encodeURIComponent(id)}`),
    create: (data: Record<string, unknown>) => axiosInstance.post('/admin/invitations', data),
    activate: (id: string) => axiosInstance.put(`/admin/admins/${encodeURIComponent(id)}/activate`),
    delete: (id: string) => axiosInstance.put(`/admin/admins/${id}/deactivate`),
  },
};
