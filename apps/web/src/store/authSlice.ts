import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '@/lib/api';
import type { User } from '@/types/api';

type AuthState = {
  user: User | null;
  loading: boolean;
};

const initialState: AuthState = { user: null, loading: true };

// Ask the backend who is logged in (the cookie decides)
export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const res = await api.get<{ data: User }>('/auth/me');
  return res.data.data;
});

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (input, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: User }>('/auth/login', input);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const register = createAsyncThunk<User, { name: string; email: string; password: string }, { rejectValue: string }>(
  'auth/register',
  async (input, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: User }>('/auth/register', input);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null; // not logged in
        state.loading = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;