/**
 * Database migration system.
 * Each migration has a version number and an up() function.
 * Migrations run once, in order, on app startup.
 * Current schema version is stored in the settings table as 'db_version'.
 */

const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema (handled by schema.js)',
    up: (_db) => { /* baseline — already applied via schema.js */ },
  },
  {
    version: 2,
    description: 'Add barcode index on products',
    up: (db) => {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`);
    },
  },
  {
    version: 3,
    description: 'Add customer_id index on sales',
    up: (db) => {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);`);
    },
  },
  {
    version: 4,
    description: 'Add time index on stock_movements',
    up: (db) => {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);`);
    },
  },
  {
    version: 5,
    description: 'Add updated_at trigger scaffolding placeholder',
    up: (_db) => { /* reserved */ },
  },
  {
    version: 6,
    description: 'Add payment_method column to sales',
    up: (db) => {
      const cols = db.prepare(`PRAGMA table_info(sales)`).all();
      const hasPaymentMethod = cols.some(c => c.name === 'payment_method');
      if (!hasPaymentMethod) {
        db.exec(`ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash';`);
      }
    },
  },
  {
    version: 7,
    description: 'Add payment_method index on sales',
    up: (db) => {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);`);
    },
  },
  {
    version: 8,
    description: 'Add approval_status and access control columns to users',
    up: (db) => {
      // Check if column exists
      const cols = db.prepare(`PRAGMA table_info(users)`).all();
      const hasApproval = cols.some(c => c.name === 'approval_status');
      if (!hasApproval) {
        db.exec(`ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'approved';`);
        db.exec(`ALTER TABLE users ADD COLUMN approved_by INTEGER;`);
        db.exec(`ALTER TABLE users ADD COLUMN approved_at TEXT;`);
        db.exec(`ALTER TABLE users ADD COLUMN phone TEXT;`);
      }
      // Ensure existing admin is approved
      db.exec(`UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = '';`);
    },
  },
  {
    version: 9,
    description: 'Add access_type and access_expires_at to users',
    up: (db) => {
      const cols = db.prepare(`PRAGMA table_info(users)`).all();
      const hasAccess = cols.some(c => c.name === 'access_type');
      if (!hasAccess) {
        db.exec(`ALTER TABLE users ADD COLUMN access_type TEXT DEFAULT NULL;`);
        db.exec(`ALTER TABLE users ADD COLUMN access_expires_at TEXT DEFAULT NULL;`);
        db.exec(`ALTER TABLE users ADD COLUMN access_granted_by INTEGER DEFAULT NULL;`);
        db.exec(`ALTER TABLE users ADD COLUMN access_granted_at TEXT DEFAULT NULL;`);
      }
      // Admin has lifetime access by default (join with roles to find admin)
      db.exec(`
        UPDATE users SET access_type = 'lifetime'
        WHERE username = 'admin'
           OR id IN (SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin')
      `);
    },
  },
  {
    version: 10,
    description: 'Add created_by to records and sales for per-user data isolation',
    up: (db) => {
      const rCols = db.prepare(`PRAGMA table_info(records)`).all();
      if (!rCols.some(c => c.name === 'created_by')) {
        db.exec(`ALTER TABLE records ADD COLUMN created_by INTEGER DEFAULT NULL;`);
      }
      const sCols = db.prepare(`PRAGMA table_info(sales)`).all();
      if (!sCols.some(c => c.name === 'created_by')) {
        db.exec(`ALTER TABLE sales ADD COLUMN created_by INTEGER DEFAULT NULL;`);
      }
      // Assign existing records to admin (id=1)
      db.exec(`UPDATE records SET created_by = 1 WHERE created_by IS NULL;`);
      db.exec(`UPDATE sales SET created_by = 1 WHERE created_by IS NULL;`);
    },
  },
  {
    version: 11,
    description: 'Add created_by to customers and vehicles for per-user isolation',
    up: (db) => {
      const cCols = db.prepare(`PRAGMA table_info(customers)`).all();
      if (!cCols.some(c => c.name === 'created_by')) {
        db.exec(`ALTER TABLE customers ADD COLUMN created_by INTEGER DEFAULT NULL;`);
      }
      const vCols = db.prepare(`PRAGMA table_info(vehicles)`).all();
      if (!vCols.some(c => c.name === 'created_by')) {
        db.exec(`ALTER TABLE vehicles ADD COLUMN created_by INTEGER DEFAULT NULL;`);
      }
      db.exec(`UPDATE customers SET created_by = 1 WHERE created_by IS NULL;`);
      db.exec(`UPDATE vehicles SET created_by = 1 WHERE created_by IS NULL;`);
    },
  },
  {
    version: 12,
    description: 'Add created_by to products, suppliers, categories, price_base, stock_movements for full user isolation',
    up: (db) => {
      const tables = ['products', 'suppliers', 'categories', 'price_base', 'stock_movements'];
      for (const table of tables) {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!cols.some(c => c.name === 'created_by')) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN created_by INTEGER DEFAULT NULL;`);
        }
        db.exec(`UPDATE ${table} SET created_by = 1 WHERE created_by IS NULL;`);
      }
      // expenses already has user_id column; assign existing NULL user_id to admin
      db.exec(`UPDATE expenses SET user_id = 1 WHERE user_id IS NULL;`);
    },
  },
  {
    version: 13,
    description: 'Fix admin approval status - ensure admin is always approved',
    up: (db) => {
      // Update any admin users that might have pending status
      db.exec(`
        UPDATE users 
        SET approval_status = 'approved', approved_by = NULL, approved_at = datetime('now','localtime')
        WHERE approval_status != 'approved' 
        AND (username = 'admin' OR role_id IN (SELECT id FROM roles WHERE name = 'admin'))
      `);
    },
  },
  {
    version: 14,
    description: 'Ensure access_type columns exist (re-check in case v9 was skipped)',
    up: (db) => {
      const cols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
      if (!cols.includes('access_type')) {
        db.exec(`ALTER TABLE users ADD COLUMN access_type TEXT DEFAULT NULL;`);
      }
      if (!cols.includes('access_expires_at')) {
        db.exec(`ALTER TABLE users ADD COLUMN access_expires_at TEXT DEFAULT NULL;`);
      }
      if (!cols.includes('access_granted_by')) {
        db.exec(`ALTER TABLE users ADD COLUMN access_granted_by INTEGER DEFAULT NULL;`);
      }
      if (!cols.includes('access_granted_at')) {
        db.exec(`ALTER TABLE users ADD COLUMN access_granted_at TEXT DEFAULT NULL;`);
      }
      db.exec(`
        UPDATE users SET access_type = 'lifetime'
        WHERE username = 'admin'
           OR id IN (SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin')
      `);
    },
  },
  {
    version: 15,
    description: 'Ensure created_by exists on all key tables (fix for missing column error)',
    up: (db) => {
      const tables = [
        'records', 'sales', 'customers', 'vehicles', 
        'products', 'suppliers', 'categories', 
        'price_base', 'stock_movements'
      ];
      
      for (const table of tables) {
        const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        if (!tableExists) continue;

        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        const hasCreatedBy = cols.some(c => c.name === 'created_by');

        if (!hasCreatedBy) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN created_by INTEGER DEFAULT NULL;`);
          db.exec(`UPDATE ${table} SET created_by = 1 WHERE created_by IS NULL;`);
        }
      }
    },
  },
  {
    version: 16,
    description: 'Full business system schema: debts table, notes table, price_history table, missing columns, indexes',
    up: (db) => {
      // ─── Helper: safe ADD COLUMN ─────────────────────────────────────────
      function addCol(table, col, def) {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!cols.some(c => c.name === col)) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
        }
      }

      // ─── 1. customers: əksik sütunlar ──────────────────────────────────
      addCol('customers', 'email', 'TEXT');
      addCol('customers', 'address', 'TEXT');
      addCol('customers', 'status', "TEXT DEFAULT 'active'");

      // ─── 2. vehicles: əksik sütunlar ───────────────────────────────────
      addCol('vehicles', 'vin', 'TEXT');
      addCol('vehicles', 'color', 'TEXT');
      addCol('vehicles', 'updated_at', 'TEXT');

      // ─── 3. suppliers: əksik sütunlar ──────────────────────────────────
      addCol('suppliers', 'company', 'TEXT');

      // ─── 4. products: əksik sütunlar ───────────────────────────────────
      addCol('products', 'is_active', 'INTEGER DEFAULT 1');

      // ─── 5. sales: əksik sütunlar ──────────────────────────────────────
      addCol('sales', 'sale_number', 'TEXT');
      addCol('sales', 'vehicle_id', 'INTEGER');
      addCol('sales', 'sold_by', 'INTEGER');
      addCol('sales', 'remaining_amount', 'REAL DEFAULT 0');
      // Populate remaining_amount from existing data
      db.exec(`UPDATE sales SET remaining_amount = MAX(0, COALESCE(total, 0) - COALESCE(paid_amount, 0)) WHERE remaining_amount = 0 OR remaining_amount IS NULL;`);
      // Generate sale_number for existing sales
      db.exec(`UPDATE sales SET sale_number = 'SAT-' || printf('%05d', id) WHERE sale_number IS NULL;`);
      // Copy created_by to sold_by where sold_by is null
      db.exec(`UPDATE sales SET sold_by = created_by WHERE sold_by IS NULL AND created_by IS NOT NULL;`);

      // ─── 6. sale_items: əksik sütunlar ─────────────────────────────────
      addCol('sale_items', 'unit_cost_snapshot', 'REAL DEFAULT 0');
      addCol('sale_items', 'created_at', 'TEXT');
      // Populate unit_cost_snapshot from product buy_price
      db.exec(`
        UPDATE sale_items SET unit_cost_snapshot = COALESCE(
          (SELECT buy_price FROM products WHERE id = sale_items.product_id), 0
        ) WHERE unit_cost_snapshot = 0 OR unit_cost_snapshot IS NULL;
      `);

      // ─── 7. expenses: əksik sütunlar ───────────────────────────────────
      addCol('expenses', 'supplier_id', 'INTEGER');
      addCol('expenses', 'title', 'TEXT');
      // Populate title from description for existing data
      db.exec(`UPDATE expenses SET title = description WHERE title IS NULL AND description IS NOT NULL;`);

      // ─── 8. appointments: əksik sütunlar ───────────────────────────────
      addCol('appointments', 'vehicle_id', 'INTEGER');
      addCol('appointments', 'description', 'TEXT');

      // ─── 9. tasks: əksik sütunlar ──────────────────────────────────────
      addCol('tasks', 'customer_id', 'INTEGER');
      addCol('tasks', 'vehicle_id', 'INTEGER');
      addCol('tasks', 'appointment_id', 'INTEGER');

      // ─── 10. notifications: əksik sütunlar ─────────────────────────────
      addCol('notifications', 'reference_type', 'TEXT');
      addCol('notifications', 'reference_id', 'INTEGER');

      // ─── 11. audit_logs: əksik sütunlar ────────────────────────────────
      addCol('audit_logs', 'module', 'TEXT');
      addCol('audit_logs', 'description', 'TEXT');
      addCol('audit_logs', 'metadata_json', 'TEXT');

      // ─── 12. CREATE debts TABLE ────────────────────────────────────────
      db.exec(`
        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          sale_id INTEGER,
          record_id INTEGER,
          total_amount REAL NOT NULL DEFAULT 0,
          paid_amount REAL NOT NULL DEFAULT 0,
          remaining_amount REAL NOT NULL DEFAULT 0,
          due_date TEXT,
          status TEXT DEFAULT 'open',
          note TEXT,
          created_by INTEGER,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          updated_at TEXT DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
        CREATE INDEX IF NOT EXISTS idx_debts_sale ON debts(sale_id);
        CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
        CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
      `);

      // ─── 13. Migrate existing virtual debts into debts table ───────────
      // From sales with remaining balance
      const salesDebts = db.prepare(`
        SELECT id, customer_id, total, paid_amount, created_by, created_at
        FROM sales WHERE COALESCE(total, 0) > COALESCE(paid_amount, 0)
      `).all();
      const insertDebt = db.prepare(`
        INSERT INTO debts (customer_id, sale_id, total_amount, paid_amount, remaining_amount, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of salesDebts) {
        const remaining = Math.max(0, (s.total || 0) - (s.paid_amount || 0));
        if (remaining <= 0) continue;
        const status = (s.paid_amount || 0) > 0 ? 'partial' : 'open';
        insertDebt.run(s.customer_id, s.id, s.total || 0, s.paid_amount || 0, remaining, status, s.created_by, s.created_at);
      }
      // From records with remaining balance
      const recordDebts = db.prepare(`
        SELECT id, customer_id, total_price, paid_amount, created_by, created_at
        FROM records WHERE COALESCE(total_price, 0) > COALESCE(paid_amount, 0)
      `).all();
      const insertDebtRec = db.prepare(`
        INSERT INTO debts (customer_id, record_id, total_amount, paid_amount, remaining_amount, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of recordDebts) {
        const remaining = Math.max(0, (r.total_price || 0) - (r.paid_amount || 0));
        if (remaining <= 0) continue;
        const status = (r.paid_amount || 0) > 0 ? 'partial' : 'open';
        insertDebtRec.run(r.customer_id, r.id, r.total_price || 0, r.paid_amount || 0, remaining, status, r.created_by, r.created_at);
      }

      // ─── 14. Update debt_payments to reference debts table ─────────────
      addCol('debt_payments', 'debt_id_new', 'INTEGER');
      addCol('debt_payments', 'customer_id', 'INTEGER');
      addCol('debt_payments', 'received_by', 'INTEGER');
      addCol('debt_payments', 'payment_date', 'TEXT');
      // Populate payment_date from created_at
      db.exec(`UPDATE debt_payments SET payment_date = DATE(created_at) WHERE payment_date IS NULL;`);

      // ─── 15. CREATE notes TABLE ────────────────────────────────────────
      db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          vehicle_id INTEGER,
          sale_id INTEGER,
          title TEXT,
          content TEXT,
          created_by INTEGER,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          updated_at TEXT DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id);
        CREATE INDEX IF NOT EXISTS idx_notes_vehicle ON notes(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_notes_sale ON notes(sale_id);
      `);

      // ─── 16. CREATE price_history TABLE ────────────────────────────────
      db.exec(`
        CREATE TABLE IF NOT EXISTS price_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          old_cost_price REAL,
          new_cost_price REAL,
          old_sale_price REAL,
          new_sale_price REAL,
          changed_by INTEGER,
          reason TEXT,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
        CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(created_at);
      `);

      // ─── 17. Additional indexes for performance ────────────────────────
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
        CREATE INDEX IF NOT EXISTS idx_sales_vehicle ON sales(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales(sold_by);
        CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);
        CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_customer ON tasks(customer_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_vehicle ON tasks(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_appointment ON tasks(appointment_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_ref ON notifications(reference_type, reference_id);
        CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_ref ON finance_transactions(ref_type, ref_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(ref_type, ref_id);
        CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
        CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      `);

      // ─── 18. Create finance_transactions for existing sales ────────────
      // Only create if no finance transaction exists for this sale
      const salesNoFt = db.prepare(`
        SELECT s.id, s.date, s.total, s.paid_amount, s.payment_method, s.created_by, s.customer_name
        FROM sales s
        WHERE NOT EXISTS (SELECT 1 FROM finance_transactions ft WHERE ft.ref_type = 'sale' AND ft.ref_id = s.id)
        AND s.paid_amount > 0
      `).all();
      const insertFt = db.prepare(`
        INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
        VALUES (?, 'income', 'Satış', ?, ?, 'sale', ?, ?, ?)
      `);
      for (const s of salesNoFt) {
        insertFt.run(s.date, s.paid_amount || s.total, `Satış #${s.id} - ${s.customer_name || 'Qonaq'}`, s.id, s.payment_method || 'cash', s.created_by);
      }

      // ─── 19. Create finance_transactions for existing expenses ─────────
      const expensesNoFt = db.prepare(`
        SELECT e.id, e.date, e.amount, e.description, e.category, e.payment_method, e.user_id
        FROM expenses e
        WHERE e.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM finance_transactions ft WHERE ft.ref_type = 'expense' AND ft.ref_id = e.id)
      `).all();
      const insertFtExp = db.prepare(`
        INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
        VALUES (?, 'expense', ?, ?, ?, 'expense', ?, ?, ?)
      `);
      for (const e of expensesNoFt) {
        insertFtExp.run(e.date, e.category, e.amount, e.description || e.category, e.id, e.payment_method || 'cash', e.user_id);
      }
    },
  },
];

const CURRENT_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

function getCurrentVersion(db) {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'db_version'`).get();
    return row ? parseInt(row.value, 10) : 0;
  } catch (_) {
    return 0;
  }
}

function setVersion(db, version) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('db_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(version));
}

function runMigrations(db, logger) {
  const current = getCurrentVersion(db);
  if (current >= CURRENT_VERSION) return;

  const pending = MIGRATIONS.filter(m => m.version > current);
  logger?.info('MIGRATION', `Running ${pending.length} pending migration(s). DB version: ${current} → ${CURRENT_VERSION}`);

  for (const migration of pending) {
    try {
      db.transaction(() => {
        migration.up(db);
        setVersion(db, migration.version);
      })();
      logger?.info('MIGRATION', `v${migration.version} OK: ${migration.description}`);
    } catch (e) {
      logger?.error('MIGRATION', `v${migration.version} FAILED: ${migration.description}`, e);
      throw new Error(`Migration v${migration.version} failed: ${e.message}`);
    }
  }
}

function integrityCheck(db, logger) {
  try {
    const result = db.prepare(`PRAGMA integrity_check`).get();
    if (result?.integrity_check !== 'ok') {
      logger?.error('DB_INTEGRITY', 'Database integrity check failed', result);
    } else {
      logger?.info('DB_INTEGRITY', 'Database integrity OK');
    }
  } catch (e) {
    logger?.warn('DB_INTEGRITY', 'Could not run integrity check', e.message);
  }
}

module.exports = { runMigrations, integrityCheck, CURRENT_VERSION };
