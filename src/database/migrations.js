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
