import axios from 'axios';
import { getAccessToken, setAccessToken } from './session';

export const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const axiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: 15000, withCredentials: true });
let refreshPromise: Promise<string> | null = null;
export const refreshSession = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${apiBaseUrl}/auth/refresh`, {}, {
      withCredentials: true, timeout: 15000, headers: { 'X-Refresh-Request': 'true' },
    }).then(({ data }: { data: { accessToken: string } }) => {
      if (!data.accessToken) throw new Error('Session unavailable');
      setAccessToken(data.accessToken);
      return data.accessToken;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};
axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axiosInstance.interceptors.response.use((response) => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) return Promise.reject(error);
  const request = error.config;
  // Forbidden is an authorization decision, never a reason to refresh.
  if (error.response?.status !== 401 || !request || request.headers['X-Session-Retry'] || request.url?.startsWith('/auth/')) return Promise.reject(error);
  request.headers['X-Session-Retry'] = 'true';
  try {
    request.headers.Authorization = `Bearer ${await refreshSession()}`;
    return axiosInstance(request);
  } catch {
    setAccessToken(null);
    window.dispatchEvent(new Event('shield:session-expired'));
    return Promise.reject(error);
  }
});
export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) return 'Too many attempts. Please wait before trying again.';
    return typeof error.response?.data?.message === 'string' ? error.response.data.message :
      error.response?.status === 403 ? 'You do not have permission to perform this action.' :
      error.response?.status === 401 ? 'Your credentials or verification code could not be verified.' :
      'Unable to reach Shield. Please try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};
export default axiosInstance;
