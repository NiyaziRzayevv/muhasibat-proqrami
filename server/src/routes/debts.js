const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

// GET all debts (records + sales with remaining balance)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { userId, search, type } = req.query;
    const userFilter = userId ? { createdById: parseInt(userId) } : {};

    const recWhere = { ...userFilter, remainingAmount: { gt: 0 } };
    const saleWhere = { ...userFilter, paymentStatus: { in: ['gozleyir', 'qismen', 'borc'] } };
    if (search) {
      const s = search.toLowerCase();
      recWhere.OR = [
        { customerName: { contains: s, mode: 'insensitive' } },
        { carPlate: { contains: s, mode: 'insensitive' } },
        { serviceType: { contains: s, mode: 'insensitive' } },
      ];
      saleWhere.customerName = { contains: s, mode: 'insensitive' };
    }

    const [records, sales] = await Promise.all([
      (!type || type === 'record') ? prisma.record.findMany({
        where: recWhere,
        include: { customer: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }) : Promise.resolve([]),
      (!type || type === 'sale') ? prisma.sale.findMany({
        where: saleWhere,
        include: { items: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }) : Promise.resolve([]),
    ]);

    const debts = [];

    for (const r of records) {
      const total = r.totalPrice || 0;
      const paid = r.paidAmount || 0;
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) continue;

      debts.push({
        id: `record_${r.id}`,
        debt_type: 'record',
        debt_id: r.id,
        date: r.date,
        customer_id: r.customerId,
        customer_name: r.customerName || r.customer?.name || null,
        customer_phone: r.customerPhone || r.customer?.phone || null,
        description: r.serviceType || 'Servis',
        ref_number: `SRV-${r.id}`,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: paid <= 0 ? 'borc' : 'qismen',
        notes: r.notes,
        created_at: r.createdAt,
      });
    }

    for (const s of sales) {
      const total = s.total || 0;
      const paid = s.paidAmount || 0;
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) continue;

      debts.push({
        id: `sale_${s.id}`,
        debt_type: 'sale',
        debt_id: s.id,
        date: s.date,
        customer_id: s.customerId,
        customer_name: s.customerName || null,
        customer_phone: null,
        description: `Satış #${s.id} (${(s.items || []).length} məhsul)`,
        ref_number: `SAT-${s.id}`,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: paid <= 0 ? 'borc' : 'qismen',
        notes: s.notes,
        created_at: s.createdAt,
      });
    }

    // Sort by date desc
    debts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: debts });
  } catch (err) { next(err); }
});

// POST debt payment — atomic: updates record/sale + creates debt_payment + finance_transaction + audit_log
router.post('/pay', requireAuth, async (req, res, next) => {
  try {
    const { debt_type, debt_id, amount, payment_method, notes } = req.body || {};
    if (!debt_type || !debt_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const payAmount = Number(amount);
    const today = new Date().toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx) => {
      let entity, newPaid, newStatus, entityTotal;

      if (debt_type === 'record') {
        entity = await tx.record.findUnique({ where: { id: parseInt(debt_id) } });
        if (!entity) throw new Error('Qeyd tapılmadı');
        entityTotal = entity.totalPrice || 0;
        newPaid = Math.min(entityTotal, (entity.paidAmount || 0) + payAmount);
        const remaining = Math.max(0, entityTotal - newPaid);
        newStatus = remaining <= 0 ? 'odenilib' : (newPaid > 0 ? 'qismen' : 'borc');

        await tx.record.update({
          where: { id: entity.id },
          data: {
            paidAmount: newPaid,
            remainingAmount: remaining,
            paymentStatus: newStatus,
          }
        });
      } else if (debt_type === 'sale') {
        entity = await tx.sale.findUnique({ where: { id: parseInt(debt_id) } });
        if (!entity) throw new Error('Satış tapılmadı');
        entityTotal = entity.total || 0;
        newPaid = Math.min(entityTotal, (entity.paidAmount || 0) + payAmount);
        newStatus = newPaid >= entityTotal ? 'odenilib' : (newPaid > 0 ? 'qismen' : 'borc');

        await tx.sale.update({
          where: { id: entity.id },
          data: {
            paidAmount: newPaid,
            paymentStatus: newStatus,
          }
        });
      } else {
        throw new Error('Naməlum borc tipi');
      }

      // Create debt payment history
      const dp = await tx.debtPayment.create({
        data: {
          debtType: debt_type,
          debtId: parseInt(debt_id),
          amount: payAmount,
          paymentMethod: payment_method || 'cash',
          notes: notes || null,
          createdById: req.user.id,
        }
      });

      // Create finance transaction for the payment (income)
      await tx.financeTransaction.create({
        data: {
          date: today,
          type: 'income',
          category: 'Borc ödənişi',
          amount: payAmount,
          description: `${debt_type === 'record' ? 'Servis' : 'Satış'} #${debt_id} borc ödənişi`,
          refType: 'debt_payment',
          refId: dp.id,
          paymentMethod: payment_method || 'cash',
          createdById: req.user.id,
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'debt_payment',
          entityType: debt_type,
          entityId: parseInt(debt_id),
          userId: req.user.id,
          userName: req.user.fullName || req.user.username,
          newData: {
            amount: payAmount,
            new_paid: newPaid,
            new_status: newStatus,
            total: entityTotal,
          },
        }
      });

      return {
        payment_id: dp.id,
        debt_type,
        debt_id: parseInt(debt_id),
        amount: payAmount,
        new_paid: newPaid,
        new_status: newStatus,
        total: entityTotal,
        remaining: Math.max(0, entityTotal - newPaid),
      };
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET debt payment history for a specific debt
router.get('/payments', requireAuth, async (req, res, next) => {
  try {
    const { debt_type, debt_id } = req.query;
    const where = {};
    if (debt_type) where.debtType = debt_type;
    if (debt_id) where.debtId = parseInt(debt_id);

    const rows = await prisma.debtPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const mapped = rows.map(r => ({
      id: r.id,
      debt_type: r.debtType,
      debt_id: r.debtId,
      amount: r.amount,
      payment_method: r.paymentMethod,
      notes: r.notes,
      created_by_id: r.createdById,
      created_at: r.createdAt,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

// GET debt stats summary
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const userFilter = userId ? { createdById: userId } : {};

    const [recAgg, saleAgg, recDebtCount, saleDebtCount] = await Promise.all([
      prisma.record.aggregate({ where: userFilter, _sum: { totalPrice: true, paidAmount: true } }),
      prisma.sale.aggregate({ where: userFilter, _sum: { total: true, paidAmount: true } }),
      prisma.record.count({ where: { ...userFilter, remainingAmount: { gt: 0 } } }),
      prisma.sale.count({ where: { ...userFilter, paymentStatus: { in: ['gozleyir', 'qismen', 'borc'] } } }),
    ]);

    const recTotal = recAgg._sum.totalPrice || 0;
    const recPaid = recAgg._sum.paidAmount || 0;
    const saleTotal = saleAgg._sum.total || 0;
    const salePaid = saleAgg._sum.paidAmount || 0;
    const recordDebt = Math.max(0, recTotal - recPaid);
    const saleDebt = Math.max(0, saleTotal - salePaid);

    res.json({
      success: true,
      data: {
        total_debt: recordDebt + saleDebt,
        record_debt: recordDebt,
        sale_debt: saleDebt,
        total_paid: recPaid + salePaid,
        record_count: recDebtCount,
        sale_count: saleDebtCount,
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
