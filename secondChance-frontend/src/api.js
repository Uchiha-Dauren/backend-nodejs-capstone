import { urlConfig } from './config';
export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = sessionStorage.getItem('auth-token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${urlConfig.backendUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'The request could not be completed. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export function saveSession(data) {
  sessionStorage.setItem('auth-token', data.authtoken);
  sessionStorage.setItem('name', data.userName || data.user?.name || data.user?.firstName || '');
  sessionStorage.setItem('email', data.userEmail || data.email || data.user?.email || '');
}
