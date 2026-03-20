const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Records
  getRecords: (filters) => ipcRenderer.invoke('records:getAll', filters),
  getRecord: (id) => ipcRenderer.invoke('records:getOne', id),
  createRecord: (data) => ipcRenderer.invoke('records:create', data),
  updateRecord: (id, data) => ipcRenderer.invoke('records:update', id, data),
  deleteRecord: (id) => ipcRenderer.invoke('records:delete', id),
  deleteMultipleRecords: (ids) => ipcRenderer.invoke('records:deleteMultiple', ids),

  // Smart input parsing
  parseInput: (text) => ipcRenderer.invoke('parser:parse', text),
  parseInventory: (text) => ipcRenderer.invoke('parser:inventory', text),
  parseUniversal: (text) => ipcRenderer.invoke('parser:universal', text),
  createFromParsed: (parsed, overrides) => ipcRenderer.invoke('records:createFromParsed', parsed, overrides),
  createSaleFromParsed: (parsed, overrides) => ipcRenderer.invoke('sales:createFromParsed', parsed, overrides),

  // Stats
  getTodayStats: (userId) => ipcRenderer.invoke('stats:today', userId),
  getMonthStats: (year, month, userId) => ipcRenderer.invoke('stats:month', year, month, userId),
  getAllTimeStats: (userId) => ipcRenderer.invoke('stats:alltime', userId),
  getTopServices: (limit, userId) => ipcRenderer.invoke('stats:topServices', limit, userId),
  getTopBrands: (limit, userId) => ipcRenderer.invoke('stats:topBrands', limit, userId),
  getMonthlyChart: (year, userId) => ipcRenderer.invoke('stats:monthlyChart', year, userId),
  getUnpaidRecords: (userId) => ipcRenderer.invoke('records:unpaid', userId),

  // Customers
  getCustomers: (search, userId) => ipcRenderer.invoke('customers:getAll', search, userId),
  getCustomer: (id) => ipcRenderer.invoke('customers:getOne', id),
  getCustomerDetail: (id) => ipcRenderer.invoke('customers:detail', id),
  getCustomerTimeline: (id, limit) => ipcRenderer.invoke('customers:timeline', id, limit),
  createCustomer: (data) => ipcRenderer.invoke('customers:create', data),
  updateCustomer: (id, data) => ipcRenderer.invoke('customers:update', id, data),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  getCustomerRecords: (id) => ipcRenderer.invoke('customers:records', id),

  // Vehicles
  getVehicles: (search, userId) => ipcRenderer.invoke('vehicles:getAll', search, userId),
  getVehicle: (id) => ipcRenderer.invoke('vehicles:getOne', id),
  createVehicle: (data) => ipcRenderer.invoke('vehicles:create', data),
  updateVehicle: (id, data) => ipcRenderer.invoke('vehicles:update', id, data),
  deleteVehicle: (id) => ipcRenderer.invoke('vehicles:delete', id),

  // Prices
  getPrices: (search, userId) => ipcRenderer.invoke('prices:getAll', search, userId),
  createPrice: (data) => ipcRenderer.invoke('prices:create', data),
  updatePrice: (id, data) => ipcRenderer.invoke('prices:update', id, data),
  deletePrice: (id) => ipcRenderer.invoke('prices:delete', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),

  // Telegram
  sendTelegramMessage: (text) => ipcRenderer.invoke('telegram:send', text),
  sendTelegramReport: (userId) => ipcRenderer.invoke('telegram:report', userId),

  // Export
  exportExcel: (records, filename) => ipcRenderer.invoke('export:excel', records, filename),
  exportPdf: (records, options) => ipcRenderer.invoke('export:pdf', records, options),
  exportDailyPdf: (records, date, options) => ipcRenderer.invoke('export:dailyPdf', records, date, options),
  exportCustomersExcel: (customers) => ipcRenderer.invoke('export:customersExcel', customers),

  // Backup
  createBackup: (dir) => ipcRenderer.invoke('backup:create', dir),
  restoreBackup: (filePath) => ipcRenderer.invoke('backup:restore', filePath),
  listBackups: (dir) => ipcRenderer.invoke('backup:list', dir),
  getDbPath: () => ipcRenderer.invoke('db:path'),

  // File dialogs
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Logging
  getLogPath: () => ipcRenderer.invoke('log:path'),
  openLogFolder: () => ipcRenderer.invoke('log:open'),

  // Stats
  getDebtStats: (userId) => ipcRenderer.invoke('stats:debt', userId),
  getProductStats: (userId) => ipcRenderer.invoke('stats:products', userId),
  getMonthlyRevenue: (year, userId) => ipcRenderer.invoke('stats:monthlyRevenue', year, userId),
  getYearlyRevenue: (userId) => ipcRenderer.invoke('stats:yearlyRevenue', userId),

  // Seed
  seedData: () => ipcRenderer.invoke('db:seed'),

  // Categories
  getCategories: (userId) => ipcRenderer.invoke('categories:getAll', userId),
  createCategory: (data) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (id, data) => ipcRenderer.invoke('categories:update', id, data),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),

  // Suppliers
  getSuppliers: (search, userId) => ipcRenderer.invoke('suppliers:getAll', search, userId),
  createSupplier: (data) => ipcRenderer.invoke('suppliers:create', data),
  updateSupplier: (id, data) => ipcRenderer.invoke('suppliers:update', id, data),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),
  getSupplierProducts: (id) => ipcRenderer.invoke('suppliers:products', id),
  getSupplierDetail: (id) => ipcRenderer.invoke('suppliers:detail', id),

  // Products
  getProducts: (filters) => ipcRenderer.invoke('products:getAll', filters),
  getProduct: (id) => ipcRenderer.invoke('products:getOne', id),
  getProductDetail: (id) => ipcRenderer.invoke('products:detail', id),
  updateProductPrice: (id, buyPrice, sellPrice, reason, userId) => ipcRenderer.invoke('products:updatePrice', id, buyPrice, sellPrice, reason, userId),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  getLowStockProducts: (userId) => ipcRenderer.invoke('products:lowStock', userId),
  getStockValue: (userId) => ipcRenderer.invoke('products:stockValue', userId),

  // Stock Movements
  stockIn: (productId, qty, note, createdBy) => ipcRenderer.invoke('stock:in', productId, qty, note, createdBy),
  stockOut: (productId, qty, note, createdBy) => ipcRenderer.invoke('stock:out', productId, qty, note, createdBy),
  stockAdjust: (productId, newQty, note, createdBy) => ipcRenderer.invoke('stock:adjust', productId, newQty, note, createdBy),
  getStockMovements: (filters) => ipcRenderer.invoke('stock:movements', filters),
  getStockStats: (userId) => ipcRenderer.invoke('stock:stats', userId),

  // Sales
  getSales: (filters) => ipcRenderer.invoke('sales:getAll', filters),
  getSale: (id) => ipcRenderer.invoke('sales:getOne', id),
  getSaleDetail: (id) => ipcRenderer.invoke('sales:detail', id),
  createSale: (data) => ipcRenderer.invoke('sales:create', data),
  updateSalePayment: (id, paidAmount, status) => ipcRenderer.invoke('sales:updatePayment', id, paidAmount, status),
  deleteSale: (id, userId) => ipcRenderer.invoke('sales:delete', id, userId),
  getSalesStats: (startDate, endDate, userId) => ipcRenderer.invoke('sales:stats', startDate, endDate, userId),
  getTopSellingProducts: (limit, userId) => ipcRenderer.invoke('sales:topProducts', limit, userId),
  getMonthlySalesChart: (year, userId) => ipcRenderer.invoke('sales:monthlyChart', year, userId),
  getSalesPaymentStats: (startDate, endDate, userId) => ipcRenderer.invoke('sales:paymentStats', startDate, endDate, userId),
  generateSaleReceipt: (id) => ipcRenderer.invoke('sales:receipt', id),
  importProductsFromExcel: (rows, createdBy) => ipcRenderer.invoke('products:importExcel', rows, createdBy),

  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: (token) => ipcRenderer.invoke('auth:logout', token),
  verifyToken: (token) => ipcRenderer.invoke('auth:verify', token),
  register: (data) => ipcRenderer.invoke('auth:register', data),
  requestPasswordReset: (username, phone, email) => ipcRenderer.invoke('auth:requestPasswordReset', username, phone, email),
  resetPassword: (token, newPassword) => ipcRenderer.invoke('auth:resetPassword', token, newPassword),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  getPendingUsers: () => ipcRenderer.invoke('users:pending'),
  approveUser: (userId, approvedById) => ipcRenderer.invoke('users:approve', userId, approvedById),
  rejectUser: (userId, approvedById) => ipcRenderer.invoke('users:reject', userId, approvedById),
  grantAccess: (userId, accessType, grantedById, customDuration) => ipcRenderer.invoke('users:grantAccess', userId, accessType, grantedById, customDuration),
  revokeAccess: (userId, adminId) => ipcRenderer.invoke('users:revokeAccess', userId, adminId),
  checkUserAccess: (userId) => ipcRenderer.invoke('users:checkAccess', userId),

  // Roles
  getRoles: () => ipcRenderer.invoke('roles:getAll'),
  updateRolePermissions: (id, permissions) => ipcRenderer.invoke('roles:updatePermissions', id, permissions),

  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('expenses:getAll', filters),
  createExpense: (data) => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
  deleteExpense: (id, userId) => ipcRenderer.invoke('expenses:delete', id, userId),
  getExpenseDetail: (id) => ipcRenderer.invoke('expenses:detail', id),
  getExpenseStats: (startDate, endDate, userId) => ipcRenderer.invoke('expenses:stats', startDate, endDate, userId),
  getExpenseCategories: () => ipcRenderer.invoke('expenses:categories'),

  // Notifications
  getNotifications: (userId, limit) => ipcRenderer.invoke('notifications:getAll', userId, limit),
  getUnreadCount: (userId) => ipcRenderer.invoke('notifications:unreadCount', userId),
  createNotification: (data) => ipcRenderer.invoke('notifications:create', data),
  markNotificationRead: (id) => ipcRenderer.invoke('notifications:markRead', id),
  markAllNotificationsRead: () => ipcRenderer.invoke('notifications:markAllRead'),
  deleteNotification: (id) => ipcRenderer.invoke('notifications:delete', id),
  checkSystemNotifications: (userId) => ipcRenderer.invoke('notifications:check', userId),

  // Audit Logs
  getAuditLogs: (filters) => ipcRenderer.invoke('audit:getAll', filters),
  logAuditAction: (data) => ipcRenderer.invoke('audit:log', data),
  clearAuditLogs: (daysOld) => ipcRenderer.invoke('audit:clear', daysOld),

  // License (legacy device-level)
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  activateDemo: () => ipcRenderer.invoke('license:demo'),
  getDeviceId: () => ipcRenderer.invoke('license:deviceId'),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  generateLicense: (deviceId, durationType, durationValue) => ipcRenderer.invoke('license:generate', deviceId, durationType, durationValue),

  // User-level license
  checkUserLicense: (userId) => ipcRenderer.invoke('license:checkUser', userId),
  activateUserLicense: (userId, key, deviceId) => ipcRenderer.invoke('license:activateForUser', userId, key, deviceId),
  generateUserLicense: (durationType, durationValue, adminId, targetUserId, targetDeviceId) => ipcRenderer.invoke('license:generateForUser', durationType, durationValue, adminId, targetUserId, targetDeviceId),
  getAllUserLicenses: () => ipcRenderer.invoke('license:getAllUser'),
  revokeUserLicense: (licenseId) => ipcRenderer.invoke('license:revokeUser', licenseId),

  // Appointments
  getAppointments: (filters) => ipcRenderer.invoke('appointments:list', filters),
  getAppointment: (id) => ipcRenderer.invoke('appointments:get', id),
  createAppointment: (data) => ipcRenderer.invoke('appointments:create', data),
  updateAppointment: (id, data) => ipcRenderer.invoke('appointments:update', id, data),
  deleteAppointment: (id) => ipcRenderer.invoke('appointments:delete', id),
  getUpcomingAppointments: (days, userId) => ipcRenderer.invoke('appointments:upcoming', days, userId),
  getCustomerAppointments: (customerId) => ipcRenderer.invoke('appointments:customer', customerId),

  // Tasks
  getTasks: (filters) => ipcRenderer.invoke('tasks:list', filters),
  getTask: (id) => ipcRenderer.invoke('tasks:get', id),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (id, data) => ipcRenderer.invoke('tasks:update', id, data),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  getActiveTasks: (userId) => ipcRenderer.invoke('tasks:active', userId),
  getOverdueTasks: (userId) => ipcRenderer.invoke('tasks:overdue', userId),
  getTaskStats: (userId) => ipcRenderer.invoke('tasks:stats', userId),

  // Finance
  getFinanceSummary: (startDate, endDate, userId) => ipcRenderer.invoke('finance:summary', startDate, endDate, userId),
  getExpensesByCategory: (startDate, endDate, userId) => ipcRenderer.invoke('finance:expensesByCategory', startDate, endDate, userId),
  getMonthlyTrend: (year, userId) => ipcRenderer.invoke('finance:monthlyTrend', year, userId),
  getPaymentMethodStats: (startDate, endDate, userId) => ipcRenderer.invoke('finance:paymentMethodStats', startDate, endDate, userId),
  getRecentFinanceTransactions: (limit, userId) => ipcRenderer.invoke('finance:recentTransactions', limit, userId),
  getDailyCashFlow: (year, month, userId) => ipcRenderer.invoke('finance:dailyCashFlow', year, month, userId),
  getFinanceTransactions: (filters) => ipcRenderer.invoke('finance:transactions', filters),
  createFinanceTransaction: (data) => ipcRenderer.invoke('finance:createTransaction', data),
  deleteFinanceTransaction: (id) => ipcRenderer.invoke('finance:deleteTransaction', id),

  // Assets
  getAssets: (filters) => ipcRenderer.invoke('assets:getAll', filters),
  getAsset: (id) => ipcRenderer.invoke('assets:getOne', id),
  createAsset: (data) => ipcRenderer.invoke('assets:create', data),
  updateAsset: (id, data) => ipcRenderer.invoke('assets:update', id, data),
  deleteAsset: (id) => ipcRenderer.invoke('assets:delete', id),
  getAssetCategories: () => ipcRenderer.invoke('assets:categories'),

  // Debts (unified)
  getDebts: (filters) => ipcRenderer.invoke('debts:getAll', filters),
  getDebtDetail: (id) => ipcRenderer.invoke('debts:detail', id),
  payDebt: (data) => ipcRenderer.invoke('debts:pay', data),
  getDebtPayments: (filters) => ipcRenderer.invoke('debts:payments', filters),
  getDebtStatsUnified: (userId) => ipcRenderer.invoke('debts:stats', userId),

  // Dashboard (real data)
  getDashboardData: (userId) => ipcRenderer.invoke('dashboard:getAll', userId),

  // Notes
  getNotes: (filters) => ipcRenderer.invoke('notes:getAll', filters),
  createNote: (data) => ipcRenderer.invoke('notes:create', data),
  updateNote: (id, data) => ipcRenderer.invoke('notes:update', id, data),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),

  // Price History
  getPriceHistory: (productId) => ipcRenderer.invoke('priceHistory:getAll', productId),

  // Record Payment
  updateRecordPayment: (id, paidAmount, status) => ipcRenderer.invoke('records:updatePayment', id, paidAmount, status),

  // AI Assistant
  aiChat: (message, userId, history) => ipcRenderer.invoke('ai:chat', message, userId, history),
  aiQuickActions: () => ipcRenderer.invoke('ai:quickActions'),

  // Auto-Update
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),
  getAppVersion: () => ipcRenderer.invoke('updater:version'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
});
