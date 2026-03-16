import { apiRequest } from './http';

export function apiMe(token) {
  return apiRequest('/users/me', { token });
}

export function apiMyAccess(token) {
  return apiRequest('/users/me/access', { token });
}

export function apiGetUsers(token) {
  return apiRequest('/users', { token });
}

export function apiCreateUser(token, data) {
  return apiRequest('/users', { method: 'POST', token, body: data });
}

export function apiUpdateUser(token, id, data) {
  return apiRequest(`/users/${id}`, { method: 'PUT', token, body: data });
}

export function apiDeleteUser(token, id) {
  return apiRequest(`/users/${id}`, { method: 'DELETE', token });
}

export function apiGetPendingUsers(token) {
  return apiRequest('/users/pending', { token });
}

export function apiApproveUser(token, id) {
  return apiRequest(`/users/${id}/approve`, { method: 'POST', token });
}

export function apiRejectUser(token, id) {
  return apiRequest(`/users/${id}/reject`, { method: 'POST', token });
}

export function apiGrantAccess(token, id, accessType, customDuration) {
  return apiRequest(`/users/${id}/grant-access`, {
    method: 'POST',
    token,
    body: { accessType, customDuration: customDuration || undefined },
  });
}

export function apiRevokeAccess(token, id) {
  return apiRequest(`/users/${id}/revoke-access`, { method: 'POST', token });
}

export function apiCheckAccess(token, id) {
  return apiRequest(`/users/${id}/access`, { token });
}
