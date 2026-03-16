import { apiRequest } from './http';

export function apiGetRoles(token) {
  return apiRequest('/roles', { token });
}

export function apiUpdateRolePermissions(token, id, permissions) {
  return apiRequest(`/roles/${id}/permissions`, {
    method: 'PUT',
    token,
    body: { permissions },
  });
}
