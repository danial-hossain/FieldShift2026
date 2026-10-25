// frontend/src/apiClient.js
// Centralized, resilient HTTP API client for FieldShift FastAPI backend

export const API_BASE = import.meta.env?.VITE_API_URL || '';

export async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
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
