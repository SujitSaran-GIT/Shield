// src/api/notificationApi.ts
import axiosInstance from './axiosConfig';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  actionUrl?: string;
  metadata?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const notificationApi = {
  // Get paginated notifications for current user
  getNotifications: (page = 0, size = 20) =>
    axiosInstance.get<NotificationPage>(`/notifications?page=${page}&size=${size}`),

  // Get unread notifications
  getUnreadNotifications: () =>
    axiosInstance.get<Notification[]>(`/notifications/unread`),

  // Get unread count
  getUnreadCount: () =>
    axiosInstance.get<{ count: number }>(`/notifications/unread/count`),

  // Mark notification as read
  markAsRead: (id: string) =>
    axiosInstance.put(`/notifications/${id}/read`),

  // Mark all notifications as read
  markAllAsRead: () =>
    axiosInstance.put(`/notifications/mark-all-read`),

  // Delete notification
  deleteNotification: (id: string) =>
    axiosInstance.delete(`/notifications/${id}`),

  // Get recent notifications
  getRecentNotifications: (days = 7) =>
    axiosInstance.get<Notification[]>(`/notifications/recent?days=${days}`),
};
