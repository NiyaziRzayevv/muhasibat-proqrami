const { ipcMain, dialog, shell } = require('electron');
const logger = require('./logger');
const recordsDb = require('../database/records');
const customersDb = require('../database/customers');
const vehiclesDb = require('../database/vehicles');
const pricesDb = require('../database/prices');
const settingsDb = require('../database/settings');
const productsDb = require('../database/products');
const categoriesDb = require('../database/categories');
const suppliersDb = require('../database/suppliers');
const statsDb = require('../database/stats');
const stockMovementsDb = require('../database/stock_movements');
const salesDb = require('../database/sales');
const usersDb = require('../database/users');
const rolesDb = require('../database/roles');
const expensesDb = require('../database/expenses');
const notificationsDb = require('../database/notifications');
const auditLogsDb = require('../database/audit_logs');
const licensesDb = require('../database/licenses');
const appointmentsDb = require('../database/appointments');
const tasksDb = require('../database/tasks');
const { processSmartInput, createRecordFromParsed, createSaleFromParsed, updateRecordWithPayment } = require('../services/record-service');
const { parseInventory, parseUniversal } = require('../ai/parser');
const { createBackup, restoreBackup, listBackups } = require('../services/backup-service');
const { exportRecordsToExcel, exportCustomersToExcel } = require('../exports/excel-export');
const { exportRecordsToPdf, exportDailyReportToPdf, exportSaleReceiptPdf } = require('../exports/pdf-export');
const { getDbFilePath } = require('../database/index');
const { seedDatabase } = require('../database/seed');
const { sendMessage, sendDailyReport } = require('../services/telegram-service');

function registerHandlers() {
  // Telegram
  ipcMain.handle('telegram:send', async (_, text) => {
    return await sendMessage(text);
  });

  ipcMain.handle('telegram:report', async (_, userId) => {
    return await sendDailyReport(userId);
  });

  // Records
  ipcMain.handle('records:getAll', (_, filters) => {
    try { return { success: true, data: recordsDb.getAllRecords(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:getAllForUser', (_, filters) => {
    try { return { success: true, data: recordsDb.getAllRecords(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:getOne', (_, id) => {
    try { return { success: true, data: recordsDb.getRecordById(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:create', (_, data) => {
    try {
      const record = recordsDb.createRecord(data);
      logger.dbInsert('records', record.id);
      logger.totalCalc('record.total_price', record.total_price);
      return { success: true, data: record };
    } catch (e) {
      logger.errorLog('records:create', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('records:update', (_, id, data) => {
    try {
      const result = updateRecordWithPayment(id, data);
      if (!result) return { success: false, error: 'Qeyd tapılmadı' };
      return { success: true, data: result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:delete', (_, id) => {
    try { return { success: true, data: recordsDb.deleteRecord(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:deleteMultiple', (_, ids) => {
    try { return { success: true, data: recordsDb.deleteMultipleRecords(ids) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:unpaid', (_, userId) => {
    try { return { success: true, data: recordsDb.getUnpaidRecords(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Smart Parser
  ipcMain.handle('parser:inventory', (_, text) => {
    try { return parseInventory(text); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('sales:receipt', async (_, saleId) => {
    try {
      const sale = salesDb.getSaleById(saleId);
      if (!sale) return { success: false, error: 'Satış tapılmadı' };
      const settings = settingsDb.getAllSettings();
      return await exportSaleReceiptPdf(sale, { companyName: settings.company_name || 'Biznes İdarəetmə' });
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('products:importExcel', async (_, rows, createdBy) => {
    try {
      let created = 0;
      for (const row of (rows || [])) {
        if (!row.name && !row.Ad) continue;
        const stockQty = parseFloat(row.stock_qty || row.Stok) || 0;
        const product = productsDb.createProduct({
          name: row.name || row.Ad || '',
          sku: row.sku || row.SKU || null,
          buy_price: parseFloat(row.buy_price || row['Alış qiyməti']) || 0,
          sell_price: parseFloat(row.sell_price || row['Satış qiyməti']) || 0,
          stock_qty: 0,
          min_stock: parseFloat(row.min_stock || row['Min stok']) || 0,
          unit: row.unit || row.Vahid || 'ədəd',
          notes: row.notes || row.Qeyd || null,
          created_by: createdBy || null,
        });
        if (stockQty > 0) {
          stockMovementsDb.stockIn(product.id, stockQty, 'CSV import - ilkin stok', null, null, createdBy || null);
        }
        created++;
      }
      return { success: true, data: { created } };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('parser:universal', async (_, text) => {
    try {
      logger.rawInput(text);
      const result = await parseUniversal(text);
      logger.parsed(result);
      return result;
    } catch (e) {
      logger.errorLog('parser:universal', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('parser:parse', async (_, text) => {
    try { return await processSmartInput(text); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('records:createFromParsed', async (_, parsed, overrides) => {
    try {
      const result = await createRecordFromParsed(parsed, overrides || {});
      return { success: true, data: result.record, priceSource: result.priceSource };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('sales:createFromParsed', async (_, parsed, overrides) => {
    try {
      const result = await createSaleFromParsed(parsed, overrides || {});
      return { success: true, data: result.sale };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // Stats
  ipcMain.handle('stats:today', (_, userId) => {
    try { return { success: true, data: recordsDb.getTodayStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:month', (_, year, month, userId) => {
    try { return { success: true, data: recordsDb.getMonthStats(year, month, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:alltime', (_, userId) => {
    try { return { success: true, data: recordsDb.getAllTimeStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:topServices', (_, limit, userId) => {
    try { return { success: true, data: recordsDb.getTopServices(limit || 5, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:topBrands', (_, limit, userId) => {
    try { return { success: true, data: recordsDb.getTopBrands(limit || 5, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:monthlyChart', (_, year, userId) => {
    try { return { success: true, data: recordsDb.getMonthlyChart(year || new Date().getFullYear(), userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Customers
  ipcMain.handle('customers:getAll', (_, search, userId) => {
    try { return { success: true, data: customersDb.getAllCustomers(search || '', userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('customers:getOne', (_, id) => {
    try { return { success: true, data: customersDb.getCustomerById(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('customers:create', (_, data) => {
    try { return { success: true, data: customersDb.createCustomer(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('customers:update', (_, id, data) => {
    try { return { success: true, data: customersDb.updateCustomer(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('customers:delete', (_, id) => {
    try { return { success: true, data: customersDb.deleteCustomer(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('customers:records', (_, id) => {
    try { return { success: true, data: customersDb.getCustomerRecords(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Vehicles
  ipcMain.handle('vehicles:getAll', (_, search, userId) => {
    try { return { success: true, data: vehiclesDb.getAllVehicles(search || '', userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vehicles:getOne', (_, id) => {
    try { return { success: true, data: vehiclesDb.getVehicleById(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vehicles:create', (_, data) => {
    try { return { success: true, data: vehiclesDb.createVehicle(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vehicles:update', (_, id, data) => {
    try { return { success: true, data: vehiclesDb.updateVehicle(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vehicles:delete', (_, id) => {
    try { return { success: true, data: vehiclesDb.deleteVehicle(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Prices
  ipcMain.handle('prices:getAll', (_, search, userId) => {
    try { return { success: true, data: pricesDb.getAllPrices(search || '', userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('prices:create', (_, data) => {
    try { return { success: true, data: pricesDb.createPrice(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('prices:update', (_, id, data) => {
    try { return { success: true, data: pricesDb.updatePrice(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('prices:delete', (_, id) => {
    try { return { success: true, data: pricesDb.deletePrice(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Settings
  ipcMain.handle('settings:getAll', () => {
    try { return { success: true, data: settingsDb.getAllSettings() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('settings:save', (_, data) => {
    try { settingsDb.setMultipleSettings(data); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Export
  ipcMain.handle('export:excel', (_, records, filename) => {
    try { return exportRecordsToExcel(records, filename); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('export:pdf', async (_, records, options) => {
    try { return await exportRecordsToPdf(records, options || {}); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('export:dailyPdf', async (_, records, date, options) => {
    try { return await exportDailyReportToPdf(records, date, options || {}); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('export:customersExcel', (_, customers) => {
    try { return exportCustomersToExcel(customers); }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Backup
  ipcMain.handle('backup:create', (_, dir) => {
    try { return createBackup(dir); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('backup:restore', (_, filePath) => {
    try { return restoreBackup(filePath); }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('backup:list', (_, dir) => {
    try { return { success: true, data: listBackups(dir) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:path', () => {
    try { return { success: true, data: getDbFilePath() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // File Dialogs
  ipcMain.handle('dialog:openFile', async (event, options) => {
    const win = require('electron').BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openFolder', async (event) => {
    const win = require('electron').BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('shell:openPath', async (_, filePath) => {
    try { await shell.openPath(filePath); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('shell:showItemInFolder', (_, filePath) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  ipcMain.handle('shell:openExternal', async (_, url) => {
    try { await shell.openExternal(url); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('log:path', () => {
    try { return { success: true, data: logger.getLogPath() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('log:open', async () => {
    try {
      const p = logger.getLogPath();
      if (p) shell.showItemInFolder(p);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // Stats
  ipcMain.handle('stats:debt', (_, userId) => {
    try { return { success: true, data: statsDb.getDebtStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:products', (_, userId) => {
    try { return { success: true, data: statsDb.getProductStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:monthlyRevenue', (_, year, userId) => {
    try { return { success: true, data: statsDb.getMonthlyRevenue(year, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('stats:yearlyRevenue', (_, userId) => {
    try { return { success: true, data: statsDb.getYearlyRevenue(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Seed
  ipcMain.handle('db:seed', () => {
    try { seedDatabase(); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Categories
  ipcMain.handle('categories:getAll', (_, userId) => {
    try { return { success: true, data: categoriesDb.getAllCategories(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('categories:create', (_, data) => {
    try { return { success: true, data: categoriesDb.createCategory(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('categories:update', (_, id, data) => {
    try { return { success: true, data: categoriesDb.updateCategory(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('categories:delete', (_, id) => {
    try { return { success: true, data: categoriesDb.deleteCategory(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Suppliers
  ipcMain.handle('suppliers:getAll', (_, search, userId) => {
    try { return { success: true, data: suppliersDb.getAllSuppliers(search || '', userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('suppliers:create', (_, data) => {
    try { return { success: true, data: suppliersDb.createSupplier(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('suppliers:update', (_, id, data) => {
    try { return { success: true, data: suppliersDb.updateSupplier(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('suppliers:delete', (_, id) => {
    try { return { success: true, data: suppliersDb.deleteSupplier(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('suppliers:products', (_, id) => {
    try { return { success: true, data: suppliersDb.getSupplierProducts(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Products
  ipcMain.handle('products:getAll', (_, filters) => {
    try { return { success: true, data: productsDb.getAllProducts(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('products:getOne', (_, id) => {
    try { return { success: true, data: productsDb.getProductById(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('products:create', (_, data) => {
    try {
      const initialStockQty = Number(data.stock_qty) || 0;
      const product = productsDb.createProduct({
        ...data,
        stock_qty: 0,
      });
      logger.dbInsert('products', product.id);
      if (initialStockQty > 0) {
        stockMovementsDb.stockIn(product.id, initialStockQty, 'İlkin stok', null, null, data.created_by || null);
        logger.info('STOCK', `Initial stock for product ${product.id}: +${initialStockQty}`);
      }
      return { success: true, data: product };
    } catch (e) {
      logger.errorLog('products:create', e);
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('products:update', (_, id, data) => {
    try {
      if (data && data.stock_qty !== undefined) {
        const newQty = Number(data.stock_qty);
        if (!Number.isNaN(newQty)) {
          stockMovementsDb.stockAdjust(id, newQty, 'Məhsul redaktəsi ilə stok düzəlişi', data.updated_by || data.created_by || null);
        }
        delete data.stock_qty;
      }
      return { success: true, data: productsDb.updateProduct(id, data) };
    }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('products:delete', (_, id) => {
    try { return { success: true, data: productsDb.deleteProduct(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('products:lowStock', (_, userId) => {
    try { return { success: true, data: productsDb.getLowStockProducts(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('products:stockValue', (_, userId) => {
    try { return { success: true, data: productsDb.getStockValue(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Stock Movements
  ipcMain.handle('stock:in', (_, productId, qty, note, createdBy) => {
    try {
      const after = stockMovementsDb.stockIn(productId, qty, note, null, null, createdBy);
      logger.info('STOCK', `IN product=${productId} qty=+${qty} after=${after}`);
      return { success: true, data: after };
    } catch (e) {
      logger.errorLog('stock:in', e);
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('stock:out', (_, productId, qty, note, createdBy) => {
    try {
      const after = stockMovementsDb.stockOut(productId, qty, note, null, null, createdBy);
      logger.info('STOCK', `OUT product=${productId} qty=-${qty} after=${after}`);
      return { success: true, data: after };
    } catch (e) {
      logger.errorLog('stock:out', e);
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('stock:adjust', (_, productId, newQty, note, createdBy) => {
    try { return { success: true, data: stockMovementsDb.stockAdjust(productId, newQty, note, createdBy) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('stock:movements', (_, filters) => {
    try { return { success: true, data: stockMovementsDb.getAllMovements(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('stock:stats', (_, userId) => {
    try { return { success: true, data: stockMovementsDb.getMovementStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // Sales
  ipcMain.handle('sales:getAll', (_, filters) => {
    try { return { success: true, data: salesDb.getAllSales(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:getOne', (_, id) => {
    try { return { success: true, data: salesDb.getSaleById(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:create', (_, data) => {
    try {
      const sale = salesDb.createSale(data);
      logger.dbInsert('sales', sale.id);
      logger.totalCalc('sale.total', sale.total);
      return { success: true, data: sale };
    } catch (e) {
      logger.errorLog('sales:create', e);
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('sales:updatePayment', (_, id, paidAmount, status) => {
    try { return { success: true, data: salesDb.updateSalePayment(id, paidAmount, status) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:delete', (_, id) => {
    try { return { success: true, data: salesDb.deleteSale(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:stats', (_, startDate, endDate, userId) => {
    try { return { success: true, data: salesDb.getSalesStats(startDate, endDate, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:topProducts', (_, limit, userId) => {
    try { return { success: true, data: salesDb.getTopSellingProducts(limit || 10, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('sales:monthlyChart', (_, year, userId) => {
    try { return { success: true, data: salesDb.getMonthlySalesChart(year || new Date().getFullYear(), userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('sales:paymentStats', (_, startDate, endDate, userId) => {
    try { return { success: true, data: salesDb.getPaymentMethodStats(startDate, endDate, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Users & Auth ──────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', (_, username, password) => {
    try {
      const result = usersDb.loginUser(username, password);
      if (!result.success) return result;
      const user = result.data;
      auditLogsDb.logAction({ action: 'LOGIN', entity_type: 'users', entity_id: user.id, user_id: user.id, user_name: user.username });
      const { password_hash, ...safeUser } = user;
      return { success: true, data: safeUser };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('auth:register', (_, data) => {
    try {
      const result = usersDb.registerUser(data);
      if (result.success) {
        auditLogsDb.logAction({ action: 'REGISTER', entity_type: 'users', entity_id: result.data.id, user_name: data.username, new_data: { username: data.username, full_name: data.full_name } });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('auth:requestPasswordReset', (_, username, phone, email) => {
    try {
      const result = usersDb.requestPasswordReset(username, phone, email);
      if (result.success) {
        auditLogsDb.logAction({ action: 'PASSWORD_RESET_REQUEST', entity_type: 'users', entity_id: result.data.user.id, user_name: username, new_data: { username, phone, email } });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('auth:resetPassword', (_, token, newPassword) => {
    try {
      const result = usersDb.resetPassword(token, newPassword);
      if (result.success) {
        auditLogsDb.logAction({ action: 'PASSWORD_RESET', entity_type: 'users', user_name: 'password_reset', new_data: { token_used: true } });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:pending', () => {
    try { return { success: true, data: usersDb.getPendingUsers() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:approve', (_, userId, approvedById) => {
    try {
      const user = usersDb.approveUser(userId, approvedById);
      if (user) {
        auditLogsDb.logAction({ action: 'APPROVE_USER', entity_type: 'users', entity_id: userId, user_id: approvedById, user_name: 'admin' });
        return { success: true, data: user };
      }
      return { success: false, error: 'İstifadəçi tapılmadı' };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:reject', (_, userId, approvedById) => {
    try {
      const result = usersDb.rejectUser(userId, approvedById);
      if (result) {
        auditLogsDb.logAction({ action: 'REJECT_USER', entity_type: 'users', entity_id: userId, user_id: approvedById, user_name: 'admin' });
        return { success: true };
      }
      return { success: false, error: 'İstifadəçi tapılmadı' };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:grantAccess', (_, userId, accessType, grantedById, customDuration) => {
    try {
      const result = usersDb.grantAccess(userId, accessType, grantedById, customDuration || null);
      if (result.success) {
        auditLogsDb.logAction({ action: 'GRANT_ACCESS', entity_type: 'users', entity_id: userId, user_id: grantedById, user_name: 'admin', new_data: { accessType, customDuration: customDuration || null } });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:revokeAccess', (_, userId, adminId) => {
    try {
      const result = usersDb.revokeAccess(userId);
      if (result.success) {
        auditLogsDb.logAction({ action: 'REVOKE_ACCESS', entity_type: 'users', entity_id: userId, user_id: adminId, user_name: 'admin' });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:checkAccess', (_, userId) => {
    try { return { success: true, data: usersDb.checkUserAccess(userId) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('auth:logout', (_, token) => {
    try { usersDb.logout(token); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('auth:verify', (_, token) => {
    try {
      const user = usersDb.getUserByToken(token);
      if (!user) return { success: false, error: 'Sessiya etibarsızdır' };
      const { password_hash, ...safeUser } = user;
      return { success: true, data: safeUser };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:getAll', () => {
    try { return { success: true, data: usersDb.getAllUsers() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:create', (_, data) => {
    try {
      const user = usersDb.createUser(data);
      auditLogsDb.logAction({ action: 'CREATE_USER', entity_type: 'users', entity_id: user.id, user_name: 'admin', new_data: { username: user.username } });
      return { success: true, data: user };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:update', (_, id, data) => {
    try {
      const user = usersDb.updateUser(id, data);
      auditLogsDb.logAction({ action: 'UPDATE_USER', entity_type: 'users', entity_id: id, user_name: 'admin' });
      return { success: true, data: user };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('users:delete', (_, id) => {
    try {
      usersDb.deleteUser(id);
      auditLogsDb.logAction({ action: 'DELETE_USER', entity_type: 'users', entity_id: id, user_name: 'admin' });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Roles ─────────────────────────────────────────────────────────────────
  ipcMain.handle('roles:getAll', () => {
    try { return { success: true, data: rolesDb.getAllRoles() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('roles:updatePermissions', (_, id, permissions) => {
    try { return { success: true, data: rolesDb.updateRolePermissions(id, permissions) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Expenses ──────────────────────────────────────────────────────────────
  ipcMain.handle('expenses:getAll', (_, filters) => {
    try { return { success: true, data: expensesDb.getAllExpenses(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expenses:create', (_, data) => {
    try {
      const expense = expensesDb.createExpense(data);
      auditLogsDb.logAction({ action: 'CREATE_EXPENSE', entity_type: 'expenses', entity_id: expense.id, new_data: expense });
      return { success: true, data: expense };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expenses:update', (_, id, data) => {
    try { return { success: true, data: expensesDb.updateExpense(id, data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expenses:delete', (_, id) => {
    try {
      expensesDb.deleteExpense(id);
      auditLogsDb.logAction({ action: 'DELETE_EXPENSE', entity_type: 'expenses', entity_id: id });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expenses:stats', (_, startDate, endDate, userId) => {
    try { return { success: true, data: expensesDb.getExpenseStats(startDate, endDate, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('expenses:categories', () => {
    return { success: true, data: expensesDb.EXPENSE_CATEGORIES };
  });

  // ─── Notifications ─────────────────────────────────────────────────────────
  ipcMain.handle('notifications:getAll', (_, userId, limit) => {
    try { return { success: true, data: notificationsDb.getAllNotifications(userId, limit) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:unreadCount', (_, userId) => {
    try { return { success: true, data: notificationsDb.getUnreadCount(userId) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:create', (_, data) => {
    try { return { success: true, data: notificationsDb.createNotification(data) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:markRead', (_, id) => {
    try { notificationsDb.markAsRead(id); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:markAllRead', () => {
    try { notificationsDb.markAllAsRead(); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:delete', (_, id) => {
    try { return { success: true, data: notificationsDb.deleteNotification(id) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('notifications:check', (_, userId) => {
    try { return { success: true, data: notificationsDb.checkAndCreateSystemNotifications(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  ipcMain.handle('audit:getAll', (_, filters) => {
    try { return { success: true, data: auditLogsDb.getAllLogs(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('audit:log', (_, data) => {
    try { auditLogsDb.logAction(data); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('audit:clear', (_, daysOld) => {
    try { return { success: true, data: auditLogsDb.clearOldLogs(daysOld || 90) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── License ───────────────────────────────────────────────────────────────
  ipcMain.handle('license:status', () => {
    try { return { success: true, data: licensesDb.getLicenseStatus() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('license:activate', (_, key) => {
    try {
      const result = licensesDb.activateLicense(key);
      if (result.success) {
        auditLogsDb.logAction({ action: 'LICENSE_ACTIVATED', entity_type: 'licenses', user_name: 'admin', new_data: { key } });
      }
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('license:generateKey', () => {
    try { return { success: true, data: licensesDb.generateLicenseKey() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('license:machineId', () => {
    try { return { success: true, data: licensesDb.getMachineId() }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Appointments ─────────────────────────────────────────────────────────
  ipcMain.handle('appointments:list', (_, filters) => {
    try { return { success: true, data: appointmentsDb.getAllAppointments(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:get', (_, id) => {
    try {
      const item = appointmentsDb.getAppointmentById(id);
      if (!item) return { success: false, error: 'Tapılmadı' };
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:create', (_, data) => {
    try {
      const item = appointmentsDb.createAppointment(data);
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:update', (_, id, data) => {
    try {
      const item = appointmentsDb.updateAppointment(id, data);
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:delete', (_, id) => {
    try {
      appointmentsDb.deleteAppointment(id);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:upcoming', (_, days, userId) => {
    try { return { success: true, data: appointmentsDb.getUpcomingAppointments(days || 3, userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('appointments:customer', (_, customerId) => {
    try { return { success: true, data: appointmentsDb.getCustomerAppointments(customerId) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────
  ipcMain.handle('tasks:list', (_, filters) => {
    try { return { success: true, data: tasksDb.getAllTasks(filters || {}) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:get', (_, id) => {
    try {
      const item = tasksDb.getTaskById(id);
      if (!item) return { success: false, error: 'Tapılmadı' };
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:create', (_, data) => {
    try {
      const item = tasksDb.createTask(data);
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:update', (_, id, data) => {
    try {
      const item = tasksDb.updateTask(id, data);
      return { success: true, data: item };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:delete', (_, id) => {
    try {
      tasksDb.deleteTask(id);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:active', (_, userId) => {
    try { return { success: true, data: tasksDb.getActiveTasks(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:overdue', (_, userId) => {
    try { return { success: true, data: tasksDb.getOverdueTasks(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('tasks:stats', (_, userId) => {
    try { return { success: true, data: tasksDb.getTaskStats(userId || null) }; }
    catch (e) { return { success: false, error: e.message }; }
  });

  // ─── Finance Stats ─────────────────────────────────────────────────────────
  ipcMain.handle('finance:summary', (_, startDate, endDate, userId) => {
    try {
      const now = new Date();
      const start = startDate || `${now.getFullYear()}-01-01`;
      const end = endDate || now.toISOString().split('T')[0];

      const incomeStats = recordsDb.getAllTimeStats(userId || null);
      const expenseStats = expensesDb.getExpenseStats(start, end, userId || null);
      const salesStats = salesDb.getSalesStats(start, end, userId || null);

      const totalIncome = (incomeStats.revenue || 0) + (salesStats.total_revenue || 0);
      const totalExpenses = expenseStats.total || 0;
      const profit = totalIncome - totalExpenses;

      return {
        success: true,
        data: {
          income: totalIncome,
          expenses: totalExpenses,
          profit,
          salesRevenue: salesStats.total_revenue || 0,
          serviceRevenue: incomeStats.revenue || 0,
          expensesByCategory: expenseStats.byCategory || [],
          monthlyExpenses: expenseStats.monthly || [],
          debt: incomeStats.debt || 0,
        }
      };
    } catch (e) { return { success: false, error: e.message }; }
  });
}

module.exports = { registerHandlers };
