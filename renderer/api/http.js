const SERVER_URL = 'https://muhasibat-proqrami-production.up.railway.app';

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  let base = SERVER_URL;

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
