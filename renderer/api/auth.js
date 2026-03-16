import { apiRequest } from './http';

export function apiLogin(username, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { username, password } });
}

export function apiVerify(token) {
  return apiRequest('/auth/verify', { method: 'POST', body: { token } });
}

export function apiLogout(token) {
  return apiRequest('/auth/logout', { method: 'POST', body: { token } });
}

export function apiRegister(data) {
  return apiRequest('/auth/register', { method: 'POST', body: data });
}

export function apiRequestPasswordReset(username, phone, email) {
  return apiRequest('/auth/requestPasswordReset', {
    method: 'POST',
    body: { username, phone, email },
  });
}

export function apiResetPassword(token, newPassword) {
  return apiRequest('/auth/resetPassword', {
    method: 'POST',
    body: { token, newPassword },
  });
}
