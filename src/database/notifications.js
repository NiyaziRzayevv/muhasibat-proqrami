const { getDb } = require('./index');

function getAllNotifications(userId = null, limit = 50) {
  const db = getDb();
  if (userId) {
    return db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
  }
  return db.prepare(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?`).all(limit);
}

function getUnreadCount(userId = null) {
  const db = getDb();
  if (userId) {
    return db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND user_id = ?`).get(userId).count;
  }
  return db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`).get().count;
}

function createNotification(data) {
  const db = getDb();
  let userId = data.user_id || null;
  
  const stmt = db.prepare(`
    INSERT INTO notifications (type, title, message, data, user_id)
    VALUES (@type, @title, @message, @data, @user_id)
  `);
  const result = stmt.run({
    type: data.type || 'info',
    title: data.title,
    message: data.message || null,
    data: data.data ? JSON.stringify(data.data) : '{}',
    user_id: userId,
  });
  return db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(result.lastInsertRowid);
}

function markAsRead(id) {
  getDb().prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
}

function markAllAsRead(userId = null) {
  const db = getDb();
  if (userId) {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(userId);
  } else {
    db.prepare(`UPDATE notifications SET is_read = 1`).run();
  }
}

function deleteNotification(id) {
  return getDb().prepare(`DELETE FROM notifications WHERE id = ?`).run(id).changes > 0;
}

function clearOldNotifications(daysOld = 30) {
  const db = getDb();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return db.prepare(`DELETE FROM notifications WHERE created_at < ? AND is_read = 1`).run(cutoff).changes;
}

function checkAndCreateSystemNotifications(currentUserId = null) {
  const db = getDb();
  const notifications = [];
  if (!currentUserId) return notifications;

  // Low stock check
  try {
    const lowStock = db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock_qty <= min_stock AND min_stock > 0`).get();
    if (lowStock.count > 0) {
      const existing = db.prepare(`SELECT id FROM notifications WHERE type = 'low_stock' AND is_read = 0 AND user_id = ?`).get(currentUserId);
      if (!existing) {
        createNotification({
          type: 'low_stock',
          title: 'Stok Xəbərdarlığı',
          message: `${lowStock.count} məhsulun stoku minimum həddən aşağıdır`,
          data: { count: lowStock.count },
          user_id: currentUserId,
        });
        notifications.push('low_stock');
      }
    }
  } catch (e) { /* ignore */ }

  // Unpaid debts check
  try {
    const unpaid = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(remaining_amount),0) as total FROM records WHERE payment_status IN ('gozleyir','qismen','borc')`).get();
    if (unpaid.count > 5) {
      const existing = db.prepare(`SELECT id FROM notifications WHERE type = 'unpaid_debts' AND is_read = 0 AND user_id = ?`).get(currentUserId);
      if (!existing) {
        createNotification({
          type: 'unpaid_debts',
          title: 'Ödənilməmiş Borclar',
          message: `${unpaid.count} ödənilməmiş qeyd, toplam ${Number(unpaid.total).toFixed(2)} ₼`,
          data: { count: unpaid.count, total: unpaid.total },
          user_id: currentUserId,
        });
        notifications.push('unpaid_debts');
      }
    }
  } catch (e) { /* ignore */ }

  return notifications;
}

module.exports = { getAllNotifications, getUnreadCount, createNotification, markAsRead, markAllAsRead, deleteNotification, clearOldNotifications, checkAndCreateSystemNotifications };
