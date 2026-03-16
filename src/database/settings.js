const { getDb } = require('./index');

const DEFAULTS = {
  company_name: 'SmartQeyd',
  master_name: '',
  phone: '',
  address: '',
  currency: 'AZN',
  theme: 'dark',
  openai_api_key: '',
  backup_path: '',
  language: 'az',
  use_ai_parser: 'true',
};

function getSetting(key) {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  if (row) return row.value;
  return DEFAULTS[key] !== undefined ? DEFAULTS[key] : null;
}

function getAllSettings() {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

function setSetting(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

function setMultipleSettings(data) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const transaction = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, value !== null && value !== undefined ? String(value) : '');
    }
  });
  transaction(Object.entries(data));
}

module.exports = { getSetting, getAllSettings, setSetting, setMultipleSettings };
