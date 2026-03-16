export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  let base = '';
  try { base = localStorage.getItem('api_base_url') || ''; } catch {}
  if (!base) base = import.meta.env.VITE_API_URL;
  if (!base) {
    try {
      if (typeof window !== 'undefined' && window.location?.hostname) {
        base = `${window.location.protocol}//${window.location.hostname}:3001`;
      }
    } catch {}
  }
  if (!base) throw new Error('API base URL is not set');

  if (base.endsWith('/')) base = base.slice(0, -1);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}
