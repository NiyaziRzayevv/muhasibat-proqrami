/**
 * SmartQeyd API Bridge - Hybrid (Electron IPC + HTTP)
 * Electron mühitdə: window.api (IPC → local SQLite)
 * Mobil/Web mühitdə: HTTP fetch → remote server (PostgreSQL)
 */

const isElectron = typeof window !== 'undefined' && !!window.api;

// Server URL - mobil/web mühit üçün
const SERVER_URL = localStorage.getItem('smartqeyd_server_url')
  || import.meta.env?.VITE_API_URL
  || 'https://smartqeyd-api.fly.dev';

let authToken = localStorage.getItem('smartqeyd_auth_token') || null;

function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem('smartqeyd_auth_token', token);
  else localStorage.removeItem('smartqeyd_auth_token');
}

function setServerUrl(url) {
  localStorage.setItem('smartqeyd_server_url', url);
}

async function safeCall(fn) {
  try {
    return await fn();
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

async function httpCall(method, path, body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    let url = `${SERVER_URL}${path}`;
    if (body && method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(body).forEach(([k, v]) => { if (v != null) params.set(k, v); });
      const qs = params.toString();
      if (qs) url += '?' + qs;
    }

    const res = await fetch(url, opts);
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, error: e?.message || 'Server bağlantısı yoxdur' };
  }
}

function ipcOrHttp(ipcFn, method, path, bodyFn) {
  if (isElectron) return safeCall(ipcFn);
  return httpCall(method, path, bodyFn?.());
}

export { setAuthToken, setServerUrl, isElectron, SERVER_URL };

export const apiBridge = {
  // ─── License (Electron only) ────────────────────────────────────────────
  getLicenseStatus: () => isElectron ? safeCall(() => window.api.getLicenseStatus()) : httpCall('GET', '/licenses/status'),
  activateLicense: (key) => isElectron ? safeCall(() => window.api.activateLicense(key)) : httpCall('POST', '/licenses/activate', { key }),
  activateDemo: () => isElectron ? safeCall(() => window.api.activateDemo()) : httpCall('POST', '/licenses/demo'),
  getDeviceId: () => isElectron ? safeCall(() => window.api.getDeviceId()) : Promise.resolve({ success: true, data: 'mobile' }),
  deactivateLicense: () => isElectron ? safeCall(() => window.api.deactivateLicense()) : httpCall('POST', '/licenses/deactivate'),

  // ─── Records ────────────────────────────────────────────────────────────
  getRecords: (f) => ipcOrHttp(() => window.api.getRecords(f), 'GET', '/records', () => f),
  getRecord: (id) => ipcOrHttp(() => window.api.getRecord(id), 'GET', `/records/${id}`),
  createRecord: (d) => ipcOrHttp(() => window.api.createRecord(d), 'POST', '/records', () => d),
  updateRecord: (id, d) => ipcOrHttp(() => window.api.updateRecord(id, d), 'PUT', `/records/${id}`, () => d),
  deleteRecord: (id) => ipcOrHttp(() => window.api.deleteRecord(id), 'DELETE', `/records/${id}`),
  deleteMultipleRecords: (ids) => ipcOrHttp(() => window.api.deleteMultipleRecords(ids), 'POST', '/records/delete-multiple', () => ({ ids })),
  updateRecordPayment: (id, pa, st) => ipcOrHttp(() => window.api.updateRecordPayment(id, pa, st), 'PUT', `/records/${id}/payment`, () => ({ paidAmount: pa, status: st })),

  // ─── Smart Parser ──────────────────────────────────────────────────────
  parseInput: (t) => ipcOrHttp(() => window.api.parseInput(t), 'POST', '/parse', () => ({ text: t })),
  parseInventory: (t) => ipcOrHttp(() => window.api.parseInventory(t), 'POST', '/parse/inventory', () => ({ text: t })),
  parseUniversal: (t) => ipcOrHttp(() => window.api.parseUniversal(t), 'POST', '/parse/universal', () => ({ text: t })),
  createFromParsed: (p, o) => ipcOrHttp(() => window.api.createFromParsed(p, o), 'POST', '/records', () => ({ ...p, ...o })),
  createSaleFromParsed: (p, o) => ipcOrHttp(() => window.api.createSaleFromParsed(p, o), 'POST', '/sales', () => ({ ...p, ...o })),

  // ─── Stats ──────────────────────────────────────────────────────────────
  getTodayStats: (u) => ipcOrHttp(() => window.api.getTodayStats(u), 'GET', '/stats/today', () => ({ userId: u })),
  getMonthStats: (y, m, u) => ipcOrHttp(() => window.api.getMonthStats(y, m, u), 'GET', '/stats/month', () => ({ year: y, month: m, userId: u })),
  getAllTimeStats: (u) => ipcOrHttp(() => window.api.getAllTimeStats(u), 'GET', '/stats/alltime', () => ({ userId: u })),
  getTopServices: (l, u) => ipcOrHttp(() => window.api.getTopServices(l, u), 'GET', '/stats/top-services', () => ({ limit: l, userId: u })),
  getTopBrands: (l, u) => ipcOrHttp(() => window.api.getTopBrands(l, u), 'GET', '/stats/top-brands', () => ({ limit: l, userId: u })),
  getMonthlyChart: (y, u) => ipcOrHttp(() => window.api.getMonthlyChart(y, u), 'GET', '/stats/monthly-chart', () => ({ year: y, userId: u })),
  getUnpaidRecords: (u) => ipcOrHttp(() => window.api.getUnpaidRecords(u), 'GET', '/stats/unpaid', () => ({ userId: u })),
  getDebtStats: (u) => ipcOrHttp(() => window.api.getDebtStats(u), 'GET', '/stats/debts', () => ({ userId: u })),
  getProductStats: (u) => ipcOrHttp(() => window.api.getProductStats(u), 'GET', '/stats/products', () => ({ userId: u })),
  getMonthlyRevenue: (y, u) => ipcOrHttp(() => window.api.getMonthlyRevenue(y, u), 'GET', '/stats/monthly-revenue', () => ({ year: y, userId: u })),
  getYearlyRevenue: (u) => ipcOrHttp(() => window.api.getYearlyRevenue(u), 'GET', '/stats/yearly-revenue', () => ({ userId: u })),

  // ─── Customers ──────────────────────────────────────────────────────────
  getCustomers: (s, u) => ipcOrHttp(() => window.api.getCustomers(s, u), 'GET', '/customers', () => ({ search: s, userId: u })),
  getCustomer: (id) => ipcOrHttp(() => window.api.getCustomer(id), 'GET', `/customers/${id}`),
  getCustomerDetail: (id) => ipcOrHttp(() => window.api.getCustomerDetail(id), 'GET', `/customers/${id}/detail`),
  getCustomerTimeline: (id, l) => ipcOrHttp(() => window.api.getCustomerTimeline(id, l), 'GET', `/customers/${id}/timeline`, () => ({ limit: l })),
  createCustomer: (d) => ipcOrHttp(() => window.api.createCustomer(d), 'POST', '/customers', () => d),
  updateCustomer: (id, d) => ipcOrHttp(() => window.api.updateCustomer(id, d), 'PUT', `/customers/${id}`, () => d),
  deleteCustomer: (id) => ipcOrHttp(() => window.api.deleteCustomer(id), 'DELETE', `/customers/${id}`),
  getCustomerRecords: (id) => ipcOrHttp(() => window.api.getCustomerRecords(id), 'GET', `/customers/${id}/records`),

  // ─── Vehicles ───────────────────────────────────────────────────────────
  getVehicles: (s, u) => ipcOrHttp(() => window.api.getVehicles(s, u), 'GET', '/vehicles', () => ({ search: s, userId: u })),
  getVehicle: (id) => ipcOrHttp(() => window.api.getVehicle(id), 'GET', `/vehicles/${id}`),
  createVehicle: (d) => ipcOrHttp(() => window.api.createVehicle(d), 'POST', '/vehicles', () => d),
  updateVehicle: (id, d) => ipcOrHttp(() => window.api.updateVehicle(id, d), 'PUT', `/vehicles/${id}`, () => d),
  deleteVehicle: (id) => ipcOrHttp(() => window.api.deleteVehicle(id), 'DELETE', `/vehicles/${id}`),

  // ─── Prices ─────────────────────────────────────────────────────────────
  getPrices: (s, u) => ipcOrHttp(() => window.api.getPrices(s, u), 'GET', '/prices', () => ({ search: s, userId: u })),
  createPrice: (d) => ipcOrHttp(() => window.api.createPrice(d), 'POST', '/prices', () => d),
  updatePrice: (id, d) => ipcOrHttp(() => window.api.updatePrice(id, d), 'PUT', `/prices/${id}`, () => d),
  deletePrice: (id) => ipcOrHttp(() => window.api.deletePrice(id), 'DELETE', `/prices/${id}`),

  // ─── Settings ───────────────────────────────────────────────────────────
  getSettings: () => ipcOrHttp(() => window.api.getSettings(), 'GET', '/settings'),
  saveSettings: (d) => ipcOrHttp(() => window.api.saveSettings(d), 'PUT', '/settings', () => d),

  // ─── Categories ─────────────────────────────────────────────────────────
  getCategories: (u) => ipcOrHttp(() => window.api.getCategories(u), 'GET', '/categories', () => ({ userId: u })),
  createCategory: (d) => ipcOrHttp(() => window.api.createCategory(d), 'POST', '/categories', () => d),
  updateCategory: (id, d) => ipcOrHttp(() => window.api.updateCategory(id, d), 'PUT', `/categories/${id}`, () => d),
  deleteCategory: (id) => ipcOrHttp(() => window.api.deleteCategory(id), 'DELETE', `/categories/${id}`),

  // ─── Suppliers ──────────────────────────────────────────────────────────
  getSuppliers: (s, u) => ipcOrHttp(() => window.api.getSuppliers(s, u), 'GET', '/suppliers', () => ({ search: s, userId: u })),
  createSupplier: (d) => ipcOrHttp(() => window.api.createSupplier(d), 'POST', '/suppliers', () => d),
  updateSupplier: (id, d) => ipcOrHttp(() => window.api.updateSupplier(id, d), 'PUT', `/suppliers/${id}`, () => d),
  deleteSupplier: (id) => ipcOrHttp(() => window.api.deleteSupplier(id), 'DELETE', `/suppliers/${id}`),
  getSupplierProducts: (id) => ipcOrHttp(() => window.api.getSupplierProducts(id), 'GET', `/suppliers/${id}/products`),
  getSupplierDetail: (id) => ipcOrHttp(() => window.api.getSupplierDetail(id), 'GET', `/suppliers/${id}/detail`),

  // ─── Products ───────────────────────────────────────────────────────────
  getProducts: (f) => ipcOrHttp(() => window.api.getProducts(f), 'GET', '/products', () => f),
  getProduct: (id) => ipcOrHttp(() => window.api.getProduct(id), 'GET', `/products/${id}`),
  getProductDetail: (id) => ipcOrHttp(() => window.api.getProductDetail(id), 'GET', `/products/${id}/detail`),
  updateProductPrice: (id, bp, sp, r, u) => ipcOrHttp(() => window.api.updateProductPrice(id, bp, sp, r, u), 'PUT', `/products/${id}/price`, () => ({ buyPrice: bp, sellPrice: sp, reason: r, userId: u })),
  createProduct: (d) => ipcOrHttp(() => window.api.createProduct(d), 'POST', '/products', () => d),
  updateProduct: (id, d) => ipcOrHttp(() => window.api.updateProduct(id, d), 'PUT', `/products/${id}`, () => d),
  deleteProduct: (id) => ipcOrHttp(() => window.api.deleteProduct(id), 'DELETE', `/products/${id}`),
  getLowStockProducts: (u) => ipcOrHttp(() => window.api.getLowStockProducts(u), 'GET', '/products/low-stock', () => ({ userId: u })),
  getStockValue: (u) => ipcOrHttp(() => window.api.getStockValue(u), 'GET', '/products/stock-value', () => ({ userId: u })),
  importProductsFromExcel: (r, c) => ipcOrHttp(() => window.api.importProductsFromExcel(r, c), 'POST', '/products/import', () => ({ rows: r, createdBy: c })),

  // ─── Stock Movements ────────────────────────────────────────────────────
  stockIn: (pid, q, n, c) => ipcOrHttp(() => window.api.stockIn(pid, q, n, c), 'POST', '/stock/in', () => ({ productId: pid, qty: q, note: n, createdBy: c })),
  stockOut: (pid, q, n, c) => ipcOrHttp(() => window.api.stockOut(pid, q, n, c), 'POST', '/stock/out', () => ({ productId: pid, qty: q, note: n, createdBy: c })),
  stockAdjust: (pid, nq, n, c) => ipcOrHttp(() => window.api.stockAdjust(pid, nq, n, c), 'POST', '/stock/adjust', () => ({ productId: pid, newQty: nq, note: n, createdBy: c })),
  getStockMovements: (f) => ipcOrHttp(() => window.api.getStockMovements(f), 'GET', '/stock', () => f),
  getStockStats: (u) => ipcOrHttp(() => window.api.getStockStats(u), 'GET', '/stock/stats', () => ({ userId: u })),

  // ─── Sales ──────────────────────────────────────────────────────────────
  getSales: (f) => ipcOrHttp(() => window.api.getSales(f), 'GET', '/sales', () => f),
  getSale: (id) => ipcOrHttp(() => window.api.getSale(id), 'GET', `/sales/${id}`),
  getSaleDetail: (id) => ipcOrHttp(() => window.api.getSaleDetail(id), 'GET', `/sales/${id}/detail`),
  createSale: (d) => ipcOrHttp(() => window.api.createSale(d), 'POST', '/sales', () => d),
  updateSalePayment: (id, pa, st) => ipcOrHttp(() => window.api.updateSalePayment(id, pa, st), 'PUT', `/sales/${id}/payment`, () => ({ paidAmount: pa, status: st })),
  deleteSale: (id, u) => ipcOrHttp(() => window.api.deleteSale(id, u), 'DELETE', `/sales/${id}`, () => ({ userId: u })),
  getSalesStats: (s, e, u) => ipcOrHttp(() => window.api.getSalesStats(s, e, u), 'GET', '/sales/stats', () => ({ startDate: s, endDate: e, userId: u })),
  getTopSellingProducts: (l, u) => ipcOrHttp(() => window.api.getTopSellingProducts(l, u), 'GET', '/sales/top-products', () => ({ limit: l, userId: u })),
  getMonthlySalesChart: (y, u) => ipcOrHttp(() => window.api.getMonthlySalesChart(y, u), 'GET', '/sales/monthly-chart', () => ({ year: y, userId: u })),
  getSalesPaymentStats: (s, e, u) => isElectron
    ? safeCall(() => window.api?.getSalesPaymentStats?.(s, e, u) || { success: true, data: [] })
    : httpCall('GET', '/sales/payment-stats', { startDate: s, endDate: e, userId: u }),
  generateSaleReceipt: (id) => ipcOrHttp(() => window.api.generateSaleReceipt(id), 'GET', `/sales/${id}/receipt`),

  // ─── Users ──────────────────────────────────────────────────────────────
  getUsers: () => ipcOrHttp(() => window.api.getUsers(), 'GET', '/users'),
  createUser: (d) => ipcOrHttp(() => window.api.createUser(d), 'POST', '/users', () => d),
  updateUser: (id, d) => ipcOrHttp(() => window.api.updateUser(id, d), 'PUT', `/users/${id}`, () => d),
  deleteUser: (id) => ipcOrHttp(() => window.api.deleteUser(id), 'DELETE', `/users/${id}`),
  getPendingUsers: () => ipcOrHttp(() => window.api.getPendingUsers(), 'GET', '/users/pending'),
  approveUser: (uid, aid) => ipcOrHttp(() => window.api.approveUser(uid, aid), 'POST', `/users/${uid}/approve`, () => ({ approvedById: aid })),
  rejectUser: (uid, aid) => ipcOrHttp(() => window.api.rejectUser(uid, aid), 'POST', `/users/${uid}/reject`, () => ({ approvedById: aid })),
  grantAccess: (uid, at, gid, cd) => ipcOrHttp(() => window.api.grantAccess(uid, at, gid, cd), 'POST', `/users/${uid}/grant-access`, () => ({ accessType: at, grantedById: gid, customDuration: cd })),
  revokeAccess: (uid, aid) => ipcOrHttp(() => window.api.revokeAccess(uid, aid), 'POST', `/users/${uid}/revoke-access`, () => ({ adminId: aid })),
  checkUserAccess: (uid) => ipcOrHttp(() => window.api.checkUserAccess(uid), 'GET', `/users/${uid}/access`),

  // ─── Roles ──────────────────────────────────────────────────────────────
  getRoles: () => ipcOrHttp(() => window.api.getRoles(), 'GET', '/roles'),
  updateRolePermissions: (id, p) => ipcOrHttp(() => window.api.updateRolePermissions(id, p), 'PUT', `/roles/${id}`, () => ({ permissions: p })),

  // ─── Expenses ───────────────────────────────────────────────────────────
  getExpenses: (f) => ipcOrHttp(() => window.api.getExpenses(f), 'GET', '/expenses', () => f),
  createExpense: (d) => ipcOrHttp(() => window.api.createExpense(d), 'POST', '/expenses', () => d),
  updateExpense: (id, d) => ipcOrHttp(() => window.api.updateExpense(id, d), 'PUT', `/expenses/${id}`, () => d),
  deleteExpense: (id, u) => ipcOrHttp(() => window.api.deleteExpense(id, u), 'DELETE', `/expenses/${id}`, () => ({ userId: u })),
  getExpenseDetail: (id) => ipcOrHttp(() => window.api.getExpenseDetail(id), 'GET', `/expenses/${id}/detail`),
  getExpenseStats: (s, e, u) => ipcOrHttp(() => window.api.getExpenseStats(s, e, u), 'GET', '/expenses/stats', () => ({ startDate: s, endDate: e, userId: u })),
  getExpenseCategories: () => ipcOrHttp(() => window.api.getExpenseCategories(), 'GET', '/expenses/categories'),

  // ─── Notifications ──────────────────────────────────────────────────────
  getNotifications: (u, l) => ipcOrHttp(() => window.api.getNotifications(u, l), 'GET', '/notifications', () => ({ userId: u, limit: l })),
  getUnreadCount: (u) => ipcOrHttp(() => window.api.getUnreadCount(u), 'GET', '/notifications/unread', () => ({ userId: u })),
  createNotification: (d) => ipcOrHttp(() => window.api.createNotification(d), 'POST', '/notifications', () => d),
  markNotificationRead: (id) => ipcOrHttp(() => window.api.markNotificationRead(id), 'PUT', `/notifications/${id}/read`),
  markAllNotificationsRead: () => ipcOrHttp(() => window.api.markAllNotificationsRead(), 'PUT', '/notifications/read-all'),
  deleteNotification: (id) => ipcOrHttp(() => window.api.deleteNotification(id), 'DELETE', `/notifications/${id}`),
  checkSystemNotifications: (u) => ipcOrHttp(() => window.api.checkSystemNotifications(u), 'GET', '/notifications/system', () => ({ userId: u })),

  // ─── Audit Logs ─────────────────────────────────────────────────────────
  getAuditLogs: (f) => ipcOrHttp(() => window.api.getAuditLogs(f), 'GET', '/audit', () => f),
  logAuditAction: (d) => ipcOrHttp(() => window.api.logAuditAction(d), 'POST', '/audit', () => d),
  clearAuditLogs: (d) => ipcOrHttp(() => window.api.clearAuditLogs(d), 'DELETE', '/audit', () => ({ daysOld: d })),

  // ─── Appointments ───────────────────────────────────────────────────────
  getAppointments: (f) => ipcOrHttp(() => window.api.getAppointments(f), 'GET', '/appointments', () => f),
  getAppointment: (id) => ipcOrHttp(() => window.api.getAppointment(id), 'GET', `/appointments/${id}`),
  createAppointment: (d) => ipcOrHttp(() => window.api.createAppointment(d), 'POST', '/appointments', () => d),
  updateAppointment: (id, d) => ipcOrHttp(() => window.api.updateAppointment(id, d), 'PUT', `/appointments/${id}`, () => d),
  deleteAppointment: (id) => ipcOrHttp(() => window.api.deleteAppointment(id), 'DELETE', `/appointments/${id}`),
  getUpcomingAppointments: (d, u) => ipcOrHttp(() => window.api.getUpcomingAppointments(d, u), 'GET', '/appointments/upcoming', () => ({ days: d, userId: u })),
  getCustomerAppointments: (cid) => ipcOrHttp(() => window.api.getCustomerAppointments(cid), 'GET', `/customers/${cid}/appointments`),

  // ─── Tasks ──────────────────────────────────────────────────────────────
  getTasks: (f) => ipcOrHttp(() => window.api.getTasks(f), 'GET', '/tasks', () => f),
  getTask: (id) => ipcOrHttp(() => window.api.getTask(id), 'GET', `/tasks/${id}`),
  createTask: (d) => ipcOrHttp(() => window.api.createTask(d), 'POST', '/tasks', () => d),
  updateTask: (id, d) => ipcOrHttp(() => window.api.updateTask(id, d), 'PUT', `/tasks/${id}`, () => d),
  deleteTask: (id) => ipcOrHttp(() => window.api.deleteTask(id), 'DELETE', `/tasks/${id}`),
  getActiveTasks: (u) => ipcOrHttp(() => window.api.getActiveTasks(u), 'GET', '/tasks/active', () => ({ userId: u })),
  getOverdueTasks: (u) => ipcOrHttp(() => window.api.getOverdueTasks(u), 'GET', '/tasks/overdue', () => ({ userId: u })),
  getTaskStats: (u) => ipcOrHttp(() => window.api.getTaskStats(u), 'GET', '/tasks/stats', () => ({ userId: u })),

  // ─── Finance ────────────────────────────────────────────────────────────
  getFinanceSummary: (s, e, u) => ipcOrHttp(() => window.api.getFinanceSummary(s, e, u), 'GET', '/finance/summary', () => ({ startDate: s, endDate: e, userId: u })),
  getExpensesByCategory: (s, e, u) => ipcOrHttp(() => window.api.getExpensesByCategory(s, e, u), 'GET', '/finance/expenses-by-category', () => ({ startDate: s, endDate: e, userId: u })),
  getMonthlyTrend: (y, u) => ipcOrHttp(() => window.api.getMonthlyTrend(y, u), 'GET', '/finance/monthly-trend', () => ({ year: y, userId: u })),
  getPaymentMethodStats: (s, e, u) => ipcOrHttp(() => window.api.getPaymentMethodStats(s, e, u), 'GET', '/finance/payment-methods', () => ({ startDate: s, endDate: e, userId: u })),
  getRecentFinanceTransactions: (l, u) => ipcOrHttp(() => window.api.getRecentFinanceTransactions(l, u), 'GET', '/finance/recent', () => ({ limit: l, userId: u })),
  getDailyCashFlow: (y, m, u) => ipcOrHttp(() => window.api.getDailyCashFlow(y, m, u), 'GET', '/finance/cash-flow', () => ({ year: y, month: m, userId: u })),
  getFinanceTransactions: (f) => ipcOrHttp(() => window.api.getFinanceTransactions(f), 'GET', '/finance', () => f),
  createFinanceTransaction: (d) => ipcOrHttp(() => window.api.createFinanceTransaction(d), 'POST', '/finance', () => d),
  deleteFinanceTransaction: (id) => ipcOrHttp(() => window.api.deleteFinanceTransaction(id), 'DELETE', `/finance/${id}`),

  // ─── Debts ────────────────────────────────────────────────────────────────────
  getDebts: (f) => ipcOrHttp(() => window.api.getDebts(f), 'GET', '/debts', () => f),
  getDebtDetail: (id) => ipcOrHttp(() => window.api.getDebtDetail(id), 'GET', `/debts/${id}/detail`),
  payDebt: (d) => ipcOrHttp(() => window.api.payDebt(d), 'POST', '/debts/pay', () => d),
  getDebtPayments: (f) => ipcOrHttp(() => window.api.getDebtPayments(f), 'GET', '/debts/payments', () => f),
  getDebtStatsUnified: (u) => ipcOrHttp(() => window.api.getDebtStatsUnified(u), 'GET', '/debts/stats', () => ({ userId: u })),

  // ─── Assets ─────────────────────────────────────────────────────────────
  getAssets: (f) => ipcOrHttp(() => window.api.getAssets(f), 'GET', '/assets', () => f),
  getAsset: (id) => ipcOrHttp(() => window.api.getAsset(id), 'GET', `/assets/${id}`),
  createAsset: (d) => ipcOrHttp(() => window.api.createAsset(d), 'POST', '/assets', () => d),
  updateAsset: (id, d) => ipcOrHttp(() => window.api.updateAsset(id, d), 'PUT', `/assets/${id}`, () => d),
  deleteAsset: (id) => ipcOrHttp(() => window.api.deleteAsset(id), 'DELETE', `/assets/${id}`),
  getAssetCategories: () => ipcOrHttp(() => window.api.getAssetCategories(), 'GET', '/assets/categories'),

  // ─── Telegram ───────────────────────────────────────────────────────────
  sendTelegramMessage: (t) => isElectron ? safeCall(() => window.api.sendTelegramMessage(t)) : Promise.resolve({ success: false, error: 'Yalnız desktop' }),
  sendTelegramReport: (u) => isElectron ? safeCall(() => window.api.sendTelegramReport(u)) : Promise.resolve({ success: false, error: 'Yalnız desktop' }),

  // ─── Export (Electron only) ──────────────────────────────────────────────
  exportExcel: (r, f) => isElectron ? safeCall(() => window.api.exportExcel(r, f)) : Promise.resolve({ success: false, error: 'Mobil-də dəstəklənmir' }),
  exportPdf: (r, o) => isElectron ? safeCall(() => window.api.exportPdf(r, o)) : Promise.resolve({ success: false, error: 'Mobil-də dəstəklənmir' }),
  exportDailyPdf: (r, d, o) => isElectron ? safeCall(() => window.api.exportDailyPdf(r, d, o)) : Promise.resolve({ success: false, error: 'Mobil-də dəstəklənmir' }),
  exportCustomersExcel: (c) => isElectron ? safeCall(() => window.api.exportCustomersExcel(c)) : Promise.resolve({ success: false, error: 'Mobil-də dəstəklənmir' }),

  // ─── Backup (Electron only) ──────────────────────────────────────────────
  createBackup: (d) => isElectron ? safeCall(() => window.api.createBackup(d)) : Promise.resolve({ success: false, error: 'Yalnız desktop' }),
  restoreBackup: (f) => isElectron ? safeCall(() => window.api.restoreBackup(f)) : Promise.resolve({ success: false, error: 'Yalnız desktop' }),
  listBackups: (d) => isElectron ? safeCall(() => window.api.listBackups(d)) : Promise.resolve({ success: true, data: [] }),
  getDbPath: () => isElectron ? safeCall(() => window.api.getDbPath()) : Promise.resolve({ success: true, data: 'remote' }),

  // ─── File Dialogs (Electron only) ────────────────────────────────────────
  openFileDialog: (o) => isElectron ? window.api?.openFileDialog?.(o) : null,
  openFolderDialog: () => isElectron ? window.api?.openFolderDialog?.() : null,
  openPath: (f) => isElectron ? window.api?.openPath?.(f) : null,
  showItemInFolder: (f) => isElectron ? window.api?.showItemInFolder?.(f) : null,
  openExternal: (url) => isElectron ? window.api?.openExternal?.(url) : window.open(url, '_blank'),

  // ─── Logging ─────────────────────────────────────────────────────────────
  getLogPath: () => isElectron ? safeCall(() => window.api.getLogPath()) : Promise.resolve({ success: true, data: '' }),
  openLogFolder: () => isElectron ? safeCall(() => window.api.openLogFolder()) : Promise.resolve({ success: false }),

  // ─── Seed ────────────────────────────────────────────────────────────────
  seedData: () => isElectron ? safeCall(() => window.api.seedData()) : Promise.resolve({ success: false, error: 'Yalnız desktop' }),

  // ─── Auto-Update (Electron only) ────────────────────────────────────────
  checkForUpdate: () => isElectron ? safeCall(() => window.api.checkForUpdate()) : Promise.resolve({ success: false }),
  getAppVersion: () => isElectron ? safeCall(() => window.api.getAppVersion()) : Promise.resolve({ success: true, data: '1.5.4' }),
  downloadUpdate: () => isElectron ? safeCall(() => window.api.downloadUpdate()) : Promise.resolve({ success: false }),
  installUpdate: () => isElectron ? window.api?.installUpdate?.() : null,
  onUpdaterStatus: (cb) => isElectron ? (window.api?.onUpdaterStatus?.(cb) || (() => {})) : (() => {}),

  // ─── Auth ────────────────────────────────────────────────────────────────
  login: (u, p) => isElectron
    ? safeCall(() => window.api.login(u, p))
    : httpCall('POST', '/auth/login', { username: u, password: p }).then(r => { if (r.success && r.data?.token) setAuthToken(r.data.token); return r; }),
  logout: (t) => isElectron
    ? safeCall(() => window.api.logout(t))
    : httpCall('POST', '/auth/logout').then(r => { setAuthToken(null); return r; }),
  verifyToken: (t) => isElectron ? safeCall(() => window.api.verifyToken(t)) : httpCall('GET', '/auth/verify'),
  register: (d) => isElectron ? safeCall(() => window.api.register(d)) : httpCall('POST', '/auth/register', d),
  requestPasswordReset: () => Promise.resolve({ success: false, error: 'Dəstəklənmir' }),
  resetPassword: () => Promise.resolve({ success: false, error: 'Dəstəklənmir' }),

  // ─── Dashboard (real data) ──────────────────────────────────────────────
  getDashboardData: (u) => ipcOrHttp(() => window.api.getDashboardData(u), 'GET', '/dashboard', () => ({ userId: u })),

  // ─── Notes ──────────────────────────────────────────────────────────────
  getNotes: (f) => ipcOrHttp(() => window.api.getNotes(f), 'GET', '/notes', () => f),
  createNote: (d) => ipcOrHttp(() => window.api.createNote(d), 'POST', '/notes', () => d),
  updateNote: (id, d) => ipcOrHttp(() => window.api.updateNote(id, d), 'PUT', `/notes/${id}`, () => d),
  deleteNote: (id) => ipcOrHttp(() => window.api.deleteNote(id), 'DELETE', `/notes/${id}`),

  // ─── Price History ──────────────────────────────────────────────────────
  getPriceHistory: (pid) => ipcOrHttp(() => window.api.getPriceHistory(pid), 'GET', `/products/${pid}/price-history`),

  // ─── Compat stubs ───────────────────────────────────────────────────────
  getRemoteConfig: () => ({ enabled: !isElectron }),
  setRemoteConfig: () => {},
  getDashboardStats: (u) => ipcOrHttp(() => window.api.getDashboardData(u), 'GET', '/dashboard', () => ({ userId: u })),
  getFinanceStats: (s, e, u) => ipcOrHttp(() => window.api.getFinanceSummary(s, e, u), 'GET', '/finance/summary', () => ({ startDate: s, endDate: e, userId: u })),
  getCustomerCount: (u) => isElectron
    ? safeCall(() => window.api.getCustomers(null, u).then(r => ({ success: true, data: r.data?.length || 0 })))
    : httpCall('GET', '/customers/count', { userId: u }),
  grantLicense: () => Promise.resolve({ success: false, error: 'Dəstəklənmir' }),
  revokeLicense: () => Promise.resolve({ success: false, error: 'Dəstəklənmir' }),
  getMachineId: () => isElectron ? safeCall(() => window.api.getDeviceId()) : Promise.resolve({ success: true, data: 'mobile' }),
};
