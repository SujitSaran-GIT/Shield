// src/api/searchApi.ts
import axiosInstance from './axiosConfig';

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  clientId: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ClientDTO {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  allowedOrigins: string[];
  idleTimeout?: number;
  isActive: boolean;
  createdAt: string;
}

export interface GlobalSearchResult {
  users: {
    content: UserDTO[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
  clients: ClientDTO[];
  query: string;
  totalResults: number;
}

export const searchApi = {
  // Global search across users and clients
  globalSearch: (query: string, page = 0, size = 10) =>
    axiosInstance.get<GlobalSearchResult>(`/search/global?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),

  // Search users only
  searchUsers: (query: string, page = 0, size = 10) =>
    axiosInstance.get<{
      content: UserDTO[];
      totalElements: number;
      totalPages: number;
      size: number;
      number: number;
    }>(`/search/users?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),

  // Search clients only
  searchClients: (query: string, limit = 10) =>
    axiosInstance.get<ClientDTO[]>(`/search/clients?query=${encodeURIComponent(query)}&limit=${limit}`),
};
