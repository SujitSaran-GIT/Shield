import api from './axiosConfig';
import type { User } from '../types';

export const adminApi = {
  get: (id: string, signal?: AbortSignal) => api.get<User>(`/admin/admins/${encodeURIComponent(id)}`, { signal }),
  activate: (id: string) => api.put(`/admin/admins/${encodeURIComponent(id)}/activate`),
  deactivate: (id: string) => api.put(`/admin/admins/${encodeURIComponent(id)}/deactivate`),
};
