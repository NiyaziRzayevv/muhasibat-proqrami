const { prisma } = require('../prisma');

async function getTodayStats(userId = null) {
  const today = new Date().toISOString().split('T')[0];
  
  const where = { date: today };
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({ where });
  
  const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const recordCount = records.length;

  return {
    revenue: totalRevenue,
    total: totalRevenue,
    total_amount: totalRevenue,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    count: recordCount,
    record_count: recordCount,
    debt: totalRevenue - totalPaid
  };
}

async function getMonthStats(year, month, userId = null) {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-31`;

  const where = {
    date: { gte: startDate, lte: endDate }
  };
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({ where });

  const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const recordCount = records.length;

  return {
    revenue: totalRevenue,
    total: totalRevenue,
    total_amount: totalRevenue,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    count: recordCount,
    record_count: recordCount,
    debt: totalRevenue - totalPaid
  };
}

async function getAllTimeStats(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({ where });

  const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const recordCount = records.length;

  return {
    revenue: totalRevenue,
    total: totalRevenue,
    total_amount: totalRevenue,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    count: recordCount,
    record_count: recordCount,
    debt: totalRevenue - totalPaid
  };
}

async function getTopServices(limit = 8, userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({
    where,
    select: { serviceType: true, totalPrice: true }
  });

  const serviceMap = {};
  for (const r of records) {
    const svc = r.serviceType || 'Digər';
    if (!serviceMap[svc]) serviceMap[svc] = { service_type: svc, name: svc, count: 0, total: 0 };
    serviceMap[svc].count++;
    serviceMap[svc].total += r.totalPrice || 0;
  }

  return Object.values(serviceMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function getTopBrands(limit = 8, userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({
    where,
    select: { carBrand: true, totalPrice: true }
  });

  const brandMap = {};
  for (const r of records) {
    const brand = r.carBrand || 'Digər';
    if (!brandMap[brand]) brandMap[brand] = { car_brand: brand, name: brand, count: 0, total: 0 };
    brandMap[brand].count++;
    brandMap[brand].total += r.totalPrice || 0;
  }

  return Object.values(brandMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function getMonthlyChart(year, userId = null) {
  const result = [];
  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const where = { date: { gte: startDate, lte: endDate } };
    if (userId) where.createdById = userId;

    const records = await prisma.record.findMany({ where });
    const total = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    
    result.push({ month: monthStr, total, count: records.length });
  }
  return result;
}

async function getCustomerCount(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;
  return await prisma.customer.count({ where });
}

async function getLowStockProducts(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const products = await prisma.product.findMany({ where });
  return products
    .filter((p) => (p.stockQty || 0) <= (p.minStock || 0))
    .sort((a, b) => (a.stockQty || 0) - (b.stockQty || 0))
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      name: p.name,
      stock_qty: p.stockQty,
      min_stock: p.minStock,
      unit: p.unit,
      buy_price: p.buyPrice,
      sell_price: p.sellPrice,
    }));
}

async function getStockValue(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const products = await prisma.product.findMany({
    where,
    select: { stockQty: true, buyPrice: true, sellPrice: true }
  });

  const costValue = products.reduce((sum, p) => sum + ((p.stockQty || 0) * (p.buyPrice || 0)), 0);
  const sellValue = products.reduce((sum, p) => sum + ((p.stockQty || 0) * (p.sellPrice || 0)), 0);
  const totalUnits = products.reduce((sum, p) => sum + (p.stockQty || 0), 0);

  return {
    buy_value: costValue,
    cost_value: costValue,
    sell_value: sellValue,
    total_products: products.length,
    total_units: totalUnits,
  };
}

async function getSalesStats(startDate, endDate, userId = null) {
  const where = { date: { gte: startDate, lte: endDate } };
  if (userId) where.createdById = userId;

  const sales = await prisma.sale.findMany({ where });
  
  const totalAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  
  return {
    revenue: totalAmount,
    total_amount: totalAmount,
    total_paid: totalPaid,
    count: sales.length,
    sale_count: sales.length,
    debt: totalAmount - totalPaid
  };
}

async function getMonthlyRevenue(year, userId = null) {
  const result = [];
  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const recordWhere = { date: { gte: startDate, lte: endDate } };
    const saleWhere = { date: { gte: startDate, lte: endDate } };
    if (userId) {
      recordWhere.createdById = userId;
      saleWhere.createdById = userId;
    }

    const records = await prisma.record.findMany({ where: recordWhere });
    const sales = await prisma.sale.findMany({ where: saleWhere });
    
    const recordTotal = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const saleTotal = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    result.push({ month: monthStr, records: recordTotal, sales: saleTotal, total: recordTotal + saleTotal });
  }
  return result;
}

async function getYearlyRevenue(userId = null) {
  const currentYear = new Date().getFullYear();
  const result = [];
  
  for (let year = currentYear - 4; year <= currentYear; year++) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const recordWhere = { date: { gte: startDate, lte: endDate } };
    const saleWhere = { date: { gte: startDate, lte: endDate } };
    if (userId) {
      recordWhere.createdById = userId;
      saleWhere.createdById = userId;
    }

    const records = await prisma.record.findMany({ where: recordWhere });
    const sales = await prisma.sale.findMany({ where: saleWhere });
    
    const recordTotal = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const saleTotal = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    result.push({ year, records: recordTotal, sales: saleTotal, total: recordTotal + saleTotal });
  }
  return result;
}

async function getDebtStats(userId = null) {
  const userFilter = userId ? { createdById: userId } : {};

  const allRecords = await prisma.record.findMany({ where: userFilter });
  const allSales = await prisma.sale.findMany({ where: userFilter });

  const totalPaid = allRecords.reduce((s, r) => s + (r.paidAmount || 0), 0)
    + allSales.reduce((s, x) => s + (x.paidAmount || 0), 0);

  const recordPending = allRecords.reduce((s, r) => s + Math.max(0, (r.totalPrice || 0) - (r.paidAmount || 0)), 0);
  const salePending = allSales.reduce((s, x) => s + Math.max(0, (x.total || 0) - (x.paidAmount || 0)), 0);
  const totalDebt = recordPending + salePending;

  return {
    paid: totalPaid,
    pending: totalDebt,
    debt: totalDebt,
    record_debt: recordPending,
    sale_debt: salePending,
    total_debt: totalDebt,
    record_count: allRecords.filter(r => (r.totalPrice || 0) > (r.paidAmount || 0)).length,
    sale_count: allSales.filter(s => (s.total || 0) > (s.paidAmount || 0)).length
  };
}

async function getProductStats(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const products = await prisma.product.findMany({ where });
  
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stockQty || 0), 0);
  const lowStock = products.filter(p => (p.stockQty || 0) <= (p.minStock || 5)).length;
  
  return {
    total_products: totalProducts,
    total_stock: totalStock,
    low_stock_count: lowStock
  };
}

async function getExpenseStats(startDate, endDate, userId = null) {
  const where = { deletedAt: null };
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }
  if (userId) where.userId = userId;

  const expenses = await prisma.expense.findMany({ where });
  
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const byCategoryMap = {};
  for (const e of expenses) {
    const cat = e.category || 'Digər';
    if (!byCategoryMap[cat]) byCategoryMap[cat] = { category: cat, total: 0, count: 0 };
    byCategoryMap[cat].total += e.amount || 0;
    byCategoryMap[cat].count += 1;
  }
  const byCategory = Object.values(byCategoryMap).sort((a, b) => (b.total || 0) - (a.total || 0));

  const monthlyMap = {};
  for (const e of expenses) {
    const m = (e.date || '').slice(0, 7);
    if (!m) continue;
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, total: 0 };
    monthlyMap[m].total += e.amount || 0;
  }
  const monthly = Object.values(monthlyMap).sort((a, b) => String(a.month).localeCompare(String(b.month)));

  return {
    total: totalAmount,
    total_amount: totalAmount,
    count: expenses.length,
    expense_count: expenses.length,
    byCategory,
    monthly,
  };
}

async function getUnreadNotificationCount(userId = null) {
  const where = { isRead: false };
  if (userId) where.userId = userId;
  return await prisma.notification.count({ where });
}

module.exports = {
  getTodayStats,
  getMonthStats,
  getAllTimeStats,
  getTopServices,
  getTopBrands,
  getMonthlyChart,
  getCustomerCount,
  getLowStockProducts,
  getStockValue,
  getSalesStats,
  getMonthlyRevenue,
  getYearlyRevenue,
  getDebtStats,
  getProductStats,
  getExpenseStats,
  getUnreadNotificationCount
};
