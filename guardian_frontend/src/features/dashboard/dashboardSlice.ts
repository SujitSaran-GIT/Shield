// src/features/dashboard/dashboardSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from '../../api';
import { showError } from '../notification/notificationSlice';
import { errorMessage } from '../../api/axiosConfig';
import type { DashboardMetrics, DailyActivity } from '../../types';

interface DashboardState {
  requests: Partial<Record<string, string>>;
  metrics: DashboardMetrics | null;
  activityData: { dailyActivities: DailyActivity[] } | null;
  clientDistribution: { distribution: { clientId: string; clientName: string; userCount: number }[] } | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  realTimeData: {
    activeSessions: number;
    recentLogins: { user?: string; time?: string; client?: string }[];
    systemAlerts: { id?: string | number; type: string; message: string; time: string }[];
  };
}

export const fetchDashboardMetrics = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await dashboardApi.getMetrics();
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load dashboard metrics'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchActivityData = createAsyncThunk(
  'dashboard/fetchActivityData',
  async (days: number = 7, { dispatch, rejectWithValue }) => {
    try {
      const response = await dashboardApi.getActivityData(days);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load activity data'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchClientDistribution = createAsyncThunk(
  'dashboard/fetchClientDistribution',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await dashboardApi.getClientDistribution();
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load client distribution'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    requests: {},
    metrics: null,
    activityData: null,
    clientDistribution: null,
    loading: false,
    error: null,
    lastUpdated: null,
    realTimeData: {
      activeSessions: 0,
      recentLogins: [],
      systemAlerts: [],
    },
  } as DashboardState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
    updateRealTimeData: (state, action) => {
      const payload = action.payload;

      // Handle different types of WebSocket messages
      if (payload.metrics) {
        // Dashboard metrics update
        state.metrics = {
          ...state.metrics,
          ...payload.metrics,
        };
      }

      if (payload.activeSessions !== undefined) {
        state.realTimeData.activeSessions = payload.activeSessions;
      }

      if (payload.recentLogins) {
        state.realTimeData.recentLogins = payload.recentLogins;
      }

      if (payload.systemAlerts) {
        // Add new alerts to the beginning of the array, keep only last 5
        const newAlerts = Array.isArray(payload) ? payload : payload.systemAlerts || [];
        state.realTimeData.systemAlerts = [
          ...newAlerts,
          ...state.realTimeData.systemAlerts.slice(0, 5 - newAlerts.length)
        ];
      }

      state.lastUpdated = new Date().toISOString();
    },
    resetDashboard: (state) => {
      state.requests = {};
      state.metrics = null;
      state.activityData = null;
      state.clientDistribution = null;
      state.loading = false;
      state.error = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Metrics
      .addCase(fetchDashboardMetrics.pending, (state, action) => {
        state.requests.fetchDashboardMetrics = action.meta.requestId;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        if (state.requests.fetchDashboardMetrics !== action.meta.requestId) return;
        delete state.requests.fetchDashboardMetrics;
        state.loading = false;
        state.metrics = action.payload as DashboardMetrics;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        if (state.requests.fetchDashboardMetrics !== action.meta.requestId) return;
        delete state.requests.fetchDashboardMetrics;
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Activity Data
      .addCase(fetchActivityData.pending, (state, action) => {
        state.requests.fetchActivityData = action.meta.requestId;
        state.loading = true;
      })
      .addCase(fetchActivityData.fulfilled, (state, action) => {
        if (state.requests.fetchActivityData !== action.meta.requestId) return;
        delete state.requests.fetchActivityData;
        state.loading = false;
        state.activityData = action.payload;
      })
      .addCase(fetchActivityData.rejected, (state, action) => {
        if (state.requests.fetchActivityData !== action.meta.requestId) return;
        delete state.requests.fetchActivityData;
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Client Distribution
      .addCase(fetchClientDistribution.pending, (state, action) => {
        state.requests.fetchClientDistribution = action.meta.requestId;
        state.loading = true;
      })
      .addCase(fetchClientDistribution.fulfilled, (state, action) => {
        if (state.requests.fetchClientDistribution !== action.meta.requestId) return;
        delete state.requests.fetchClientDistribution;
        state.loading = false;
        state.clientDistribution = action.payload;
      })
      .addCase(fetchClientDistribution.rejected, (state, action) => {
        if (state.requests.fetchClientDistribution !== action.meta.requestId) return;
        delete state.requests.fetchClientDistribution;
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDashboardError, updateRealTimeData, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
