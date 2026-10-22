import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { healthApi } from '../../api/healthApi';
import type { SystemMetrics, SystemStatusData } from '../../api/healthApi';
import { errorMessage } from '../../api/axiosConfig';
import { showError } from '../notification/notificationSlice';

export const fetchHealthMetrics = createAsyncThunk<SystemMetrics, void, { rejectValue: string }>(
  'health/fetchHealthMetrics', async (_, { dispatch, rejectWithValue }) => {
    try { return (await healthApi.getSystemMetrics()).data; }
    catch (error) { const message = errorMessage(error); dispatch(showError(message)); return rejectWithValue(message); }
  }
);

export const fetchSystemStatus = createAsyncThunk<SystemStatusData, void, { rejectValue: string }>(
  'health/fetchSystemStatus', async (_, { dispatch, rejectWithValue }) => {
    try { return (await healthApi.getStatus()).data; }
    catch (error) { const message = errorMessage(error); dispatch(showError(message)); return rejectWithValue(message); }
  }
);

interface HealthState {
  metrics: SystemMetrics | null;
  systemStatus: SystemStatusData | null;
  loading: boolean;
  loadingMetrics: boolean;
  loadingSystem: boolean;
  error: string | null;
}
const initialState: HealthState = { metrics: null, systemStatus: null, loading: false, loadingMetrics: false, loadingSystem: false, error: null };
const healthSlice = createSlice({
  name: 'health', initialState,
  reducers: { clearHealthError: state => { state.error = null; }, resetHealth: () => initialState },
  extraReducers: builder => {
    builder
      .addCase(fetchHealthMetrics.pending, state => { state.loadingMetrics = true; state.error = null; })
      .addCase(fetchHealthMetrics.fulfilled, (state, action) => { state.loadingMetrics = false; state.metrics = action.payload; })
      .addCase(fetchHealthMetrics.rejected, (state, action) => { state.loadingMetrics = false; state.metrics = null; state.error = action.payload ?? 'Metrics unavailable'; })
      .addCase(fetchSystemStatus.pending, state => { state.loadingSystem = true; state.error = null; })
      .addCase(fetchSystemStatus.fulfilled, (state, action) => { state.loadingSystem = false; state.systemStatus = action.payload; })
      .addCase(fetchSystemStatus.rejected, (state, action) => { state.loadingSystem = false; state.systemStatus = null; state.error = action.payload ?? 'Status unavailable'; });
  },
});

export const { clearHealthError, resetHealth } = healthSlice.actions;
export default healthSlice.reducer;
