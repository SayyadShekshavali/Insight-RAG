import store from '../store/index.js';
import { updateAccessToken, logoutUser } from '../store/authSlice.js';

export const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? (import.meta.env.VITE_API_BASE_URL.endsWith('/api')
      ? import.meta.env.VITE_API_BASE_URL
      : `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`)
  : '/api';

// Queue to hold requests that are waiting for the refresh token
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// Generic fetch wrapper
const request = async (url, options = {}) => {
  // 1. Setup headers
  const state = store.getState();
  const token = state.auth.accessToken;
  
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. Perform request
  let response = await fetch(`${API_BASE}${url}`, options);

  // 3. Handle token expiry (401 with TokenExpired code)
  if (response.status === 401) {
    let responseData;
    try {
      // Clone response to avoid consuming body stream
      const clone = response.clone();
      responseData = await clone.json();
    } catch (e) {
      responseData = {};
    }

    if (responseData.error === 'TokenExpired') {
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const refreshToken = state.auth.refreshToken;
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            
            // Dispatch to Redux store
            store.dispatch(updateAccessToken({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken
            }));

            isRefreshing = false;
            onRefreshed(data.accessToken);
          } else {
            // Refresh token is invalid/expired
            isRefreshing = false;
            store.dispatch(logoutUser());
            window.location.href = '/login';
            throw new Error('Session expired');
          }
        } catch (refreshErr) {
          isRefreshing = false;
          store.dispatch(logoutUser());
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }

      // Return a promise that resolves with the retried request once the token is refreshed
      const retryRequest = new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          options.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(fetch(`${API_BASE}${url}`, options));
        });
      });

      response = await retryRequest;
    }
  }

  return response;
};

// HTTP verb helpers
export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options) => request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
};

export default api;
