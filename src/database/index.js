const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { SCHEMA } = require('./schema');
const { runMigrations, integrityCheck } = require('./migrations');

let db = null;

function getDbPath() {
  const userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || '', 'servis-idareetme');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'servis.db');
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -16000'); // 16 MB cache
    initSchema();
    ensureAccessColumns();
    try {
      const logger = require('../main/logger');
      runMigrations(db, logger);
      integrityCheck(db, logger);
    } catch (e) {
      console.warn('[DB] Migration/integrity warning:', e.message);
    }
    initDefaultData();
  }
  return db;
}

function initDefaultData() {
  try {
    const { initDefaultRoles } = require('./roles');
    initDefaultRoles();
  } catch (e) { console.warn('[DB] roles init:', e.message); }

  try {
    const crypto = require('crypto');
    const adminExists = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get();
    if (!adminExists) {
      const roleRow = db.prepare(`SELECT id FROM roles WHERE name = 'admin'`).get();
      const roleId = roleRow ? roleRow.id : 1;
      const hash = crypto.createHash('sha256').update('admin123' + 'servis_salt_2024').digest('hex');
      db.prepare(`INSERT INTO users (username, password_hash, full_name, role_id, is_active, approval_status) VALUES (?, ?, ?, ?, 1, 'approved')`)
        .run('admin', hash, 'Admin İstifadəçi', roleId);
    }
  } catch (e) { console.warn('[DB] default admin init:', e.message); }

  try {
    const { initTrial } = require('./licenses');
    initTrial();
  } catch (e) { console.warn('[DB] license init:', e.message); }
}

function ensureAccessColumns() {
  try {
    const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    const needed = [
      { col: 'access_type',       def: 'TEXT DEFAULT NULL'    },
      { col: 'access_expires_at', def: 'TEXT DEFAULT NULL'    },
      { col: 'access_granted_by', def: 'INTEGER DEFAULT NULL' },
      { col: 'access_granted_at', def: 'TEXT DEFAULT NULL'    },
    ];
    for (const { col, def } of needed) {
      if (!cols.includes(col)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      }
    }
    db.exec(`UPDATE users SET access_type = 'lifetime' WHERE (username = 'admin' OR id IN (SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin')) AND access_type IS NULL`);
  } catch (e) {
    console.warn('[DB] ensureAccessColumns:', e.message);
  }
}

function initSchema() {
  const statements = SCHEMA.split(';').filter(s => s.trim().length > 0);
  const transaction = db.transaction(() => {
    for (const stmt of statements) {
      try {
        db.prepare(stmt + ';').run();
      } catch (e) {
        // ignore already exists errors
      }
    }
  });
  transaction();
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function getDbFilePath() {
  return getDbPath();
}

module.exports = { getDb, closeDb, getDbFilePath };
