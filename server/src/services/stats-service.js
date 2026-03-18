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

  const grouped = await prisma.record.groupBy({
    by: ['date'],
    where,
    _sum: { totalPrice: true },
    _count: true,
  });

  const buckets = {};
  for (const g of grouped) {
    const m = (g.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, total: 0, count: 0 };
    buckets[m].total += g._sum.totalPrice || 0;
    buckets[m].count += g._count;
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
  const where = { stockQty: { lte: prisma.product.fields?.minStock ?? 0 } };
  if (userId) where.createdById = userId;

  // Use raw query for efficient low-stock filter at DB level
  const userFilter = userId ? `AND "createdById" = ${parseInt(userId)}` : '';
  const products = await prisma.$queryRawUnsafe(`
    SELECT id, name, "stockQty", "minStock", unit, "buyPrice", "sellPrice"
    FROM "Product"
    WHERE COALESCE("stockQty", 0) <= COALESCE("minStock", 0) ${userFilter}
    ORDER BY "stockQty" ASC
    LIMIT 10
  `);

  return products.map(p => ({
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
  const userFilter = userId ? `WHERE "createdById" = ${parseInt(userId)}` : '';
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total_products,
      COALESCE(SUM("stockQty"), 0)::float AS total_units,
      COALESCE(SUM("stockQty" * "buyPrice"), 0)::float AS cost_value,
      COALESCE(SUM("stockQty" * "sellPrice"), 0)::float AS sell_value
    FROM "Product" ${userFilter}
  `);
  const r = rows[0] || {};
  return {
    buy_value: r.cost_value || 0,
    cost_value: r.cost_value || 0,
    sell_value: r.sell_value || 0,
    total_products: r.total_products || 0,
    total_units: r.total_units || 0,
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

  const [recGrouped, saleGrouped] = await Promise.all([
    prisma.record.groupBy({ by: ['date'], where: recWhere, _sum: { totalPrice: true } }),
    prisma.sale.groupBy({ by: ['date'], where: saleWhere, _sum: { total: true } }),
  ]);

  const buckets = {};
  for (const g of recGrouped) {
    const m = (g.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, records: 0, sales: 0, total: 0 };
    buckets[m].records += g._sum.totalPrice || 0;
    buckets[m].total += g._sum.totalPrice || 0;
  }
  for (const g of saleGrouped) {
    const m = (g.date || '').slice(5, 7);
    if (!m) continue;
    if (!buckets[m]) buckets[m] = { month: m, records: 0, sales: 0, total: 0 };
    buckets[m].sales += g._sum.total || 0;
    buckets[m].total += g._sum.total || 0;
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

  const [recGrouped, saleGrouped] = await Promise.all([
    prisma.record.groupBy({ by: ['date'], where: recWhere, _sum: { totalPrice: true } }),
    prisma.sale.groupBy({ by: ['date'], where: saleWhere, _sum: { total: true } }),
  ]);

  const buckets = {};
  for (const g of recGrouped) {
    const y = parseInt((g.date || '').slice(0, 4));
    if (!y) continue;
    if (!buckets[y]) buckets[y] = { year: y, records: 0, sales: 0, total: 0 };
    buckets[y].records += g._sum.totalPrice || 0;
    buckets[y].total += g._sum.totalPrice || 0;
  }
  for (const g of saleGrouped) {
    const y = parseInt((g.date || '').slice(0, 4));
    if (!y) continue;
    if (!buckets[y]) buckets[y] = { year: y, records: 0, sales: 0, total: 0 };
    buckets[y].sales += g._sum.total || 0;
    buckets[y].total += g._sum.total || 0;
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
  const userFilter = userId ? `WHERE "createdById" = ${parseInt(userId)}` : '';
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total_products,
      COALESCE(SUM("stockQty"), 0)::float AS total_stock,
      COUNT(*) FILTER (WHERE COALESCE("stockQty", 0) <= COALESCE("minStock", 5))::int AS low_stock_count
    FROM "Product" ${userFilter}
  `);
  const r = rows[0] || {};
  return {
    total_products: r.total_products || 0,
    total_stock: r.total_stock || 0,
    low_stock_count: r.low_stock_count || 0,
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

  const [agg, byCatGrouped] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: true }),
  ]);

  const totalAmount = agg._sum.amount || 0;

  const byCategory = byCatGrouped.map(g => ({
    category: g.category || 'Digər',
    total: g._sum.amount || 0,
    count: g._count,
  })).sort((a, b) => b.total - a.total);

  return {
    total: totalAmount,
    total_amount: totalAmount,
    count: agg._count,
    expense_count: agg._count,
    byCategory,
    monthly: [],
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

  const [recAgg, saleAgg, expAgg, expByCatGrouped] = await Promise.all([
    prisma.record.aggregate({ where: recWhere, _sum: { totalPrice: true, paidAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, paidAmount: true }, _count: true }),
    prisma.expense.aggregate({ where: expWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ['category'], where: expWhere, _sum: { amount: true }, _count: true }),
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
  for (const g of expByCatGrouped) {
    const cat = g.category || 'Digər';
    expByCat[cat] = { category: cat, total: g._sum.amount || 0, count: g._count };
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

// In-memory cache: 30 seconds TTL
const _dashCache = new Map();
const CACHE_TTL = 30000;

async function getDashboardStats(userId = null) {
  const cacheKey = `dash_${userId || 'all'}`;
  const cached = _dashCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const start = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const monthStart = `${year}-${monthStr}-01`;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const userWhere = userId ? { createdById: userId } : {};

  // Batch 1: All aggregate queries (fast, no findMany)
  const [
    todayStats,
    monthStats,
    allTimeStats,
    debtStats,
    customerCount,
    productStats,
    stockValue,
    todaySales,
    todayExpenses,
    monthExpenses,
    unreadNotifs,
  ] = await Promise.all([
    getTodayStats(userId),
    getMonthStats(year, month, userId),
    getAllTimeStats(userId),
    getDebtStats(userId),
    getCustomerCount(userId),
    getProductStats(userId),
    getStockValue(userId),
    getSalesStats(today, today, userId),
    getExpenseStats(today, today, userId),
    getExpenseStats(monthStart, today, userId),
    getUnreadNotificationCount(userId),
  ]);

  // Batch 2: groupBy + findMany queries
  const [
    lowStock,
    topServices,
    topBrands,
    monthlyChart,
    monthlyRevenue,
    upcomingAppointments,
    activeTasks,
    overdueTasks,
    taskTodo,
    taskInProgress,
    taskDone,
  ] = await Promise.all([
    getLowStockProducts(userId),
    getTopServices(8, userId),
    getTopBrands(8, userId),
    getMonthlyChart(year, userId),
    getMonthlyRevenue(year, userId),
    prisma.appointment.findMany({
      where: { date: { gte: today, lte: tomorrow }, status: { in: ['pending', 'confirmed'] } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 10,
    }),
    prisma.task.findMany({
      where: { status: { not: 'done' }, ...userWhere },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.task.count({
      where: { status: { not: 'done' }, dueDate: { not: null, lt: today }, ...userWhere },
    }),
    prisma.task.count({ where: { status: 'todo', ...userWhere } }),
    prisma.task.count({ where: { status: 'in_progress', ...userWhere } }),
    prisma.task.count({ where: { status: 'done', ...userWhere } }),
  ]);

  console.log(`[stats] Dashboard loaded in ${Date.now() - start}ms`);

  const data = {
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

  _dashCache.set(cacheKey, { data, ts: Date.now() });
  return data;
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
