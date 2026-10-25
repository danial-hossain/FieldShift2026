// frontend/src/apiClient.js
// Centralized, resilient HTTP API client for FieldShift FastAPI backend

export function formatApiBase(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned) && cleaned.includes('.')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export const API_BASE = formatApiBase(import.meta.env?.VITE_API_URL || '');

export async function request(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
  let response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error(`Could not reach the FastAPI backend at ${API_BASE || 'localhost:8000'} (${err.message}). Verify backend service is active.`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Backend returned a non-JSON response (HTTP ${response.status}). Verify FastAPI endpoint.`);
  }

  if (!response.ok) {
    const detail = Array.isArray(body?.detail)
      ? body.detail.map(item => item.msg || item.loc?.join('.') || 'Invalid request').join('; ')
      : body?.detail;
    throw new Error(detail || body?.message || `Request failed (${response.status})`);
  }

  return body;
}

export default request;
