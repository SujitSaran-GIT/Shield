import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosInstance, { errorMessage, refreshSession } from '../../api/axiosConfig';
import { clearLegacyCredentials, setAccessToken } from '../../api/session';
import type { User } from '../../types';

interface AuthState { user: User | null; isAuthenticated: boolean; loading: boolean; initialized: boolean; error: string | null }
const normalizeUser = (user: User): User => ({ ...user, role: user.role === 'GUARDIAN_ADMIN' ? 'SUPER_ADMIN' : user.role });
const initialState: AuthState = { user: null, isAuthenticated: false, loading: false, initialized: false, error: null };
export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue }) => {
  clearLegacyCredentials();
  try {
    await refreshSession();
    return (await axiosInstance.get<User>('/auth/me')).data;
  } catch { setAccessToken(null); return rejectWithValue(null); }
}, { condition: (_, { getState }) => !(getState() as { auth: AuthState }).auth.loading });
export const loginAdmin = createAsyncThunk('auth/loginAdmin', async (credentials: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post<{ accessToken: string }>('/auth/login/admin', credentials, { headers: { 'X-Refresh-Request': 'true' } });
    setAccessToken(data.accessToken);
    return (await axiosInstance.get<User>('/auth/me')).data;
  } catch (error) { setAccessToken(null); return rejectWithValue(errorMessage(error)); }
});
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try { await axiosInstance.post('/auth/logout'); }
  catch (error) { return rejectWithValue(errorMessage(error)); }
  finally { setAccessToken(null); clearLegacyCredentials(); }
});
const authSlice = createSlice({ name: 'auth', initialState, reducers: {
  clearError: (state) => { state.error = null; },
  sessionExpired: () => ({ ...initialState, initialized: true }),
  setUser: (state, action: PayloadAction<User>) => { state.user = normalizeUser(action.payload); },
}, extraReducers: (builder) => {
  builder.addCase(restoreSession.pending, (state) => { state.loading = true; })
    .addCase(restoreSession.fulfilled, (state, action) => { state.user = normalizeUser(action.payload); state.isAuthenticated = true; state.loading = false; state.initialized = true; })
    .addCase(restoreSession.rejected, (state) => { state.loading = false; state.initialized = true; })
    .addCase(loginAdmin.pending, (state) => { state.loading = true; state.error = null; })
    .addCase(loginAdmin.fulfilled, (state, action) => { state.loading = false; state.user = normalizeUser(action.payload); state.isAuthenticated = true; state.initialized = true; })
    .addCase(loginAdmin.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
    .addCase(logout.fulfilled, () => ({ ...initialState, initialized: true }))
    .addCase(logout.rejected, (_, action) => ({ ...initialState, initialized: true, error: `Signed out on this device. Server logout failed: ${action.payload as string}` }));
} });
export const { clearError, sessionExpired, setUser } = authSlice.actions;
export default authSlice.reducer;
