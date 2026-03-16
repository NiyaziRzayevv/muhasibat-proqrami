const { getDb } = require('./index');

const DEFAULT_ROLES = [
  {
    name: 'admin',
    display_name: 'Admin',
    permissions: JSON.stringify({
      dashboard: true, records: true, sales: true, pos: true,
      products: true, customers: true, suppliers: true,
      reports: true, export: true, settings: true,
      users: true, finance: true, expenses: true,
      audit: true, license: true, backup: true,
      deleteRecords: true, deleteProducts: true, deleteSales: true,
    }),
  },
  {
    name: 'manager',
    display_name: 'Menecer',
    permissions: JSON.stringify({
      dashboard: true, records: true, sales: true, pos: true,
      products: true, customers: true, suppliers: true,
      reports: true, export: true, settings: false,
      users: false, finance: true, expenses: true,
      audit: false, license: false, backup: false,
      deleteRecords: true, deleteProducts: false, deleteSales: false,
    }),
  },
  {
    name: 'cashier',
    display_name: 'Kassir',
    permissions: JSON.stringify({
      dashboard: true, records: false, sales: true, pos: true,
      products: true, customers: true, suppliers: false,
      reports: false, export: false, settings: false,
      users: false, finance: false, expenses: false,
      audit: false, license: false, backup: false,
      deleteRecords: false, deleteProducts: false, deleteSales: false,
    }),
  },
  {
    name: 'worker',
    display_name: 'İşçi',
    permissions: JSON.stringify({
      dashboard: true, records: true, sales: false, pos: false,
      products: false, customers: true, suppliers: false,
      reports: false, export: false, settings: false,
      users: false, finance: false, expenses: false,
      audit: false, license: false, backup: false,
      deleteRecords: false, deleteProducts: false, deleteSales: false,
    }),
  },
  {
    name: 'viewer',
    display_name: 'Müşahidəçi',
    permissions: JSON.stringify({
      dashboard: true, records: true, sales: true, pos: false,
      products: true, customers: true, suppliers: true,
      reports: true, export: false, settings: false,
      users: false, finance: false, expenses: false,
      audit: false, license: false, backup: false,
      deleteRecords: false, deleteProducts: false, deleteSales: false,
    }),
  },
];

function initDefaultRoles() {
  const db = getDb();
  for (const role of DEFAULT_ROLES) {
    const exists = db.prepare(`SELECT id FROM roles WHERE name = ?`).get(role.name);
    if (!exists) {
      db.prepare(`INSERT INTO roles (name, display_name, permissions) VALUES (?, ?, ?)`).run(role.name, role.display_name, role.permissions);
    }
  }
}

function getAllRoles() {
  return getDb().prepare(`SELECT * FROM roles ORDER BY id`).all();
}

function getRoleById(id) {
  return getDb().prepare(`SELECT * FROM roles WHERE id = ?`).get(id);
}

function getRoleByName(name) {
  return getDb().prepare(`SELECT * FROM roles WHERE name = ?`).get(name);
}

function updateRolePermissions(id, permissions) {
  const db = getDb();
  db.prepare(`UPDATE roles SET permissions = ? WHERE id = ?`).run(JSON.stringify(permissions), id);
  return getRoleById(id);
}

module.exports = { initDefaultRoles, getAllRoles, getRoleById, getRoleByName, updateRolePermissions, DEFAULT_ROLES };
