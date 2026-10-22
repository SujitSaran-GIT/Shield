import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
interface Notice { id: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string; message: string; duration: number }
type NoticeInput = Omit<Notice, 'id' | 'duration' | 'type'> & { duration?: number; type?: Notice['type'] };
const notificationSlice = createSlice({ name: 'notification', initialState: { notifications: [] as Notice[] }, reducers: {
  showNotification: (state, action: PayloadAction<NoticeInput>) => { state.notifications.push({ ...action.payload, id: nanoid(), type: action.payload.type || 'info', duration: action.payload.duration ?? 5000 }); if (state.notifications.length > 5) state.notifications.shift(); },
  dismissNotification: (state, action: PayloadAction<string>) => { state.notifications = state.notifications.filter((notice) => notice.id !== action.payload); },
  clearNotifications: (state) => { state.notifications = []; },
} });
export const { showNotification, dismissNotification, clearNotifications } = notificationSlice.actions;
export const showSuccess = (message: string, title = 'Success') => showNotification({ type: 'success', title, message });
export const showError = (message: string, title = 'Error') => showNotification({ type: 'error', title, message });
export const showWarning = (message: string, title = 'Warning') => showNotification({ type: 'warning', title, message });
export const showInfo = (message: string, title = 'Info') => showNotification({ type: 'info', title, message });
export default notificationSlice.reducer;
