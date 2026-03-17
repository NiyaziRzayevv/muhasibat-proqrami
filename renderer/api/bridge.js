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

let _originalWindowApi = null;

function _getToken() {
  try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
}

function _remoteCall(path, opts = {}) {
  const base = resolveBaseUrl();
  if (!base) return Promise.resolve({ success: false, error: 'No server URL' });
  const token = _getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const fetchOpts = { method: opts.method || 'GET', headers };
  if (opts.body !== undefined) fetchOpts.body = JSON.stringify(opts.body);
  let url = `${base}${path}`;
  if (opts.query) {
    const cleaned = {};
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== null && v !== undefined && v !== '') cleaned[k] = v;
    }
    const qs = new URLSearchParams(cleaned).toString();
    if (qs) url += `?${qs}`;
  }
  return fetch(url, fetchOpts).then(r => r.json()).catch(e => ({ success: false, error: e.message }));
}

function _buildRemoteProxy() {
  return {
    // Records
    getRecords: (filters) => _remoteCall('/records', { query: filters }),
    getRecord: (id) => _remoteCall(`/records/${id}`),
    createRecord: (data) => _remoteCall('/records', { method: 'POST', body: data }),
    updateRecord: (id, data) => _remoteCall(`/records/${id}`, { method: 'PUT', body: data }),
    deleteRecord: (id) => _remoteCall(`/records/${id}`, { method: 'DELETE' }),
    deleteMultipleRecords: (ids) => _remoteCall('/records/bulk-delete', { method: 'POST', body: { ids } }),

    // Smart input parsing
    parseInput: (text) => _remoteCall('/parse/input', { method: 'POST', body: { text } }),
    parseInventory: (text) => _remoteCall('/parse/inventory', { method: 'POST', body: { text } }),
    parseUniversal: (text) => _remoteCall('/parse/universal', { method: 'POST', body: { text } }),
    createFromParsed: (parsed, overrides) => _remoteCall('/records', { method: 'POST', body: { ...parsed, ...overrides } }),
    createSaleFromParsed: (parsed, overrides) => _remoteCall('/sales', { method: 'POST', body: { ...parsed, ...overrides } }),

    // Stats
    getTodayStats: (userId) => _remoteCall('/stats/today', { query: userId ? { userId } : {} }),
    getMonthStats: (year, month, userId) => _remoteCall(`/stats/month/${year}/${month}`, { query: userId ? { userId } : {} }),
    getAllTimeStats: (userId) => _remoteCall('/stats/all-time', { query: userId ? { userId } : {} }),
    getTopServices: (limit, userId) => _remoteCall('/stats/top-services', { query: { limit: limit || 5, ...(userId ? { userId } : {}) } }),
    getTopBrands: (limit, userId) => _remoteCall('/stats/top-brands', { query: { limit: limit || 5, ...(userId ? { userId } : {}) } }),
    getMonthlyChart: (year, userId) => _remoteCall(`/stats/monthly-chart/${year}`, { query: userId ? { userId } : {} }),
    getUnpaidRecords: (userId) => _remoteCall('/records/unpaid', { query: userId ? { userId } : {} }),
    getDebtStats: (userId) => _remoteCall('/stats/debt', { query: userId ? { userId } : {} }),
    getProductStats: (userId) => _remoteCall('/stats/products', { query: userId ? { userId } : {} }),
    getMonthlyRevenue: (year, userId) => _remoteCall(`/stats/monthly-revenue/${year}`, { query: userId ? { userId } : {} }),
    getYearlyRevenue: (userId) => _remoteCall('/stats/yearly-revenue', { query: userId ? { userId } : {} }),
    getCustomerCount: (userId) => _remoteCall('/stats/customers/count', { query: userId ? { userId } : {} }),

    // Customers
    getCustomers: (search, userId) => _remoteCall('/customers', { query: { ...(search ? { search } : {}), ...(userId ? { userId } : {}) } }),
    getCustomer: (id) => _remoteCall(`/customers/${id}`),
    createCustomer: (data) => _remoteCall('/customers', { method: 'POST', body: data }),
    updateCustomer: (id, data) => _remoteCall(`/customers/${id}`, { method: 'PUT', body: data }),
    deleteCustomer: (id) => _remoteCall(`/customers/${id}`, { method: 'DELETE' }),
    getCustomerRecords: (id) => _remoteCall(`/customers/${id}/records`),

    // Vehicles
    getVehicles: (search, userId) => _remoteCall('/vehicles', { query: { ...(search ? { search } : {}), ...(userId ? { userId } : {}) } }),
    getVehicle: (id) => _remoteCall(`/vehicles/${id}`),
    createVehicle: (data) => _remoteCall('/vehicles', { method: 'POST', body: data }),
    updateVehicle: (id, data) => _remoteCall(`/vehicles/${id}`, { method: 'PUT', body: data }),
    deleteVehicle: (id) => _remoteCall(`/vehicles/${id}`, { method: 'DELETE' }),

    // Prices
    getPrices: (search, userId) => _remoteCall('/records/prices', { query: { ...(search ? { search } : {}), ...(userId ? { userId } : {}) } }),
    createPrice: (data) => _remoteCall('/records/prices', { method: 'POST', body: data }),
    updatePrice: (id, data) => _remoteCall(`/records/prices/${id}`, { method: 'PUT', body: data }),
    deletePrice: (id) => _remoteCall(`/records/prices/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => _remoteCall('/settings'),
    saveSettings: (data) => _remoteCall('/settings', { method: 'PUT', body: data }),

    // Categories
    getCategories: (userId) => _remoteCall('/categories', { query: userId ? { userId } : {} }),
    createCategory: (data) => _remoteCall('/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => _remoteCall(`/categories/${id}`, { method: 'PUT', body: data }),
    deleteCategory: (id) => _remoteCall(`/categories/${id}`, { method: 'DELETE' }),

    // Suppliers
    getSuppliers: (search, userId) => _remoteCall('/suppliers', { query: { ...(search ? { search } : {}), ...(userId ? { userId } : {}) } }),
    createSupplier: (data) => _remoteCall('/suppliers', { method: 'POST', body: data }),
    updateSupplier: (id, data) => _remoteCall(`/suppliers/${id}`, { method: 'PUT', body: data }),
    deleteSupplier: (id) => _remoteCall(`/suppliers/${id}`, { method: 'DELETE' }),
    getSupplierProducts: (id) => _remoteCall(`/suppliers/${id}/products`),

    // Products
    getProducts: (filters) => _remoteCall('/products', { query: filters }),
    getProduct: (id) => _remoteCall(`/products/${id}`),
    createProduct: (data) => _remoteCall('/products', { method: 'POST', body: data }),
    updateProduct: (id, data) => _remoteCall(`/products/${id}`, { method: 'PUT', body: data }),
    deleteProduct: (id) => _remoteCall(`/products/${id}`, { method: 'DELETE' }),
    getLowStockProducts: (userId) => _remoteCall('/stats/low-stock', { query: userId ? { userId } : {} }),
    getStockValue: (userId) => _remoteCall('/stats/stock-value', { query: userId ? { userId } : {} }),
    importProductsFromExcel: (rows, createdBy) => _remoteCall('/products/import', { method: 'POST', body: { rows, createdBy } }),

    // Stock Movements
    stockIn: (productId, qty, note, createdBy) => _remoteCall('/stock/in', { method: 'POST', body: { productId, quantity: qty, note, createdBy } }),
    stockOut: (productId, qty, note, createdBy) => _remoteCall('/stock/out', { method: 'POST', body: { productId, quantity: qty, note, createdBy } }),
    stockAdjust: (productId, newQty, note, createdBy) => _remoteCall('/stock/adjust', { method: 'POST', body: { productId, newQuantity: newQty, note, createdBy } }),
    getStockMovements: (filters) => _remoteCall('/stock/movements', { query: filters }),
    getStockStats: (userId) => _remoteCall('/stock/stats', { query: userId ? { userId } : {} }),

    // Sales
    getSales: (filters) => _remoteCall('/sales', { query: filters }),
    getSale: (id) => _remoteCall(`/sales/${id}`),
    createSale: (data) => _remoteCall('/sales', { method: 'POST', body: data }),
    updateSalePayment: (id, paidAmount, status) => _remoteCall(`/sales/${id}/payment`, { method: 'PUT', body: { paidAmount, status } }),
    deleteSale: (id) => _remoteCall(`/sales/${id}`, { method: 'DELETE' }),
    getSalesStats: (startDate, endDate, userId) => _remoteCall('/stats/sales', { query: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(userId ? { userId } : {}) } }),
    getTopSellingProducts: (limit, userId) => _remoteCall('/stats/top-selling-products', { query: { limit: limit || 5, ...(userId ? { userId } : {}) } }),
    getMonthlySalesChart: (year, userId) => _remoteCall(`/stats/monthly-sales-chart/${year}`, { query: userId ? { userId } : {} }),
    getSalesPaymentStats: (startDate, endDate, userId) => _remoteCall('/sales/payment-stats', { query: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(userId ? { userId } : {}) } }),
    generateSaleReceipt: (id) => _remoteCall(`/sales/${id}/receipt`),

    // Auth
    login: (username, password) => _remoteCall('/auth/login', { method: 'POST', body: { username, password } }),
    logout: (token) => _remoteCall('/auth/logout', { method: 'POST', body: { token } }),
    verifyToken: (token) => _remoteCall('/auth/verify', { method: 'POST', body: { token } }),
    register: (data) => _remoteCall('/auth/register', { method: 'POST', body: data }),
    requestPasswordReset: (username, phone, email) => _remoteCall('/auth/request-password-reset', { method: 'POST', body: { username, phone, email } }),
    resetPassword: (token, newPassword) => _remoteCall('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),

    // Users
    getUsers: () => _remoteCall('/users'),
    createUser: (data) => _remoteCall('/users', { method: 'POST', body: data }),
    updateUser: (id, data) => _remoteCall(`/users/${id}`, { method: 'PUT', body: data }),
    deleteUser: (id) => _remoteCall(`/users/${id}`, { method: 'DELETE' }),
    getPendingUsers: () => _remoteCall('/users/pending'),
    approveUser: (userId) => _remoteCall(`/users/${userId}/approve`, { method: 'POST' }),
    rejectUser: (userId) => _remoteCall(`/users/${userId}/reject`, { method: 'POST' }),
    grantAccess: (userId, accessType, grantedById, customDuration) => _remoteCall(`/users/${userId}/access`, { method: 'POST', body: { accessType, customDuration } }),
    revokeAccess: (userId) => _remoteCall(`/users/${userId}/access`, { method: 'DELETE' }),
    checkUserAccess: (userId) => _remoteCall(`/users/${userId}/access`),

    // Roles
    getRoles: () => _remoteCall('/roles'),
    updateRolePermissions: (id, permissions) => _remoteCall(`/roles/${id}/permissions`, { method: 'PUT', body: { permissions } }),

    // Expenses
    getExpenses: (filters) => _remoteCall('/expenses', { query: filters }),
    createExpense: (data) => _remoteCall('/expenses', { method: 'POST', body: data }),
    updateExpense: (id, data) => _remoteCall(`/expenses/${id}`, { method: 'PUT', body: data }),
    deleteExpense: (id) => _remoteCall(`/expenses/${id}`, { method: 'DELETE' }),
    getExpenseStats: (startDate, endDate, userId) => _remoteCall('/stats/expenses', { query: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(userId ? { userId } : {}) } }),
    getExpenseCategories: () => _remoteCall('/expenses/categories'),

    // Notifications
    getNotifications: (userId, limit) => _remoteCall('/notifications', { query: { ...(userId ? { userId } : {}), ...(limit ? { limit } : {}) } }),
    getUnreadCount: (userId) => _remoteCall('/stats/notifications/unread', { query: userId ? { userId } : {} }),
    createNotification: (data) => _remoteCall('/notifications', { method: 'POST', body: data }),
    markNotificationRead: (id) => _remoteCall(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllNotificationsRead: () => _remoteCall('/notifications/read-all', { method: 'PUT' }),
    deleteNotification: (id) => _remoteCall(`/notifications/${id}`, { method: 'DELETE' }),
    checkSystemNotifications: (userId) => _remoteCall('/notifications/check', { method: 'POST', body: { userId } }),

    // Audit Logs
    getAuditLogs: (filters) => _remoteCall('/audit', { query: filters }),
    logAuditAction: (data) => _remoteCall('/audit', { method: 'POST', body: data }),
    clearAuditLogs: (daysOld) => _remoteCall('/audit/clear', { method: 'POST', body: { daysOld } }),

    // License
    getLicenseStatus: () => _remoteCall('/licenses/status'),
    activateLicense: (key) => _remoteCall('/licenses/activate', { method: 'POST', body: { license_key: key } }),
    generateLicenseKey: () => _remoteCall('/licenses/admin/generate-key', { method: 'POST' }),
    getMachineId: () => Promise.resolve({ success: true, data: 'remote-client' }),

    // Appointments
    getAppointments: (filters) => _remoteCall('/appointments', { query: filters }),
    getAppointment: (id) => _remoteCall(`/appointments/${id}`),
    createAppointment: (data) => _remoteCall('/appointments', { method: 'POST', body: data }),
    updateAppointment: (id, data) => _remoteCall(`/appointments/${id}`, { method: 'PUT', body: data }),
    deleteAppointment: (id) => _remoteCall(`/appointments/${id}`, { method: 'DELETE' }),
    getUpcomingAppointments: (days, userId) => _remoteCall('/appointments/upcoming', { query: { days: days || 3, ...(userId ? { userId } : {}) } }),
    getCustomerAppointments: (customerId) => _remoteCall(`/appointments/customer/${customerId}`),

    // Tasks
    getTasks: (filters) => _remoteCall('/tasks', { query: filters }),
    getTask: (id) => _remoteCall(`/tasks/${id}`),
    createTask: (data) => _remoteCall('/tasks', { method: 'POST', body: data }),
    updateTask: (id, data) => _remoteCall(`/tasks/${id}`, { method: 'PUT', body: data }),
    deleteTask: (id) => _remoteCall(`/tasks/${id}`, { method: 'DELETE' }),
    getActiveTasks: (userId) => _remoteCall('/tasks/active', { query: userId ? { userId } : {} }),
    getOverdueTasks: (userId) => _remoteCall('/tasks/overdue', { query: userId ? { userId } : {} }),
    getTaskStats: (userId) => _remoteCall('/tasks/stats', { query: userId ? { userId } : {} }),

    // Finance
    getFinanceSummary: (startDate, endDate, userId) => _remoteCall('/stats/sales', { query: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(userId ? { userId } : {}) } }),

    // Backup (not available in remote mode)
    createBackup: () => Promise.resolve({ success: false, error: 'Backup yalnız lokal rejimde mümkündür' }),
    restoreBackup: () => Promise.resolve({ success: false, error: 'Backup yalnız lokal rejimde mümkündür' }),
    listBackups: () => Promise.resolve({ success: true, data: [] }),
    getDbPath: () => Promise.resolve({ success: true, data: 'Remote server rejimi' }),

    // Export (not available in remote mode — handled by browser-side export)
    exportExcel: null,
    exportPdf: null,
    exportDailyPdf: null,
    exportCustomersExcel: null,

    // File dialogs (not available in remote mode)
    openFileDialog: null,
    openFolderDialog: null,
    openPath: null,
    showItemInFolder: null,
    openExternal: null,

    // Logging
    getLogPath: () => Promise.resolve({ success: false }),
    openLogFolder: () => Promise.resolve({ success: false }),

    // Telegram
    sendTelegramMessage: () => Promise.resolve({ success: false, error: 'Remote rejimde dəstəklənmir' }),
    sendTelegramReport: () => Promise.resolve({ success: false, error: 'Remote rejimde dəstəklənmir' }),

    // Seed
    seedData: () => Promise.resolve({ success: false }),

    // Auto-Update (keep from original if available)
    checkForUpdate: () => _originalWindowApi?.checkForUpdate?.() || Promise.resolve({ success: false }),
    getAppVersion: () => _originalWindowApi?.getAppVersion?.() || Promise.resolve({ success: true, data: { version: 'remote' } }),
    downloadUpdate: () => _originalWindowApi?.downloadUpdate?.() || Promise.resolve({ success: false }),
    installUpdate: () => _originalWindowApi?.installUpdate?.(),
    onUpdaterStatus: (cb) => _originalWindowApi?.onUpdaterStatus?.(cb) || (() => {}),
  };
}

function _syncWindowApi(remoteEnabled) {
  try {
    if (remoteEnabled) {
      if (window.api && !_originalWindowApi) {
        _originalWindowApi = window.api;
      }
      window.api = _buildRemoteProxy();
    } else {
      if (_originalWindowApi) {
        window.api = _originalWindowApi;
        _originalWindowApi = null;
      }
    }
  } catch {}
}

// On load, sync window.api state with stored remote config
try {
  const storedRemote = localStorage.getItem('use_remote') === 'true';
  const storedUrl = localStorage.getItem('api_base_url') || '';
  if (storedRemote && storedUrl) {
    _syncWindowApi(true);
  }
} catch {}

function hasRemote() {
  try {
    const localEnabled = localStorage.getItem('use_remote');
    const enabled = localEnabled === 'true' || import.meta.env.VITE_USE_REMOTE === 'true';
    const base = resolveBaseUrl();
    if (enabled && !!base) return true;
    // Auto-detect: if running in browser (no original window.api), use remote if URL exists
    if (!_originalWindowApi && !window.api && !!base) return true;
    return false;
  } catch {
    return false;
  }
}

function getRemoteConfig() {
  try {
    const explicitEnabled = (localStorage.getItem('use_remote') === 'true') || (import.meta.env.VITE_USE_REMOTE === 'true');
    const baseUrl = resolveBaseUrl();
    const enabled = explicitEnabled || (!_originalWindowApi && !window.api && !!baseUrl);
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
  // When remote is enabled, hide window.api so pages use apiRequest() fallback
  _syncWindowApi(enabled);
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

  // ─── Appointments ───────────────────────────────────────────────────────
  getAppointments: (filters) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const params = new URLSearchParams(filters || {}).toString();
      const r = await fetch(`${resolveBaseUrl()}/appointments?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getAppointments(filters);
  }),

  createAppointment: (data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return await r.json();
    }
    return await window.api.createAppointment(data);
  }),

  updateAppointment: (id, data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/appointments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return await r.json();
    }
    return await window.api.updateAppointment(id, data);
  }),

  deleteAppointment: (id) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/appointments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.deleteAppointment(id);
  }),

  getUpcomingAppointments: (days, userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const params = new URLSearchParams({ days: days || 3, ...(userId ? { userId } : {}) }).toString();
      const r = await fetch(`${resolveBaseUrl()}/appointments/upcoming?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getUpcomingAppointments(days, userId);
  }),

  getCustomerAppointments: (customerId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/appointments/customer/${customerId}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getCustomerAppointments(customerId);
  }),

  // ─── Tasks ──────────────────────────────────────────────────────────────
  getTasks: (filters) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const params = new URLSearchParams(filters || {}).toString();
      const r = await fetch(`${resolveBaseUrl()}/tasks?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getTasks(filters);
  }),

  createTask: (data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return await r.json();
    }
    return await window.api.createTask(data);
  }),

  updateTask: (id, data) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return await r.json();
    }
    return await window.api.updateTask(id, data);
  }),

  deleteTask: (id) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const r = await fetch(`${resolveBaseUrl()}/tasks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.deleteTask(id);
  }),

  getActiveTasks: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const params = userId ? `?userId=${userId}` : '';
      const r = await fetch(`${resolveBaseUrl()}/tasks/active${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getActiveTasks(userId);
  }),

  getTaskStats: (userId) => safeCall(async () => {
    if (hasRemote()) {
      const token = getToken();
      const params = userId ? `?userId=${userId}` : '';
      const r = await fetch(`${resolveBaseUrl()}/tasks/stats${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return await r.json();
    }
    return await window.api.getTaskStats(userId);
  }),
};
