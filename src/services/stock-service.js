/**
 * StockService - Stok əməliyyatlarının tam business logic-i
 * Stock in/out/adjust + price history + notifications
 */
const { getDb } = require('../database/index');
const AuditService = require('./audit-service');
const NotificationService = require('./notification-service');

class StockService {
  /**
   * Stok giriş
   */
  static stockIn(productId, qty, note, userId, refType, refId) {
    const db = getDb();
    return db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) throw new Error('Məhsul tapılmadı');
      const before = product.stock_qty;
      const after = before + Math.abs(qty);
      db.prepare("UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(after, productId);
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
        VALUES (?, 'giris', ?, ?, ?, ?, ?, ?, ?)
      `).run(productId, Math.abs(qty), before, after, refType || null, refId || null, note || null, userId || null);

      AuditService.logStockUpdate(productId, userId, null, { type: 'in', qty, before, after }, `Stok giriş: ${product.name} +${qty}`);
      return { product_id: productId, before, after, qty: Math.abs(qty) };
    })();
  }

  /**
   * Stok çıxış
   */
  static stockOut(productId, qty, note, userId, refType, refId) {
    const db = getDb();
    return db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) throw new Error('Məhsul tapılmadı');
      const before = product.stock_qty;
      const after = before - Math.abs(qty);
      if (after < 0) throw new Error(`Stok kifayət etmir (mövcud: ${before})`);
      db.prepare("UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(after, productId);
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
        VALUES (?, 'cixis', ?, ?, ?, ?, ?, ?, ?)
      `).run(productId, -Math.abs(qty), before, after, refType || null, refId || null, note || null, userId || null);

      // Low stock check
      if (after <= (product.min_stock || 0) && (product.min_stock || 0) > 0) {
        NotificationService.notifyLowStock(product.id, product.name, after, product.min_stock, userId);
      }

      AuditService.logStockUpdate(productId, userId, null, { type: 'out', qty, before, after }, `Stok çıxış: ${product.name} -${qty}`);
      return { product_id: productId, before, after, qty: -Math.abs(qty) };
    })();
  }

  /**
   * Stok düzəliş (adjustment)
   */
  static stockAdjust(productId, newQty, note, userId) {
    const db = getDb();
    return db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) throw new Error('Məhsul tapılmadı');
      const before = product.stock_qty;
      const diff = newQty - before;
      if (diff === 0) return { product_id: productId, before, after: before, qty: 0 };

      db.prepare("UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newQty, productId);
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
        VALUES (?, 'duzeltme', ?, ?, ?, NULL, NULL, ?, ?)
      `).run(productId, diff, before, newQty, note || 'Manual düzəliş', userId || null);

      if (newQty <= (product.min_stock || 0) && (product.min_stock || 0) > 0) {
        NotificationService.notifyLowStock(product.id, product.name, newQty, product.min_stock, userId);
      }

      AuditService.logStockUpdate(productId, userId, null, { type: 'adjust', before, after: newQty, diff }, `Stok düzəliş: ${product.name} ${before} → ${newQty}`);
      return { product_id: productId, before, after: newQty, qty: diff };
    })();
  }

  /**
   * Məhsul qiymət dəyişikliyi + price_history
   */
  static updateProductPrice(productId, newBuyPrice, newSellPrice, reason, userId) {
    const db = getDb();
    return db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) throw new Error('Məhsul tapılmadı');

      const oldBuy = product.buy_price;
      const oldSell = product.sell_price;
      const buyChanged = newBuyPrice !== undefined && newBuyPrice !== oldBuy;
      const sellChanged = newSellPrice !== undefined && newSellPrice !== oldSell;

      if (!buyChanged && !sellChanged) return product;

      // Update product
      if (buyChanged) db.prepare("UPDATE products SET buy_price = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newBuyPrice, productId);
      if (sellChanged) db.prepare("UPDATE products SET sell_price = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newSellPrice, productId);

      // Price history
      db.prepare(`
        INSERT INTO price_history (product_id, old_cost_price, new_cost_price, old_sale_price, new_sale_price, changed_by, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(productId, oldBuy, buyChanged ? newBuyPrice : oldBuy, oldSell, sellChanged ? newSellPrice : oldSell, userId || null, reason || null);

      AuditService.logPriceChange(productId, userId, null,
        { buy_price: oldBuy, sell_price: oldSell },
        { buy_price: buyChanged ? newBuyPrice : oldBuy, sell_price: sellChanged ? newSellPrice : oldSell },
        `Qiymət dəyişikliyi: ${product.name}`
      );

      return db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    })();
  }

  /**
   * Məhsul detail — tam populated
   */
  static getProductDetail(id) {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name AS category_name, c.color AS category_color, s.name AS supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id);
    if (!product) return null;

    // Stock movements
    product.stock_movements = db.prepare(`
      SELECT sm.*, u.full_name as created_by_name
      FROM stock_movements sm LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 50
    `).all(id);

    // Price history
    product.price_history = db.prepare(`
      SELECT ph.*, u.full_name as changed_by_name
      FROM price_history ph LEFT JOIN users u ON ph.changed_by = u.id
      WHERE ph.product_id = ? ORDER BY ph.created_at DESC LIMIT 20
    `).all(id);

    // Recent sales
    product.recent_sales = db.prepare(`
      SELECT si.*, s.sale_number, s.date, s.customer_name
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ?
      ORDER BY s.date DESC LIMIT 20
    `).all(id);

    // Stats
    product.stats = db.prepare(`
      SELECT COUNT(*) as total_sold_count, COALESCE(SUM(qty), 0) as total_sold_qty, COALESCE(SUM(total), 0) as total_revenue
      FROM sale_items WHERE product_id = ?
    `).get(id);

    return product;
  }
}

module.exports = StockService;
