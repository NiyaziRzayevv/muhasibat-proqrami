// Database fix script - adds missing access_type columns and fixes admin
const fs = require('fs');
const path = require('path');

// Find database file
const userDataPath = path.join(process.env.APPDATA || '', 'servis-idareetme');
let dbPath = path.join(userDataPath, 'servis.db');

if (!fs.existsSync(dbPath)) {
  const altPaths = [
    path.join(__dirname, 'servis.db'),
    path.join(__dirname, 'src', 'servis.db'),
    path.join(__dirname, 'data', 'servis.db'),
  ];
  const found = altPaths.find(p => fs.existsSync(p));
  if (!found) {
    console.error('Database not found. Tried:', [dbPath, ...altPaths].join('\n  '));
    process.exit(1);
  }
  dbPath = found;
}

console.log('Database found at:', dbPath);

const Database = require('better-sqlite3');
const db = new Database(dbPath);

try {
  const names = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  console.log('Current users columns:', names.join(', '));

  const missing = [
    { col: 'access_type',       def: 'TEXT DEFAULT NULL'    },
    { col: 'access_expires_at', def: 'TEXT DEFAULT NULL'    },
    { col: 'access_granted_by', def: 'INTEGER DEFAULT NULL' },
    { col: 'access_granted_at', def: 'TEXT DEFAULT NULL'    },
  ].filter(c => !names.includes(c.col));

  if (missing.length === 0) {
    console.log('All access_type columns already exist.');
  } else {
    for (const { col, def } of missing) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log('Added column:', col);
    }
  }

  // Fix admin: approval_status + access_type
  const changes = db.prepare(
    `UPDATE users SET approval_status = 'approved', access_type = 'lifetime' WHERE username = 'admin'`
  ).run().changes;
  console.log('Admin fixed (rows affected:', changes, ')');

  // Bump db_version to 14 so migration v14 is not re-run
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('db_version', '14')
     ON CONFLICT(key) DO UPDATE SET value = '14'`
  ).run();
  console.log('db_version set to 14');

  console.log('Done. Restart the app.');
} catch (e) {
  console.error('Fix failed:', e.message);
} finally {
  db.close();
}
