// Access tokens stay in memory. The server owns the HttpOnly refresh cookie.
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const clearLegacyCredentials = () => {
  for (const key of ['accessToken', 'refreshToken', 'user', 'clientKey', 'clientId']) localStorage.removeItem(key);
};
