// src/features/users/usersSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../api';
import type { User } from '../../types';
import { errorMessage } from '../../api/axiosConfig';
import { showError, showSuccess } from '../notification/notificationSlice';


export interface UserFiltersState { search: string; status: string; role: string; clientName: string; sortBy: string; sortDir: string }
export interface UserParams { page?: number; size?: number; sortBy?: string; sortDir?: string; query?: string; status?: string; role?: string; clientName?: string }
export interface UserSession { id: string; active: boolean; ipAddress?: string; location?: string; userAgent?: string; createdAt: string; expiresAt: string }
interface UserPage { content: User[]; number: number; totalPages: number; totalElements: number; size: number }
interface UsersState {
 users: User[]; selectedUser: User | null; userSessions: UserSession[]; loading: boolean; loadingDetails: boolean; loadingSessions: boolean;
 error: string | null; pagination: { currentPage: number; totalPages: number; totalElements: number; pageSize: number };
 filters: UserFiltersState; selectedRows: string[]; requestId?: string;
}

export const fetchUsers = createAsyncThunk<UserPage, UserParams | undefined, { rejectValue: string }>(
  'users/fetchUsers',
  async (params, { dispatch, rejectWithValue, signal }) => {
    try {
      const response = await userApi.getAllUsers(params, signal);
      return response.data;
    } catch (error) {
      if (!signal.aborted) dispatch(showError('Failed to load users'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const searchUsers = createAsyncThunk<UserPage, UserParams & { query: string }, { rejectValue: string }>(
  'users/searchUsers',
  async ({ query, ...params }, { dispatch, rejectWithValue }) => {
    try {
      const response = await userApi.searchUsers(query, params);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to search users'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchUserDetails = createAsyncThunk<User, string, { rejectValue: string }>(
  'users/fetchUserDetails',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await userApi.getUserById(id);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load user details'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchUserSessions = createAsyncThunk<UserSession[], string, { rejectValue: string }>(
  'users/fetchUserSessions',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await userApi.getUserSessions(id);
      return response.data;
    } catch (error) {
      dispatch(showError('Failed to load user sessions'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const blockUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'users/blockUser',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await userApi.blockUser(id);
      dispatch(showSuccess('User blocked successfully'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to block user'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const unblockUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'users/unblockUser',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await userApi.unblockUser(id);
      dispatch(showSuccess('User unblocked successfully'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to unblock user'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const deleteUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'users/deleteUser',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await userApi.deleteUser(id);
      dispatch(showSuccess('User deleted successfully'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to delete user'));
      return rejectWithValue(errorMessage(error));
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    selectedUser: null,
    userSessions: [],
    loading: false,
    loadingDetails: false,
    loadingSessions: false,
    error: null,
    pagination: {
      currentPage: 0,
      totalPages: 0,
      totalElements: 0,
      pageSize: 20,
    },
    filters: {
      search: '',
      status: '',
      role: '',
      clientName: '',
      sortBy: 'createdAt',
      sortDir: 'DESC',
    },
    selectedRows: [],
  } as UsersState,
  reducers: {
    administratorRefreshed: (state, action: { payload: User }) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index >= 0) state.users[index] = { ...state.users[index], ...action.payload };
      if (state.selectedUser?.id === action.payload.id) state.selectedUser = action.payload;
    },
    clearUsersError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      const {page,pageSize,...filters}=action.payload;
      state.filters = { ...state.filters, ...filters };
      if(typeof page==='number') state.pagination.currentPage=page;
      if(typeof pageSize==='number') state.pagination.pageSize=pageSize;
      state.selectedRows=[];
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        status: '',
        role: '',
        clientName: '',
        sortBy: 'createdAt',
        sortDir: 'DESC',
      };
    },
    setSelectedRows: (state, action) => {
      state.selectedRows = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
      state.userSessions = [];
    },
    resetUsers: (state) => {
      state.users = [];
      state.selectedUser = null;
      state.userSessions = [];
      state.loading = false;
      state.error = null;
      state.selectedRows = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state, action) => {
        state.requestId=action.meta.requestId; state.users=[]; state.selectedRows=[];
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        if(state.requestId!==action.meta.requestId) return;
        state.loading = false;
        state.users = action.payload.content;
        state.pagination = {
          currentPage: action.payload.number,
          totalPages: action.payload.totalPages,
          totalElements: action.payload.totalElements,
          pageSize: action.payload.size,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        if(state.requestId!==action.meta.requestId) return;
        state.loading = false;
        state.error = action.payload || 'Unable to load users';
      })
      
      // Search Users
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.content;
        state.pagination = {
          currentPage: action.payload.number,
          totalPages: action.payload.totalPages,
          totalElements: action.payload.totalElements,
          pageSize: action.payload.size,
        };
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to load users';
      })
      
      // Fetch User Details
      .addCase(fetchUserDetails.pending, (state) => {
        state.loadingDetails = true;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.loadingDetails = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserDetails.rejected, (state) => {
        state.loadingDetails = false;
      })
      
      // Fetch User Sessions
      .addCase(fetchUserSessions.pending, (state) => {
        state.loadingSessions = true;
      })
      .addCase(fetchUserSessions.fulfilled, (state, action) => {
        state.loadingSessions = false;
        state.userSessions = action.payload;
      })
      .addCase(fetchUserSessions.rejected, (state) => {
        state.loadingSessions = false;
      })
      
      // Block User
      .addCase(blockUser.fulfilled, (state, action) => {
        const user = state.users.find(u => u.id === action.payload);
        if (user) {
          user.status = 'BLOCKED';
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser.status = 'BLOCKED';
        }
      })
      
      // Unblock User
      .addCase(unblockUser.fulfilled, (state, action) => {
        const user = state.users.find(u => u.id === action.payload);
        if (user) {
          user.status = 'ACTIVE';
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser.status = 'ACTIVE';
        }
      })
      
      // Delete User
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload);
        state.selectedRows = state.selectedRows.filter(id => id !== action.payload);
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
          state.userSessions = [];
        }
      });
  },
});

export const {
  administratorRefreshed,
  clearUsersError,
  setFilters,
  clearFilters,
  setSelectedRows,
  clearSelectedUser,
  resetUsers,
} = usersSlice.actions;

export default usersSlice.reducer;
