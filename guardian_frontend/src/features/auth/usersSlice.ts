// src/features/users/usersSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '../../types';
import { errorMessage } from '../../api/axiosConfig';
interface UsersState { users: User[]; loading: boolean; error: string | null; pagination: { currentPage: number; totalPages: number; totalElements: number } }
import { userApi } from '../../api/userApi';

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await userApi.getAllUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const searchUsers = createAsyncThunk(
  'users/searchUsers',
  async ({ query, ...params }: { query: string; [key: string]: unknown }, { rejectWithValue }) => {
    try {
      const response = await userApi.searchUsers(query, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'users/updateStatus',
  async ({ userId, action }: { userId: string; action: 'block' | 'unblock' }, { rejectWithValue }) => {
    try {
      const apiCall = action === 'block' ? userApi.blockUser : userApi.unblockUser;
      await apiCall(userId);
      return { userId, action };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    loading: false,
    error: null,
    pagination: {
      currentPage: 0,
      totalPages: 0,
      totalElements: 0,
    },
  } as UsersState,
  reducers: {
    clearUsersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.content;
        state.pagination = {
          currentPage: action.payload.number,
          totalPages: action.payload.totalPages,
          totalElements: action.payload.totalElements,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Request failed';
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const { userId, action: statusAction } = action.payload;
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.status = statusAction === 'block' ? 'BLOCKED' : 'ACTIVE';
        }
      });
  },
});

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;