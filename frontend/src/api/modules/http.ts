import axios from 'axios';

const resolvedApiBaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
    ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, '')
    : '/api/v1';

export function decodeBase64UrlUtf8(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  return decodeURIComponent(
    Array.from(binary, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
}

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      window.sessionStorage?.getItem('smartward_officer_token') ||
      window.localStorage?.getItem('smartward_officer_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url || '');
    const isAuthEndpoint =
      url.includes('/auth/officer/login') || url.includes('/auth/officer/change-pin');
    if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('smartward_officer_token');
      window.sessionStorage?.removeItem('smartward_inactivity_expires_at');
      window.localStorage?.removeItem('smartward_officer_token');
      window.localStorage?.removeItem('smartward_officer_badge');
      window.localStorage?.removeItem('smartward_officer_profile');
      window.localStorage?.removeItem('smartward_user_role');
      window.localStorage?.removeItem('smartward_role');
      window.localStorage?.removeItem('smartward_session_expires_at');
      window.dispatchEvent(new Event('smartward_auth_logout'));
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
