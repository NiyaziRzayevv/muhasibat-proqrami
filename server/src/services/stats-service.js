const { prisma } = require('../prisma');

// Helper: aggregate records/sales/expenses for a date range
async function _aggregateStats(dateFilter, userId) {
  const recWhere = dateFilter ? { date: dateFilter } : {};
  const saleWhere = dateFilter ? { date: dateFilter } : {};
  const expWhere = { deletedAt: null, ...(dateFilter ? { date: dateFilter } : {}) };
  if (userId) { recWhere.createdById = userId; saleWhere.createdById = userId; expWhere.userId = userId; }

  const [recAgg, saleAgg, expAgg] = await Promise.all([
    prisma.record.aggregate({ where: recWhere, _sum: { totalPrice: true, paidAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, paidAmount: true }, _count: true }),
    prisma.expense.aggregate({ where: expWhere, _sum: { amount: true }, _count: true }),
  ]);

  const recRevenue = recAgg._sum.totalPrice || 0;
  const recPaid = recAgg._sum.paidAmount || 0;
  const saleRevenue = saleAgg._sum.total || 0;
  const salePaid = saleAgg._sum.paidAmount || 0;
  const totalRevenue = recRevenue + saleRevenue;
  const totalPaid = recPaid + salePaid;
  const totalExpense = expAgg._sum.amount || 0;

  return {
    revenue: totalRevenue,
    total: totalRevenue,
    total_amount: totalRevenue,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    count: recAgg._count + saleAgg._count,
    record_count: recAgg._count,
    sale_count: saleAgg._count,
    expense_total: totalExpense,
    expense_count: expAgg._count,
    profit: totalRevenue - totalExpense,
    debt: totalRevenue - totalPaid,
    records_revenue: recRevenue,
    sales_revenue: saleRevenue,
  };
}

async function getTodayStats(userId = null) {
  const today = new Date().toISOString().split('T')[0];
  return _aggregateStats({ equals: today }, userId);
}

async function getMonthStats(year, month, userId = null) {
  const monthStr = String(month).padStart(2, '0');
  return _aggregateStats({ gte: `${year}-${monthStr}-01`, lte: `${year}-${monthStr}-31` }, userId);
}

async function getAllTimeStats(userId = null) {
  return _aggregateStats(null, userId);
}

async function getTopServices(limit = 8, userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const grouped = await prisma.record.groupBy({
    by: ['serviceType'],
    where,
    _count: true,
    _sum: { totalPrice: true },
    orderBy: { _count: { serviceType: 'desc' } },
    take: limit,
  });

  return grouped.map(g => ({
    service_type: g.serviceType || 'Digər',
    name: g.serviceType || 'Digər',
    count: g._count,
    total: g._sum.totalPrice || 0,
  }));
}

async function getTopBrands(limit = 8, userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const grouped = await prisma.record.groupBy({
    by: ['carBrand'],
    where,
    _count: true,
    _sum: { totalPrice: true },
    orderBy: { _count: { carBrand: 'desc' } },
    take: limit,
  });

  return grouped.map(g => ({
    car_brand: g.carBrand || 'Digər',
    name: g.carBrand || 'Digər',
    count: g._count,
    total: g._sum.totalPrice || 0,
  }));
}

async function getMonthlyChart(year, userId = null) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const where = { date: { gte: startDate, lte: endDate } };
  if (userId) where.createdById = userId;

  const records = await prisma.record.findMany({
    where,
    select: { date: true, totalPrice: true },
  });

  const buckets = {};
  for (const r of records) {
    const m = (r.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, total: 0, count: 0 };
    buckets[m].total += r.totalPrice || 0;
    buckets[m].count += 1;
  }

  const result = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    result.push(buckets[m] || { month: m, total: 0, count: 0 });
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

  const products = await prisma.product.findMany({
    where,
    select: { id: true, name: true, stockQty: true, minStock: true, unit: true, buyPrice: true, sellPrice: true },
  });

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
    select: { stockQty: true, buyPrice: true, sellPrice: true },
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
  const where = {};
  if (startDate && endDate) where.date = { gte: startDate, lte: endDate };
  else if (startDate) where.date = { gte: startDate };
  else if (endDate) where.date = { lte: endDate };
  if (userId) where.createdById = userId;

  const agg = await prisma.sale.aggregate({
    where,
    _sum: { total: true, paidAmount: true },
    _count: true,
  });

  const totalAmount = agg._sum.total || 0;
  const totalPaid = agg._sum.paidAmount || 0;

  return {
    revenue: totalAmount,
    total_amount: totalAmount,
    total_paid: totalPaid,
    count: agg._count,
    sale_count: agg._count,
    debt: totalAmount - totalPaid,
  };
}

async function getMonthlyRevenue(year, userId = null) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const recWhere = { date: { gte: startDate, lte: endDate } };
  const saleWhere = { date: { gte: startDate, lte: endDate } };
  if (userId) { recWhere.createdById = userId; saleWhere.createdById = userId; }

  const [records, sales] = await Promise.all([
    prisma.record.findMany({ where: recWhere, select: { date: true, totalPrice: true } }),
    prisma.sale.findMany({ where: saleWhere, select: { date: true, total: true } }),
  ]);

  const buckets = {};
  for (const r of records) {
    const m = (r.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, records: 0, sales: 0, total: 0 };
    buckets[m].records += r.totalPrice || 0;
    buckets[m].total += r.totalPrice || 0;
  }
  for (const s of sales) {
    const m = (s.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, records: 0, sales: 0, total: 0 };
    buckets[m].sales += s.total || 0;
    buckets[m].total += s.total || 0;
  }

  const result = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    result.push(buckets[m] || { month: m, records: 0, sales: 0, total: 0 });
  }
  return result;
}

async function getYearlyRevenue(userId = null) {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear - 4}-01-01`;
  const endDate = `${currentYear}-12-31`;

  const recWhere = { date: { gte: startDate, lte: endDate } };
  const saleWhere = { date: { gte: startDate, lte: endDate } };
  if (userId) { recWhere.createdById = userId; saleWhere.createdById = userId; }

  const [records, sales] = await Promise.all([
    prisma.record.findMany({ where: recWhere, select: { date: true, totalPrice: true } }),
    prisma.sale.findMany({ where: saleWhere, select: { date: true, total: true } }),
  ]);

  const buckets = {};
  for (const r of records) {
    const y = parseInt((r.date || '').slice(0, 4));
    if (!y) continue;
    if (!buckets[y]) buckets[y] = { year: y, records: 0, sales: 0, total: 0 };
    buckets[y].records += r.totalPrice || 0;
    buckets[y].total += r.totalPrice || 0;
  }
  for (const s of sales) {
    const y = parseInt((s.date || '').slice(0, 4));
    if (!y) continue;
    if (!buckets[y]) buckets[y] = { year: y, records: 0, sales: 0, total: 0 };
    buckets[y].sales += s.total || 0;
    buckets[y].total += s.total || 0;
  }

  const result = [];
  for (let y = currentYear - 4; y <= currentYear; y++) {
    result.push(buckets[y] || { year: y, records: 0, sales: 0, total: 0 });
  }
  return result;
}

async function getDebtStats(userId = null) {
  const recWhere = userId ? { createdById: userId } : {};
  const saleWhere = userId ? { createdById: userId } : {};

  const [recAgg, saleAgg, recDebtCount, saleDebtCount] = await Promise.all([
    prisma.record.aggregate({ where: recWhere, _sum: { totalPrice: true, paidAmount: true } }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, paidAmount: true } }),
    prisma.record.count({ where: { ...recWhere, remainingAmount: { gt: 0 } } }),
    prisma.sale.count({ where: { ...saleWhere, paymentStatus: { in: ['gozleyir', 'qismen', 'borc'] } } }),
  ]);

  const recTotal = recAgg._sum.totalPrice || 0;
  const recPaid = recAgg._sum.paidAmount || 0;
  const saleTotal = saleAgg._sum.total || 0;
  const salePaid = saleAgg._sum.paidAmount || 0;
  const recordPending = Math.max(0, recTotal - recPaid);
  const salePending = Math.max(0, saleTotal - salePaid);
  const totalDebt = recordPending + salePending;

  return {
    paid: recPaid + salePaid,
    pending: totalDebt,
    debt: totalDebt,
    record_debt: recordPending,
    sale_debt: salePending,
    total_debt: totalDebt,
    record_count: recDebtCount,
    sale_count: saleDebtCount,
  };
}

async function getProductStats(userId = null) {
  const where = {};
  if (userId) where.createdById = userId;

  const [totalProducts, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: { stockQty: true, minStock: true } }),
  ]);

  const totalStock = products.reduce((sum, p) => sum + (p.stockQty || 0), 0);
  const lowStock = products.filter(p => (p.stockQty || 0) <= (p.minStock || 5)).length;

  return {
    total_products: totalProducts,
    total_stock: totalStock,
    low_stock_count: lowStock,
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

  const [agg, expenses] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.expense.findMany({ where, select: { category: true, amount: true, date: true } }),
  ]);

  const totalAmount = agg._sum.amount || 0;

  const byCategoryMap = {};
  const monthlyMap = {};
  for (const e of expenses) {
    const cat = e.category || 'Digər';
    if (!byCategoryMap[cat]) byCategoryMap[cat] = { category: cat, total: 0, count: 0 };
    byCategoryMap[cat].total += e.amount || 0;
    byCategoryMap[cat].count += 1;

    const m = (e.date || '').slice(0, 7);
    if (m) {
      if (!monthlyMap[m]) monthlyMap[m] = { month: m, total: 0 };
      monthlyMap[m].total += e.amount || 0;
    }
  }

  return {
    total: totalAmount,
    total_amount: totalAmount,
    count: agg._count,
    expense_count: agg._count,
    byCategory: Object.values(byCategoryMap).sort((a, b) => (b.total || 0) - (a.total || 0)),
    monthly: Object.values(monthlyMap).sort((a, b) => String(a.month).localeCompare(String(b.month))),
  };
}

async function getUnreadNotificationCount(userId = null) {
  const where = { isRead: false };
  if (userId) where.userId = userId;
  return await prisma.notification.count({ where });
}

async function getFinanceStats(startDate, endDate, userId = null) {
  const dateFilter = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;
  const hasDate = Object.keys(dateFilter).length > 0;

  const recWhere = hasDate ? { date: dateFilter } : {};
  const saleWhere = hasDate ? { date: dateFilter } : {};
  const expWhere = { deletedAt: null, ...(hasDate ? { date: dateFilter } : {}) };
  if (userId) { recWhere.createdById = userId; saleWhere.createdById = userId; expWhere.userId = userId; }

  const [recAgg, saleAgg, expAgg, expenses] = await Promise.all([
    prisma.record.aggregate({ where: recWhere, _sum: { totalPrice: true, paidAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, paidAmount: true }, _count: true }),
    prisma.expense.aggregate({ where: expWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.findMany({ where: expWhere, select: { category: true, amount: true } }),
  ]);

  const recRevenue = recAgg._sum.totalPrice || 0;
  const recPaid = recAgg._sum.paidAmount || 0;
  const saleRevenue = saleAgg._sum.total || 0;
  const salePaid = saleAgg._sum.paidAmount || 0;
  const totalIncome = recRevenue + saleRevenue;
  const totalPaid = recPaid + salePaid;
  const totalExpense = expAgg._sum.amount || 0;
  const totalDebt = totalIncome - totalPaid;
  const netProfit = totalIncome - totalExpense;

  const expByCat = {};
  for (const e of expenses) {
    const cat = e.category || 'Digər';
    if (!expByCat[cat]) expByCat[cat] = { category: cat, total: 0, count: 0 };
    expByCat[cat].total += e.amount || 0;
    expByCat[cat].count++;
  }

  return {
    total_income: totalIncome,
    records_income: recRevenue,
    sales_income: saleRevenue,
    total_paid: totalPaid,
    total_expense: totalExpense,
    total_debt: totalDebt,
    receivable: totalDebt,
    net_profit: netProfit,
    record_count: recAgg._count,
    sale_count: saleAgg._count,
    expense_count: expAgg._count,
    expense_by_category: Object.values(expByCat).sort((a, b) => b.total - a.total),
  };
}

async function getDashboardStats(userId = null) {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const monthStart = `${year}-${monthStr}-01`;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [
    todayStats,
    monthStats,
    allTimeStats,
    debtStats,
    customerCount,
    productStats,
    lowStock,
    stockValue,
    topServices,
    topBrands,
    monthlyChart,
    todaySales,
    monthlyRevenue,
    todayExpenses,
    monthExpenses,
    upcomingAppointments,
    activeTasks,
    overdueTasks,
    unreadNotifs,
    taskTodo,
    taskInProgress,
    taskDone,
  ] = await Promise.all([
    getTodayStats(userId),
    getMonthStats(year, month, userId),
    getAllTimeStats(userId),
    getDebtStats(userId),
    getCustomerCount(userId),
    getProductStats(userId),
    getLowStockProducts(userId),
    getStockValue(userId),
    getTopServices(8, userId),
    getTopBrands(8, userId),
    getMonthlyChart(year, userId),
    getSalesStats(today, today, userId),
    getMonthlyRevenue(year, userId),
    getExpenseStats(today, today, userId),
    getExpenseStats(monthStart, today, userId),
    prisma.appointment.findMany({
      where: { date: { gte: today, lte: tomorrow }, status: { in: ['pending', 'confirmed'] } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 10,
    }),
    prisma.task.findMany({
      where: { status: { not: 'done' }, ...(userId ? { createdById: userId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.task.count({
      where: { status: { not: 'done' }, dueDate: { not: null, lt: today }, ...(userId ? { createdById: userId } : {}) },
    }),
    getUnreadNotificationCount(userId),
    prisma.task.count({ where: { status: 'todo', ...(userId ? { createdById: userId } : {}) } }),
    prisma.task.count({ where: { status: 'in_progress', ...(userId ? { createdById: userId } : {}) } }),
    prisma.task.count({ where: { status: 'done', ...(userId ? { createdById: userId } : {}) } }),
  ]);

  return {
    today: todayStats,
    month: monthStats,
    allTime: allTimeStats,
    debt: debtStats,
    customer_count: customerCount,
    products: productStats,
    low_stock: lowStock,
    stock_value: stockValue,
    top_services: topServices,
    top_brands: topBrands,
    monthly_chart: monthlyChart,
    today_sales: todaySales,
    monthly_revenue: monthlyRevenue,
    today_expenses: todayExpenses,
    month_expenses: monthExpenses,
    upcoming_appointments: upcomingAppointments.map(a => ({
      id: a.id, title: a.title, date: a.date, time: a.time,
      customer_name: a.customerName, status: a.status,
    })),
    active_tasks: activeTasks.map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      due_date: t.dueDate,
    })),
    overdue_task_count: overdueTasks,
    unread_notifications: unreadNotifs,
    task_stats: { todo: taskTodo, in_progress: taskInProgress, done: taskDone },
  };
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
  getUnreadNotificationCount,
  getFinanceStats,
  getDashboardStats,
};
