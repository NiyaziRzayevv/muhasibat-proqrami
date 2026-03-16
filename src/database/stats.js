const { getDb } = require('./index');

function getDebtStats(userId = null) {
  const db = getDb();
  const uf = userId ? ` WHERE created_by = ${parseInt(userId)}` : '';
  const stmt = db.prepare(`
    SELECT 
      SUM(CASE WHEN payment_status = 'odenilib' THEN total_price ELSE 0 END) AS paid,
      SUM(CASE WHEN payment_status = 'gozleyir' THEN total_price ELSE 0 END) AS pending,
      SUM(CASE WHEN payment_status = 'qismen' THEN total_price ELSE 0 END) AS partial,
      SUM(CASE WHEN payment_status = 'borc' THEN total_price ELSE 0 END) AS debt,
      SUM(total_price) AS total
    FROM records${uf}
  `);
  return stmt.get();
}

function getProductStats(userId = null) {
  const db = getDb();
  const uf = userId ? ` WHERE created_by = ${parseInt(userId)}` : '';
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) AS total_products,
      SUM(stock_qty) AS total_units,
      SUM(stock_qty * sell_price) AS total_sell_value,
      SUM(stock_qty * buy_price) AS total_buy_value,
      COUNT(CASE WHEN stock_qty <= min_stock THEN 1 END) AS low_stock_count
    FROM products${uf}
  `);
  return stmt.get();
}

function getMonthlyRevenue(year, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  const stmt = db.prepare(`
    SELECT 
      CAST(strftime('%m', date) AS INTEGER) AS month,
      SUM(total_price) AS revenue,
      COUNT(*) AS count
    FROM records
    WHERE strftime('%Y', date) = ?${uf}
    GROUP BY month
    ORDER BY month
  `);
  return stmt.all(year);
}

function getYearlyRevenue(userId = null) {
  const db = getDb();
  const uf = userId ? ` WHERE created_by = ${parseInt(userId)}` : '';
  const stmt = db.prepare(`
    SELECT 
      strftime('%Y', date) AS year,
      SUM(total_price) AS revenue,
      COUNT(*) AS count
    FROM records${uf}
    GROUP BY year
    ORDER BY year DESC
    LIMIT 5
  `);
  return stmt.all();
}

module.exports = {
  getDebtStats,
  getProductStats,
  getMonthlyRevenue,
  getYearlyRevenue,
};
