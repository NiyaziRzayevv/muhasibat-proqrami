const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapTx(t) {
  if (!t) return t;
  return {
    ...t,
    ref_type: t.refType,
    ref_id: t.refId,
    payment_method: t.paymentMethod,
    created_by_id: t.createdById,
    created_at: t.createdAt,
  };
}

// GET all finance transactions
router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const { type, startDate, endDate, category, userId, limit, offset } = req.query;
    const where = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (userId) where.createdById = parseInt(userId);
    if (startDate && endDate) where.date = { gte: startDate, lte: endDate };

    const rows = await prisma.financeTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 200,
      skip: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, data: rows.map(mapTx) });
  } catch (err) { next(err); }
});

// CREATE manual finance transaction (income or expense)
router.post('/transactions', requireAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.type || !b.amount) return res.status(400).json({ success: false, error: 'validation_error' });

    const row = await prisma.financeTransaction.create({
      data: {
        date: b.date || new Date().toISOString().split('T')[0],
        type: b.type, // 'income' or 'expense'
        category: b.category || null,
        amount: Number(b.amount),
        description: b.description || null,
        refType: b.ref_type || b.refType || null,
        refId: b.ref_id || b.refId || null,
        paymentMethod: b.payment_method || b.paymentMethod || 'cash',
        createdById: req.user.id,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'finance_transaction',
        entityId: row.id,
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
        newData: { type: row.type, amount: row.amount, category: row.category },
      }
    });

    res.json({ success: true, data: mapTx(row) });
  } catch (err) { next(err); }
});

// DELETE finance transaction
router.delete('/transactions/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.financeTransaction.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'delete',
        entityType: 'finance_transaction',
        entityId: id,
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
      }
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET finance summary (enhanced — includes finance_transactions + records + sales + expenses)
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    const hasDate = Object.keys(dateFilter).length > 0;

    const recWhere = hasDate ? { date: dateFilter } : {};
    const saleWhere = hasDate ? { date: dateFilter } : {};
    const expWhere = { deletedAt: null, ...(hasDate ? { date: dateFilter } : {}) };
    const ftWhere = hasDate ? { date: dateFilter } : {};
    if (userId) {
      const uid = parseInt(userId);
      recWhere.createdById = uid;
      saleWhere.createdById = uid;
      expWhere.userId = uid;
      ftWhere.createdById = uid;
    }

    const [records, sales, expenses, finTx] = await Promise.all([
      prisma.record.findMany({ where: recWhere }),
      prisma.sale.findMany({ where: saleWhere }),
      prisma.expense.findMany({ where: expWhere }),
      prisma.financeTransaction.findMany({ where: ftWhere }),
    ]);

    const recRevenue = records.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const recPaid = records.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const saleRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
    const salePaid = sales.reduce((s, r) => s + (r.paidAmount || 0), 0);

    const manualIncome = finTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const manualExpense = finTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    const totalIncome = recRevenue + saleRevenue + manualIncome;
    const totalPaid = recPaid + salePaid + manualIncome; // manual income counted as collected
    const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0) + manualExpense;
    const totalDebt = (recRevenue + saleRevenue) - (recPaid + salePaid);
    const netProfit = totalIncome - totalExpense;
    const cashBalance = totalPaid - totalExpense;

    // Expense by category
    const expByCat = {};
    for (const e of expenses) {
      const cat = e.category || 'Digər';
      if (!expByCat[cat]) expByCat[cat] = { category: cat, total: 0, count: 0 };
      expByCat[cat].total += e.amount || 0;
      expByCat[cat].count++;
    }
    for (const t of finTx.filter(t => t.type === 'expense')) {
      const cat = t.category || 'Digər';
      if (!expByCat[cat]) expByCat[cat] = { category: cat, total: 0, count: 0 };
      expByCat[cat].total += t.amount || 0;
      expByCat[cat].count++;
    }

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        records_income: recRevenue,
        sales_income: saleRevenue,
        manual_income: manualIncome,
        total_paid: totalPaid,
        total_expense: totalExpense,
        manual_expense: manualExpense,
        total_debt: totalDebt,
        receivable: totalDebt,
        net_profit: netProfit,
        cash_balance: cashBalance,
        record_count: records.length,
        sale_count: sales.length,
        expense_count: expenses.length,
        transaction_count: finTx.length,
        expense_by_category: Object.values(expByCat).sort((a, b) => b.total - a.total),
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
