import axios from 'axios';

const resolvedApiBaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
    ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, '')
    : '/api/v1';

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('smartward_officer_token') : null;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// P3: Auto logout on 401 Unauthorized only if token is expired (7.7)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url || '');
    const isAuthEndpoint = url.includes('/auth/officer/login') || url.includes('/auth/officer/change-pin');
    if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      const token = localStorage.getItem('smartward_officer_token');
      // If token is resilient local fallback token, do not terminate local officer session on remote 401
      if (token && !token.includes('sig_offline_verified')) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            // Only force logout if the token is genuinely expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              localStorage.removeItem('smartward_officer_token');
              localStorage.removeItem('smartward_officer_badge');
              localStorage.removeItem('smartward_officer_profile');
              localStorage.removeItem('smartward_user_role');
              localStorage.removeItem('smartward_role');
              localStorage.removeItem('smartward_session_expires_at');
              window.dispatchEvent(new Event('smartward_auth_logout'));
            }
          }
        } catch {
          // Token format error; do not aggressively eject
        }
      }
    }
    return Promise.reject(error);
  }
);


export { api };
export default api;
