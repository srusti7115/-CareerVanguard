
const API_URL = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('token');

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};

  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: form || (body && JSON.stringify(body))
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}
