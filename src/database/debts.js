const { getDb } = require('./index');

function getAllDebts(filters = {}) {
  const db = getDb();
  const debts = [];

  // Records with remaining balance
  if (!filters.type || filters.type === 'record') {
    let sql = 'SELECT * FROM records WHERE (total_price - COALESCE(paid_amount, 0)) > 0';
    const params = [];
    if (filters.userId) { sql += ' AND created_by = ?'; params.push(filters.userId); }
    if (filters.search) {
      sql += ' AND (customer_name LIKE ? OR car_plate LIKE ? OR service_type LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY date DESC';
    const records = db.prepare(sql).all(...params);
    for (const r of records) {
      const total = r.total_price || 0;
      const paid = r.paid_amount || 0;
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) continue;
      debts.push({
        id: `record_${r.id}`,
        debt_type: 'record',
        debt_id: r.id,
        date: r.date,
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        description: r.service_type || 'Servis',
        ref_number: `SRV-${r.id}`,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: paid <= 0 ? 'borc' : 'qismen',
        notes: r.notes,
        created_at: r.created_at,
      });
    }
  }

  // Sales with remaining balance
  if (!filters.type || filters.type === 'sale') {
    let sql = 'SELECT * FROM sales WHERE (total - COALESCE(paid_amount, 0)) > 0';
    const params = [];
    if (filters.userId) { sql += ' AND created_by = ?'; params.push(filters.userId); }
    if (filters.search) {
      sql += ' AND customer_name LIKE ?';
      params.push(`%${filters.search}%`);
    }
    sql += ' ORDER BY date DESC';
    const sales = db.prepare(sql).all(...params);
    for (const s of sales) {
      const total = s.total || 0;
      const paid = s.paid_amount || 0;
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) continue;
      debts.push({
        id: `sale_${s.id}`,
        debt_type: 'sale',
        debt_id: s.id,
        date: s.date,
        customer_id: s.customer_id,
        customer_name: s.customer_name,
        description: `Satış #${s.id}`,
        ref_number: `SAT-${s.id}`,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: paid <= 0 ? 'borc' : 'qismen',
        notes: s.notes,
        created_at: s.created_at,
      });
    }
  }

  debts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return debts;
}

function payDebt(data) {
  const db = getDb();
  const { debt_type, debt_id, amount, payment_method, notes, created_by } = data;
  const payAmount = Number(amount);
  if (!debt_type || !debt_id || !payAmount || payAmount <= 0) throw new Error('Yanlış parametrlər');

  const today = new Date().toISOString().split('T')[0];

  const pay = db.transaction(() => {
    let entity, entityTotal, newPaid, newStatus;

    if (debt_type === 'record') {
      entity = db.prepare('SELECT * FROM records WHERE id = ?').get(debt_id);
      if (!entity) throw new Error('Qeyd tapılmadı');
      entityTotal = entity.total_price || 0;
      newPaid = Math.min(entityTotal, (entity.paid_amount || 0) + payAmount);
      const remaining = Math.max(0, entityTotal - newPaid);
      newStatus = remaining <= 0 ? 'odenilib' : (newPaid > 0 ? 'qismen' : 'borc');
      db.prepare('UPDATE records SET paid_amount = ?, remaining_amount = ?, payment_status = ? WHERE id = ?')
        .run(newPaid, remaining, newStatus, debt_id);
    } else if (debt_type === 'sale') {
      entity = db.prepare('SELECT * FROM sales WHERE id = ?').get(debt_id);
      if (!entity) throw new Error('Satış tapılmadı');
      entityTotal = entity.total || 0;
      newPaid = Math.min(entityTotal, (entity.paid_amount || 0) + payAmount);
      newStatus = newPaid >= entityTotal ? 'odenilib' : (newPaid > 0 ? 'qismen' : 'borc');
      db.prepare('UPDATE sales SET paid_amount = ?, payment_status = ? WHERE id = ?')
        .run(newPaid, newStatus, debt_id);
    } else {
      throw new Error('Naməlum borc tipi');
    }

    // Create debt payment record
    const dpInfo = db.prepare('INSERT INTO debt_payments (debt_type, debt_id, amount, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(debt_type, debt_id, payAmount, payment_method || 'cash', notes || null, created_by || null);

    // Create finance transaction
    db.prepare('INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(today, 'income', 'Borc ödənişi',
        payAmount, `${debt_type === 'record' ? 'Servis' : 'Satış'} #${debt_id} borc ödənişi`,
        'debt_payment', dpInfo.lastInsertRowid, payment_method || 'cash', created_by || null);

    return {
      payment_id: dpInfo.lastInsertRowid,
      debt_type, debt_id,
      amount: payAmount,
      new_paid: newPaid,
      new_status: newStatus,
      total: entityTotal,
      remaining: Math.max(0, entityTotal - newPaid),
    };
  });

  return pay();
}

function getDebtPayments(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM debt_payments WHERE 1=1';
  const params = [];
  if (filters.debt_type) { sql += ' AND debt_type = ?'; params.push(filters.debt_type); }
  if (filters.debt_id) { sql += ' AND debt_id = ?'; params.push(filters.debt_id); }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params);
}

function getDebtStats(userId) {
  const db = getDb();
  const recWhere = userId ? ' AND created_by = ?' : '';
  const recParams = userId ? [userId] : [];

  const records = db.prepare(`SELECT total_price, paid_amount FROM records WHERE 1=1${recWhere}`).all(...recParams);
  const sales = db.prepare(`SELECT total, paid_amount FROM sales WHERE 1=1${recWhere}`).all(...recParams);

  const recordDebt = records.reduce((s, r) => s + Math.max(0, (r.total_price || 0) - (r.paid_amount || 0)), 0);
  const saleDebt = sales.reduce((s, x) => s + Math.max(0, (x.total || 0) - (x.paid_amount || 0)), 0);
  const totalPaid = records.reduce((s, r) => s + (r.paid_amount || 0), 0) + sales.reduce((s, x) => s + (x.paid_amount || 0), 0);

  return {
    total_debt: recordDebt + saleDebt,
    record_debt: recordDebt,
    sale_debt: saleDebt,
    total_paid: totalPaid,
    record_count: records.filter(r => (r.total_price || 0) > (r.paid_amount || 0)).length,
    sale_count: sales.filter(s => (s.total || 0) > (s.paid_amount || 0)).length,
  };
}

module.exports = { getAllDebts, payDebt, getDebtPayments, getDebtStats };
