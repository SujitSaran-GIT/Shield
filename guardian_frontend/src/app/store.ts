// src/app/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import usersReducer from '../features/users/usersSlice';
import clientsReducer from '../features/clients/clientsSlice';
import auditReducer from '../features/audit/auditSlice';
import healthReducer from '../features/health/healthSlice';
import notificationReducer from '../features/notification/notificationSlice';

const reducer = combineReducers({
    auth: authReducer,
    dashboard: dashboardReducer,
    users: usersReducer,
    clients: clientsReducer,
    audit: auditReducer,
    health: healthReducer,
    notification: notificationReducer,
  });
export const store = configureStore({
  reducer: (state: ReturnType<typeof reducer> | undefined, action) => {
    if (['auth/sessionExpired', 'auth/logout/fulfilled', 'auth/logout/rejected'].includes(action.type)) state = undefined;
    return reducer(state, action);
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['notification/showNotification'],
        ignoredPaths: ['notification.notifications'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

