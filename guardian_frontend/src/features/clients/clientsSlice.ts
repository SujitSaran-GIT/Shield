// src/features/clients/clientsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Client } from '../../types';
import { errorMessage } from '../../api/axiosConfig';
export interface ClientFilters { status: string; sortBy: string; sortDir: string; startDate: string; endDate: string }
export interface ClientInput { name: string; description: string; allowedOrigins: string[]; idleTimeout: number; email?: string }
export interface ClientCredentials { clientId: string; clientKey: string }
interface ClientsState { requests: Partial<Record<string, string>>; clients: Client[]; selectedClient: Client | null; loading: boolean; loadingDetails: boolean; error: string | null; registering: boolean; updating: boolean; filters: ClientFilters; pagination: { currentPage: number; pageSize: number; totalElements: number; totalPages: number } }
import { clientApi } from '../../api';
import { showError, showSuccess } from '../notification/notificationSlice';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (params: Record<string, unknown> = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await clientApi.getAllClients(params);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load clients'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchClientDetails = createAsyncThunk(
  'clients/fetchClientDetails',
  async (id: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await clientApi.getClientById(id);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load client details'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const registerClient = createAsyncThunk(
  'clients/registerClient',
  async (data: ClientInput, { dispatch, rejectWithValue }) => {
    try {
      const response = await clientApi.registerClient(data);
      dispatch(showSuccess('Client registered successfully'));
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to register client'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, data }: { id: string; data: ClientInput }, { dispatch, rejectWithValue }) => {
    try {
      const response = await clientApi.updateClient(id, data);
      dispatch(showSuccess('Client updated successfully'));
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to update client'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const deactivateClient = createAsyncThunk(
  'clients/deactivateClient',
  async (id: string, { dispatch, rejectWithValue }) => {
    try {
      await clientApi.deactivateClient(id);
      dispatch(showSuccess('Client deactivated successfully'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to deactivate client'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const activateClient = createAsyncThunk(
  'clients/activateClient',
  async (id: string, { dispatch, rejectWithValue }) => {
    try {
      await clientApi.activateClient(id);
      dispatch(showSuccess('Client activated successfully'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to activate client'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    requests: {},
    clients: [],
    selectedClient: null,
    loading: false,
    loadingDetails: false,
    error: null,
    registering: false,
    updating: false,
    filters: {
      status: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
      startDate: '',
      endDate: '',
    },
    pagination: {
      currentPage: 0,
      pageSize: 20,
      totalElements: 0,
      totalPages: 0,
    },
  } as ClientsState,
  reducers: {
    clearClientsError: (state) => {
      state.error = null;
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    },
    resetClients: (state) => {
      state.requests = {};
      state.clients = [];
      state.selectedClient = null;
      state.loading = false;
      state.error = null;
    },
    setFilters: (state, action) => {
      const { page, pageSize, ...filters } = action.payload;
      state.filters = { ...state.filters, ...filters };
      if (page !== undefined) state.pagination.currentPage = page;
      if (pageSize !== undefined) state.pagination.pageSize = pageSize;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Clients
      .addCase(fetchClients.pending, (state, action) => {
        state.requests.fetchClients = action.meta.requestId;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        if (state.requests.fetchClients !== action.meta.requestId) return;
        delete state.requests.fetchClients;
        state.loading = false;
        state.clients = action.payload.content;
        state.pagination = {
          currentPage: action.payload.number,
          totalPages: action.payload.totalPages,
          totalElements: action.payload.totalElements,
          pageSize: action.payload.size,
        };
      })
      .addCase(fetchClients.rejected, (state, action) => {
        if (state.requests.fetchClients !== action.meta.requestId) return;
        delete state.requests.fetchClients;
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Request failed';
      })
      
      // Fetch Client Details
      .addCase(fetchClientDetails.pending, (state, action) => {
        state.requests.fetchClientDetails = action.meta.requestId;
        state.loadingDetails = true;
      })
      .addCase(fetchClientDetails.fulfilled, (state, action) => {
        if (state.requests.fetchClientDetails !== action.meta.requestId) return;
        delete state.requests.fetchClientDetails;
        state.loadingDetails = false;
        state.selectedClient = action.payload;
      })
      .addCase(fetchClientDetails.rejected, (state, action) => {
        if (state.requests.fetchClientDetails !== action.meta.requestId) return;
        delete state.requests.fetchClientDetails;
        state.loadingDetails = false;
      })
      
      // Register Client
      .addCase(registerClient.pending, (state, action) => {
        state.requests.registerClient = action.meta.requestId;
        state.registering = true;
      })
      .addCase(registerClient.fulfilled, (state, action) => {
        if (state.requests.registerClient !== action.meta.requestId) return;
        delete state.requests.registerClient;
        state.registering = false;
        state.error = null;
      })
      .addCase(registerClient.rejected, (state, action) => {
        if (state.requests.registerClient !== action.meta.requestId) return;
        delete state.requests.registerClient;
        state.registering = false;
      })
      
      // Update Client
      .addCase(updateClient.pending, (state, action) => {
        state.requests.updateClient = action.meta.requestId;
        state.updating = true;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        if (state.requests.updateClient !== action.meta.requestId) return;
        delete state.requests.updateClient;
        state.updating = false;
        const index = state.clients.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
        if (state.selectedClient?.id === action.payload.id) {
          state.selectedClient = action.payload;
        }
      })
      .addCase(updateClient.rejected, (state, action) => {
        if (state.requests.updateClient !== action.meta.requestId) return;
        delete state.requests.updateClient;
        state.updating = false;
      })
      
      // Deactivate Client
      .addCase(deactivateClient.pending, (state, action) => { state.requests.deactivateClient = action.meta.requestId; })
      .addCase(deactivateClient.fulfilled, (state, action) => {
        if (state.requests.deactivateClient !== action.meta.requestId) return;
        delete state.requests.deactivateClient;
        const client = state.clients.find(c => c.id === action.payload);
        if (client) {
          client.status = 'INACTIVE';
        }
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient.status = 'INACTIVE';
        }
      })
      
      // Activate Client
      .addCase(activateClient.pending, (state, action) => { state.requests.activateClient = action.meta.requestId; })
      .addCase(activateClient.fulfilled, (state, action) => {
        if (state.requests.activateClient !== action.meta.requestId) return;
        delete state.requests.activateClient;
        const client = state.clients.find(c => c.id === action.payload);
        if (client) {
          client.status = 'ACTIVE';
        }
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient.status = 'ACTIVE';
        }
      });
  },
});

export const { clearClientsError, clearSelectedClient, resetClients, setFilters } = clientsSlice.actions;
export default clientsSlice.reducer;
