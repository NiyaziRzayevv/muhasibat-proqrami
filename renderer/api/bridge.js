/**
 * SmartQeyd API Bridge - Offline Only
 * All calls go directly to window.api (Electron IPC → local SQLite)
 * No server/remote dependencies
 */

async function safeCall(fn) {
  try {
    return await fn();
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export const apiBridge = {
  // ─── License ─────────────────────────────────────────────────────────────
  getLicenseStatus: () => safeCall(() => window.api.getLicenseStatus()),
  activateLicense: (key) => safeCall(() => window.api.activateLicense(key)),
  activateDemo: () => safeCall(() => window.api.activateDemo()),
  getDeviceId: () => safeCall(() => window.api.getDeviceId()),
  deactivateLicense: () => safeCall(() => window.api.deactivateLicense()),

  // ─── Records ─────────────────────────────────────────────────────────────
  getRecords: (filters) => safeCall(() => window.api.getRecords(filters)),
  getRecord: (id) => safeCall(() => window.api.getRecord(id)),
  createRecord: (data) => safeCall(() => window.api.createRecord(data)),
  updateRecord: (id, data) => safeCall(() => window.api.updateRecord(id, data)),
  deleteRecord: (id) => safeCall(() => window.api.deleteRecord(id)),
  deleteMultipleRecords: (ids) => safeCall(() => window.api.deleteMultipleRecords(ids)),
  updateRecordPayment: (id, paidAmount, status) => safeCall(() => window.api.updateRecordPayment(id, paidAmount, status)),

  // ─── Smart Parser ────────────────────────────────────────────────────────
  parseInput: (text) => safeCall(() => window.api.parseInput(text)),
  parseInventory: (text) => safeCall(() => window.api.parseInventory(text)),
  parseUniversal: (text) => safeCall(() => window.api.parseUniversal(text)),
  createFromParsed: (parsed, overrides) => safeCall(() => window.api.createFromParsed(parsed, overrides)),
  createSaleFromParsed: (parsed, overrides) => safeCall(() => window.api.createSaleFromParsed(parsed, overrides)),

  // ─── Stats ───────────────────────────────────────────────────────────────
  getTodayStats: (userId) => safeCall(() => window.api.getTodayStats(userId)),
  getMonthStats: (year, month, userId) => safeCall(() => window.api.getMonthStats(year, month, userId)),
  getAllTimeStats: (userId) => safeCall(() => window.api.getAllTimeStats(userId)),
  getTopServices: (limit, userId) => safeCall(() => window.api.getTopServices(limit, userId)),
  getTopBrands: (limit, userId) => safeCall(() => window.api.getTopBrands(limit, userId)),
  getMonthlyChart: (year, userId) => safeCall(() => window.api.getMonthlyChart(year, userId)),
  getUnpaidRecords: (userId) => safeCall(() => window.api.getUnpaidRecords(userId)),
  getDebtStats: (userId) => safeCall(() => window.api.getDebtStats(userId)),
  getProductStats: (userId) => safeCall(() => window.api.getProductStats(userId)),
  getMonthlyRevenue: (year, userId) => safeCall(() => window.api.getMonthlyRevenue(year, userId)),
  getYearlyRevenue: (userId) => safeCall(() => window.api.getYearlyRevenue(userId)),

  // ─── Customers ───────────────────────────────────────────────────────────
  getCustomers: (search, userId) => safeCall(() => window.api.getCustomers(search, userId)),
  getCustomer: (id) => safeCall(() => window.api.getCustomer(id)),
  createCustomer: (data) => safeCall(() => window.api.createCustomer(data)),
  updateCustomer: (id, data) => safeCall(() => window.api.updateCustomer(id, data)),
  deleteCustomer: (id) => safeCall(() => window.api.deleteCustomer(id)),
  getCustomerRecords: (id) => safeCall(() => window.api.getCustomerRecords(id)),

  // ─── Vehicles ────────────────────────────────────────────────────────────
  getVehicles: (search, userId) => safeCall(() => window.api.getVehicles(search, userId)),
  getVehicle: (id) => safeCall(() => window.api.getVehicle(id)),
  createVehicle: (data) => safeCall(() => window.api.createVehicle(data)),
  updateVehicle: (id, data) => safeCall(() => window.api.updateVehicle(id, data)),
  deleteVehicle: (id) => safeCall(() => window.api.deleteVehicle(id)),

  // ─── Prices ──────────────────────────────────────────────────────────────
  getPrices: (search, userId) => safeCall(() => window.api.getPrices(search, userId)),
  createPrice: (data) => safeCall(() => window.api.createPrice(data)),
  updatePrice: (id, data) => safeCall(() => window.api.updatePrice(id, data)),
  deletePrice: (id) => safeCall(() => window.api.deletePrice(id)),

  // ─── Settings ────────────────────────────────────────────────────────────
  getSettings: () => safeCall(() => window.api.getSettings()),
  saveSettings: (data) => safeCall(() => window.api.saveSettings(data)),

  // ─── Categories ──────────────────────────────────────────────────────────
  getCategories: (userId) => safeCall(() => window.api.getCategories(userId)),
  createCategory: (data) => safeCall(() => window.api.createCategory(data)),
  updateCategory: (id, data) => safeCall(() => window.api.updateCategory(id, data)),
  deleteCategory: (id) => safeCall(() => window.api.deleteCategory(id)),

  // ─── Suppliers ───────────────────────────────────────────────────────────
  getSuppliers: (search, userId) => safeCall(() => window.api.getSuppliers(search, userId)),
  createSupplier: (data) => safeCall(() => window.api.createSupplier(data)),
  updateSupplier: (id, data) => safeCall(() => window.api.updateSupplier(id, data)),
  deleteSupplier: (id) => safeCall(() => window.api.deleteSupplier(id)),
  getSupplierProducts: (id) => safeCall(() => window.api.getSupplierProducts(id)),

  // ─── Products ────────────────────────────────────────────────────────────
  getProducts: (filters) => safeCall(() => window.api.getProducts(filters)),
  getProduct: (id) => safeCall(() => window.api.getProduct(id)),
  createProduct: (data) => safeCall(() => window.api.createProduct(data)),
  updateProduct: (id, data) => safeCall(() => window.api.updateProduct(id, data)),
  deleteProduct: (id) => safeCall(() => window.api.deleteProduct(id)),
  getLowStockProducts: (userId) => safeCall(() => window.api.getLowStockProducts(userId)),
  getStockValue: (userId) => safeCall(() => window.api.getStockValue(userId)),
  importProductsFromExcel: (rows, createdBy) => safeCall(() => window.api.importProductsFromExcel(rows, createdBy)),

  // ─── Stock Movements ─────────────────────────────────────────────────────
  stockIn: (productId, qty, note, createdBy) => safeCall(() => window.api.stockIn(productId, qty, note, createdBy)),
  stockOut: (productId, qty, note, createdBy) => safeCall(() => window.api.stockOut(productId, qty, note, createdBy)),
  stockAdjust: (productId, newQty, note, createdBy) => safeCall(() => window.api.stockAdjust(productId, newQty, note, createdBy)),
  getStockMovements: (filters) => safeCall(() => window.api.getStockMovements(filters)),
  getStockStats: (userId) => safeCall(() => window.api.getStockStats(userId)),

  // ─── Sales ───────────────────────────────────────────────────────────────
  getSales: (filters) => safeCall(() => window.api.getSales(filters)),
  getSale: (id) => safeCall(() => window.api.getSale(id)),
  createSale: (data) => safeCall(() => window.api.createSale(data)),
  updateSalePayment: (id, paidAmount, status) => safeCall(() => window.api.updateSalePayment(id, paidAmount, status)),
  deleteSale: (id) => safeCall(() => window.api.deleteSale(id)),
  getSalesStats: (startDate, endDate, userId) => safeCall(() => window.api.getSalesStats(startDate, endDate, userId)),
  getTopSellingProducts: (limit, userId) => safeCall(() => window.api.getTopSellingProducts(limit, userId)),
  getMonthlySalesChart: (year, userId) => safeCall(() => window.api.getMonthlySalesChart(year, userId)),
  getSalesPaymentStats: (startDate, endDate, userId) => safeCall(() => {
    if (window.api?.getSalesPaymentStats) return window.api.getSalesPaymentStats(startDate, endDate, userId);
    return { success: true, data: [] };
  }),
  generateSaleReceipt: (id) => safeCall(() => window.api.generateSaleReceipt(id)),

  // ─── Users (local, no auth needed) ───────────────────────────────────────
  getUsers: () => safeCall(() => window.api.getUsers()),
  createUser: (data) => safeCall(() => window.api.createUser(data)),
  updateUser: (id, data) => safeCall(() => window.api.updateUser(id, data)),
  deleteUser: (id) => safeCall(() => window.api.deleteUser(id)),
  getPendingUsers: () => safeCall(() => window.api.getPendingUsers()),
  approveUser: (userId, approvedById) => safeCall(() => window.api.approveUser(userId, approvedById)),
  rejectUser: (userId, approvedById) => safeCall(() => window.api.rejectUser(userId, approvedById)),
  grantAccess: (userId, accessType, grantedById, customDuration) => safeCall(() => window.api.grantAccess(userId, accessType, grantedById, customDuration)),
  revokeAccess: (userId, adminId) => safeCall(() => window.api.revokeAccess(userId, adminId)),
  checkUserAccess: (userId) => safeCall(() => window.api.checkUserAccess(userId)),

  // ─── Roles ───────────────────────────────────────────────────────────────
  getRoles: () => safeCall(() => window.api.getRoles()),
  updateRolePermissions: (id, permissions) => safeCall(() => window.api.updateRolePermissions(id, permissions)),

  // ─── Expenses ────────────────────────────────────────────────────────────
  getExpenses: (filters) => safeCall(() => window.api.getExpenses(filters)),
  createExpense: (data) => safeCall(() => window.api.createExpense(data)),
  updateExpense: (id, data) => safeCall(() => window.api.updateExpense(id, data)),
  deleteExpense: (id) => safeCall(() => window.api.deleteExpense(id)),
  getExpenseStats: (startDate, endDate, userId) => safeCall(() => window.api.getExpenseStats(startDate, endDate, userId)),
  getExpenseCategories: () => safeCall(() => window.api.getExpenseCategories()),

  // ─── Notifications ───────────────────────────────────────────────────────
  getNotifications: (userId, limit) => safeCall(() => window.api.getNotifications(userId, limit)),
  getUnreadCount: (userId) => safeCall(() => window.api.getUnreadCount(userId)),
  createNotification: (data) => safeCall(() => window.api.createNotification(data)),
  markNotificationRead: (id) => safeCall(() => window.api.markNotificationRead(id)),
  markAllNotificationsRead: () => safeCall(() => window.api.markAllNotificationsRead()),
  deleteNotification: (id) => safeCall(() => window.api.deleteNotification(id)),
  checkSystemNotifications: (userId) => safeCall(() => window.api.checkSystemNotifications(userId)),

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  getAuditLogs: (filters) => safeCall(() => window.api.getAuditLogs(filters)),
  logAuditAction: (data) => safeCall(() => window.api.logAuditAction(data)),
  clearAuditLogs: (daysOld) => safeCall(() => window.api.clearAuditLogs(daysOld)),

  // ─── Appointments ────────────────────────────────────────────────────────
  getAppointments: (filters) => safeCall(() => window.api.getAppointments(filters)),
  getAppointment: (id) => safeCall(() => window.api.getAppointment(id)),
  createAppointment: (data) => safeCall(() => window.api.createAppointment(data)),
  updateAppointment: (id, data) => safeCall(() => window.api.updateAppointment(id, data)),
  deleteAppointment: (id) => safeCall(() => window.api.deleteAppointment(id)),
  getUpcomingAppointments: (days, userId) => safeCall(() => window.api.getUpcomingAppointments(days, userId)),
  getCustomerAppointments: (customerId) => safeCall(() => window.api.getCustomerAppointments(customerId)),

  // ─── Tasks ───────────────────────────────────────────────────────────────
  getTasks: (filters) => safeCall(() => window.api.getTasks(filters)),
  getTask: (id) => safeCall(() => window.api.getTask(id)),
  createTask: (data) => safeCall(() => window.api.createTask(data)),
  updateTask: (id, data) => safeCall(() => window.api.updateTask(id, data)),
  deleteTask: (id) => safeCall(() => window.api.deleteTask(id)),
  getActiveTasks: (userId) => safeCall(() => window.api.getActiveTasks(userId)),
  getOverdueTasks: (userId) => safeCall(() => window.api.getOverdueTasks(userId)),
  getTaskStats: (userId) => safeCall(() => window.api.getTaskStats(userId)),

  // ─── Finance ─────────────────────────────────────────────────────────────
  getFinanceSummary: (startDate, endDate, userId) => safeCall(() => window.api.getFinanceSummary(startDate, endDate, userId)),
  getFinanceTransactions: (filters) => safeCall(() => window.api.getFinanceTransactions(filters)),
  createFinanceTransaction: (data) => safeCall(() => window.api.createFinanceTransaction(data)),
  deleteFinanceTransaction: (id) => safeCall(() => window.api.deleteFinanceTransaction(id)),

  // ─── Debts ───────────────────────────────────────────────────────────────
  getDebts: (filters) => safeCall(() => window.api.getDebts(filters)),
  payDebt: (data) => safeCall(() => window.api.payDebt(data)),
  getDebtPayments: (filters) => safeCall(() => window.api.getDebtPayments(filters)),
  getDebtStatsUnified: (userId) => safeCall(() => window.api.getDebtStatsUnified(userId)),

  // ─── Assets ──────────────────────────────────────────────────────────────
  getAssets: (filters) => safeCall(() => window.api.getAssets(filters)),
  getAsset: (id) => safeCall(() => window.api.getAsset(id)),
  createAsset: (data) => safeCall(() => window.api.createAsset(data)),
  updateAsset: (id, data) => safeCall(() => window.api.updateAsset(id, data)),
  deleteAsset: (id) => safeCall(() => window.api.deleteAsset(id)),
  getAssetCategories: () => safeCall(() => window.api.getAssetCategories()),

  // ─── Telegram ────────────────────────────────────────────────────────────
  sendTelegramMessage: (text) => safeCall(() => window.api.sendTelegramMessage(text)),
  sendTelegramReport: (userId) => safeCall(() => window.api.sendTelegramReport(userId)),

  // ─── Export ──────────────────────────────────────────────────────────────
  exportExcel: (records, filename) => safeCall(() => window.api.exportExcel(records, filename)),
  exportPdf: (records, options) => safeCall(() => window.api.exportPdf(records, options)),
  exportDailyPdf: (records, date, options) => safeCall(() => window.api.exportDailyPdf(records, date, options)),
  exportCustomersExcel: (customers) => safeCall(() => window.api.exportCustomersExcel(customers)),

  // ─── Backup ──────────────────────────────────────────────────────────────
  createBackup: (dir) => safeCall(() => window.api.createBackup(dir)),
  restoreBackup: (filePath) => safeCall(() => window.api.restoreBackup(filePath)),
  listBackups: (dir) => safeCall(() => window.api.listBackups(dir)),
  getDbPath: () => safeCall(() => window.api.getDbPath()),

  // ─── File Dialogs ────────────────────────────────────────────────────────
  openFileDialog: (options) => window.api?.openFileDialog?.(options),
  openFolderDialog: () => window.api?.openFolderDialog?.(),
  openPath: (filePath) => window.api?.openPath?.(filePath),
  showItemInFolder: (filePath) => window.api?.showItemInFolder?.(filePath),
  openExternal: (url) => window.api?.openExternal?.(url),

  // ─── Logging ─────────────────────────────────────────────────────────────
  getLogPath: () => safeCall(() => window.api.getLogPath()),
  openLogFolder: () => safeCall(() => window.api.openLogFolder()),

  // ─── Seed ────────────────────────────────────────────────────────────────
  seedData: () => safeCall(() => window.api.seedData()),

  // ─── Auto-Update ─────────────────────────────────────────────────────────
  checkForUpdate: () => safeCall(() => window.api.checkForUpdate()),
  getAppVersion: () => safeCall(() => window.api.getAppVersion()),
  downloadUpdate: () => safeCall(() => window.api.downloadUpdate()),
  installUpdate: () => window.api?.installUpdate?.(),
  onUpdaterStatus: (cb) => window.api?.onUpdaterStatus?.(cb) || (() => {}),

  // ─── Auth (kept as stubs for backward compat, no server) ─────────────────
  login: (username, password) => safeCall(() => window.api.login(username, password)),
  logout: (token) => safeCall(() => window.api.logout(token)),
  verifyToken: (token) => safeCall(() => window.api.verifyToken(token)),
  register: (data) => safeCall(() => window.api.register(data)),
  requestPasswordReset: () => Promise.resolve({ success: false, error: 'Offline rejim' }),
  resetPassword: () => Promise.resolve({ success: false, error: 'Offline rejim' }),

  // ─── Compat stubs ────────────────────────────────────────────────────────
  getRemoteConfig: () => ({ enabled: false }),
  setRemoteConfig: () => {},
  getDashboardStats: () => Promise.resolve({ success: false, error: 'Use local stats' }),
  getFinanceStats: (startDate, endDate, userId) => safeCall(() => window.api.getFinanceSummary(startDate, endDate, userId)),
  getCustomerCount: (userId) => safeCall(() => window.api.getCustomers(null, userId).then(r => ({ success: true, data: r.data?.length || 0 }))),
  grantLicense: () => Promise.resolve({ success: false, error: 'Offline rejim' }),
  revokeLicense: () => Promise.resolve({ success: false, error: 'Offline rejim' }),
  getMachineId: () => safeCall(() => window.api.getDeviceId()),
};
