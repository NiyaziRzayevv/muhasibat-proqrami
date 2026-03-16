import { apiRequest } from './http';

function toQuery(params) {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const q = new URLSearchParams();
  for (const [k, v] of entries) q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function apiGetAuditLogs(token, filters) {
  const query = toQuery(filters || {});
  return apiRequest(`/audit${query}`, { token });
}

export function apiClearAuditLogs(token, daysOld = 90) {
  return apiRequest('/audit/clear', { method: 'POST', token, body: { daysOld } });
}
