import {
  apiLogin,
  apiLogout,
  apiRegister,
  apiRequestPasswordReset,
  apiResetPassword,
  apiVerify,
} from './auth';
import {
  apiApproveUser,
  apiCheckAccess,
  apiGetPendingUsers,
  apiGetUsers,
  apiGrantAccess,
  apiMyAccess,
  apiRejectUser,
  apiRevokeAccess,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
} from './users';
import { apiGetRoles, apiUpdateRolePermissions } from './roles';
import { apiClearAuditLogs, apiGetAuditLogs } from './audit';
import {
  apiGetTodayStats,
  apiGetMonthStats,
  apiGetAllTimeStats,
  apiGetTopServices,
  apiGetTopBrands,
  apiGetMonthlyChart,
  apiGetCustomerCount,
  apiGetLowStockProducts,
  apiGetStockValue,
  apiGetTopSellingProducts,
  apiGetMonthlySalesChart,
  apiGetSalesStats,
  apiGetMonthlyRevenue,
  apiGetYearlyRevenue,
  apiGetDebtStats,
  apiGetProductStats,
  apiGetExpenseStats,
  apiGetUnreadCount,
  apiGetLicenseStatus,
  apiGetRecords,
  apiGetCustomers,
} from './stats';

function resolveBaseUrl() {
  try {
    const v = localStorage.getItem('api_base_url') || '';
    if (v) return v;
  } catch {}
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  try {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
  } catch {}
  return '';
}

function hasRemote() {
  try {
    const localEnabled = localStorage.getItem('use_remote');
    const enabled = localEnabled === 'true' || import.meta.env.VITE_USE_REMOTE === 'true';
    const base = resolveBaseUrl();
    if (enabled && !!base) return true;
    // Auto-detect: if window.api is not available (browser, not Electron), use remote if URL exists
    if (!window.api && !!base) return true;
    return false;
  } catch {
    return false;
  }
}

function getRemoteConfig() {
  try {
    const explicitEnabled = (localStorage.getItem('use_remote') === 'true') || (import.meta.env.VITE_USE_REMOTE === 'true');
    const baseUrl = resolveBaseUrl();
    const enabled = explicitEnabled || (!window.api && !!baseUrl);
    return { enabled, baseUrl };
  } catch {
    return { enabled: false, baseUrl: '' };
  }
}

function setRemoteConfig({ enabled, baseUrl }) {
  try {
    localStorage.setItem('use_remote', enabled ? 'true' : 'false');
    if (baseUrl !== undefined) localStorage.setItem('api_base_url', String(baseUrl || ''));
  } catch {
  }
}

function getToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

async function safeCall(fn) {
  try {
    return await fn();
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export const apiBridge = {
  getRemoteConfig,
  setRemoteConfig,

  login: (username, password) => safeCall(async () => {
    if (hasRemote()) return await apiLogin(username, password);
    return await window.api.login(username, password);
  }),

  verifyToken: (token) => safeCall(async () => {
    if (hasRemote()) return await apiVerify(token);
    return await window.api.verifyToken(token);
  }),

  logout: (token) => safeCall(async () => {
    if (hasRemote()) return await apiLogout(token);
    return await window.api.logout(token);
  }),

  register: (data) => safeCall(async () => {
    if (hasRemote()) return await apiRegister(data);
    return await window.api.register(data);
  }),

  requestPasswordReset: (username, phone, email) => safeCall(async () => {
    if (hasRemote()) return await apiRequestPasswordReset(username, phone, email);
    return await window.api.requestPasswordReset(username, phone, email);
  }),

  resetPassword: (token, newPassword) => safeCall(async () => {
    if (hasRemote()) return await apiResetPassword(token, newPassword);
    return await window.api.resetPassword(token, newPassword);
  }),

  checkUserAccess: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiMyAccess(token);
    }
    return await window.api.checkUserAccess(userId);
  }),

  getUsers: () => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetUsers(token);
    }
    return await window.api.getUsers();
  }),

  createUser: (data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiCreateUser(token, data);
    }
    return await window.api.createUser(data);
  }),

  updateUser: (id, data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiUpdateUser(token, id, data);
    }
    return await window.api.updateUser(id, data);
  }),

  deleteUser: (id) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiDeleteUser(token, id);
    }
    return await window.api.deleteUser(id);
  }),

  getRoles: () => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetRoles(token);
    }
    return await window.api.getRoles();
  }),

  updateRolePermissions: (id, permissions) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiUpdateRolePermissions(token, id, permissions);
    }
    return await window.api.updateRolePermissions(id, permissions);
  }),

  getPendingUsers: () => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetPendingUsers(token);
    }
    return await window.api.getPendingUsers();
  }),

  approveUser: (userId, approvedById) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiApproveUser(token, userId);
    }
    return await window.api.approveUser(userId, approvedById);
  }),

  rejectUser: (userId, approvedById) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiRejectUser(token, userId);
    }
    return await window.api.rejectUser(userId, approvedById);
  }),

  grantAccess: (userId, accessType, grantedById, customDuration) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGrantAccess(token, userId, accessType, customDuration);
    }
    return await window.api.grantAccess(userId, accessType, grantedById, customDuration);
  }),

  revokeAccess: (userId, adminId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiRevokeAccess(token, userId);
    }
    return await window.api.revokeAccess(userId, adminId);
  }),

  checkAccessAdmin: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiCheckAccess(token, userId);
    }
    return await window.api.checkUserAccess(userId);
  }),

  getAuditLogs: (filters) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetAuditLogs(token, filters || {});
    }
    return await window.api.getAuditLogs(filters || {});
  }),

  clearAuditLogs: (daysOld) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiClearAuditLogs(token, daysOld);
    }
    return await window.api.clearAuditLogs(daysOld);
  }),

  getTodayStats: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetTodayStats(token, userId);
    }
    return await window.api.getTodayStats(userId);
  }),

  getMonthStats: (year, month, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetMonthStats(token, year, month, userId);
    }
    return await window.api.getMonthStats(year, month, userId);
  }),

  getAllTimeStats: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetAllTimeStats(token, userId);
    }
    return await window.api.getAllTimeStats(userId);
  }),

  getTopServices: (limit, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetTopServices(token, limit, userId);
    }
    return await window.api.getTopServices(limit, userId);
  }),

  getTopBrands: (limit, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetTopBrands(token, limit, userId);
    }
    return await window.api.getTopBrands(limit, userId);
  }),

  getMonthlyChart: (year, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetMonthlyChart(token, year, userId);
    }
    return await window.api.getMonthlyChart(year, userId);
  }),

  getRecords: (filters) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetRecords(token, filters);
    }
    return await window.api.getRecords(filters);
  }),

  getCustomers: (search, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetCustomers(token, search, userId);
    }
    return await window.api.getCustomers(search, userId);
  }),

  getLowStockProducts: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetLowStockProducts(token, userId);
    }
    return await window.api.getLowStockProducts(userId);
  }),

  getStockValue: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetStockValue(token, userId);
    }
    return await window.api.getStockValue(userId);
  }),

  getTopSellingProducts: (limit, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetTopSellingProducts(token, limit, userId);
    }
    return await window.api.getTopSellingProducts(limit, userId);
  }),

  getMonthlySalesChart: (year, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetMonthlySalesChart(token, year, userId);
    }
    return await window.api.getMonthlySalesChart(year, userId);
  }),

  getSalesStats: (startDate, endDate, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetSalesStats(token, startDate, endDate, userId);
    }
    return await window.api.getSalesStats(startDate, endDate, userId);
  }),

  getMonthlyRevenue: (year, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetMonthlyRevenue(token, year, userId);
    }
    return await window.api.getMonthlyRevenue(year, userId);
  }),

  getYearlyRevenue: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetYearlyRevenue(token, userId);
    }
    return await window.api.getYearlyRevenue(userId);
  }),

  getDebtStats: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetDebtStats(token, userId);
    }
    return await window.api.getDebtStats(userId);
  }),

  getProductStats: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetProductStats(token, userId);
    }
    return await window.api.getProductStats(userId);
  }),

  getExpenseStats: (startDate, endDate, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetExpenseStats(token, startDate, endDate, userId);
    }
    return await window.api.getExpenseStats(startDate, endDate, userId);
  }),

  getLicenseStatus: () => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetLicenseStatus(token);
    }
    return await window.api.getLicenseStatus();
  }),

  getUnreadCount: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      if (!token) return { success: false, error: 'unauthorized' };
      return await apiGetUnreadCount(token, userId);
    }
    return await window.api.getUnreadCount(userId);
  }),
};
