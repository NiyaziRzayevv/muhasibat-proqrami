/**
 * SQLite → PostgreSQL (Supabase) Migration Script
 * Reads local SQLite DB and pushes data to remote server via API
 * 
 * Usage: node scripts/migrate-to-postgres.js [server_url]
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// ---- CONFIG ----
const SQLITE_PATH = path.join(process.env.APPDATA || '', 'servis-idareetme', 'servis.db');
const SERVER_URL = process.argv[2] || 'https://sky-relationship-narrow-opera.trycloudflare.com';
// ---- END CONFIG ----

let AUTH_TOKEN = '';

async function api(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const url = `${SERVER_URL}${endpoint}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, error: text }; }
}

async function login() {
  const result = await api('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  if (!result.success) throw new Error('Login failed: ' + JSON.stringify(result));
  AUTH_TOKEN = result.data.token;
  console.log('✓ Logged in as admin');
}

async function openSqlite() {
  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(`SQLite DB not found at: ${SQLITE_PATH}`);
  }
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(SQLITE_PATH);
  const db = new SQL.Database(buffer);
  console.log(`✓ Opened SQLite: ${SQLITE_PATH}`);
  return db;
}

function getRows(db, table) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (e) {
    console.log(`  ⚠ Table ${table} not found or empty`);
    return [];
  }
}

function countRows(db, table) {
  try {
    const stmt = db.prepare(`SELECT COUNT(*) as c FROM ${table}`);
    stmt.step();
    const result = stmt.getAsObject().c;
    stmt.free();
    return result;
  } catch { return 0; }
}

async function migrateCustomers(db) {
  const rows = getRows(db, 'customers');
  console.log(`\n📋 Customers: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/customers', 'POST', {
      name: r.name || null,
      phone: r.phone || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Customer "${r.name}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateVehicles(db) {
  const rows = getRows(db, 'vehicles');
  console.log(`\n🚗 Vehicles: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/vehicles', 'POST', {
      customerId: r.customer_id || null,
      brand: r.brand || null,
      model: r.model || null,
      plate: r.plate || null,
      year: r.year || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Vehicle "${r.plate}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateCategories(db) {
  const rows = getRows(db, 'categories');
  console.log(`\n📂 Categories: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/categories', 'POST', {
      name: r.name,
      description: r.description || null,
      color: r.color || '#3b82f6',
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Category "${r.name}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateSuppliers(db) {
  const rows = getRows(db, 'suppliers');
  console.log(`\n🏭 Suppliers: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/suppliers', 'POST', {
      name: r.name,
      phone: r.phone || null,
      email: r.email || null,
      address: r.address || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Supplier "${r.name}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateProducts(db) {
  const rows = getRows(db, 'products');
  console.log(`\n📦 Products: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/products', 'POST', {
      name: r.name,
      categoryId: r.category_id || null,
      sku: r.sku || null,
      barcode: r.barcode || null,
      buyPrice: r.buy_price || 0,
      sellPrice: r.sell_price || 0,
      stockQty: r.stock_qty || 0,
      minStock: r.min_stock || 5,
      unit: r.unit || 'ədəd',
      supplierId: r.supplier_id || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Product "${r.name}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateRecords(db) {
  const rows = getRows(db, 'records');
  console.log(`\n📝 Records: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/records', 'POST', {
      date: r.date,
      time: r.time || null,
      customerId: r.customer_id || null,
      customerName: r.customer_name || null,
      customerPhone: r.customer_phone || null,
      vehicleId: r.vehicle_id || null,
      carBrand: r.car_brand || null,
      carModel: r.car_model || null,
      carPlate: r.car_plate || null,
      serviceType: r.service_type || null,
      extraServices: r.extra_services || null,
      quantity: r.quantity || 1,
      unitPrice: r.unit_price || null,
      totalPrice: r.total_price || null,
      paymentStatus: r.payment_status || 'gozleyir',
      paidAmount: r.paid_amount || 0,
      remainingAmount: r.remaining_amount || 0,
      notes: r.notes || null,
      rawInput: r.raw_input || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Record #${r.id}: ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateSales(db) {
  const sales = getRows(db, 'sales');
  console.log(`\n🛒 Sales: ${sales.length} rows`);
  let ok = 0, fail = 0;
  for (const s of sales) {
    const items = getSaleItems(db, s.id);
    const res = await api('/sales', 'POST', {
      date: s.date,
      time: s.time || null,
      customerId: s.customer_id || null,
      customerName: s.customer_name || null,
      subtotal: s.subtotal || 0,
      discount: s.discount || 0,
      total: s.total || 0,
      paymentStatus: s.payment_status || 'odenilib',
      paidAmount: s.paid_amount || 0,
      paymentMethod: s.payment_method || 'cash',
      notes: s.notes || null,
      items: items.map(i => ({
        productId: i.product_id || null,
        productName: i.product_name || null,
        qty: i.qty || 1,
        unitPrice: i.unit_price || 0,
        total: i.total || 0,
      })),
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Sale #${s.id}: ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

function getSaleItems(db, saleId) {
  try {
    const stmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    stmt.bind([saleId]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch { return []; }
}

async function migrateExpenses(db) {
  const rows = getRows(db, 'expenses');
  console.log(`\n💰 Expenses: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/expenses', 'POST', {
      date: r.date,
      category: r.category,
      description: r.description || null,
      amount: r.amount || 0,
      paymentMethod: r.payment_method || 'cash',
      reference: r.reference || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Expense #${r.id}: ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migratePrices(db) {
  const rows = getRows(db, 'price_base');
  console.log(`\n💲 Prices: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/records/prices', 'POST', {
      brand: r.brand || null,
      serviceType: r.service_type,
      price: r.price || null,
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Price "${r.service_type}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateAppointments(db) {
  const rows = getRows(db, 'appointments');
  console.log(`\n📅 Appointments: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/appointments', 'POST', {
      title: r.title,
      customerId: r.customer_id || null,
      customerName: r.customer_name || null,
      phone: r.phone || null,
      date: r.date,
      time: r.time || '09:00',
      duration: r.duration || 60,
      status: r.status || 'pending',
      notes: r.notes || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Appointment "${r.title}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateTasks(db) {
  const rows = getRows(db, 'tasks');
  console.log(`\n✅ Tasks: ${rows.length} rows`);
  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await api('/tasks', 'POST', {
      title: r.title,
      description: r.description || null,
      priority: r.priority || 'medium',
      status: r.status || 'todo',
      dueDate: r.due_date || null,
      assignedTo: r.assigned_to || null,
    });
    if (res.success) ok++; else { fail++; if (fail <= 3) console.log(`  ✗ Task "${r.title}": ${res.error}`); }
  }
  console.log(`  ✓ ${ok} OK, ${fail} failed`);
}

async function migrateSettings(db) {
  const rows = getRows(db, 'settings');
  console.log(`\n⚙️  Settings: ${rows.length} rows`);
  if (rows.length === 0) return;
  const settingsObj = {};
  for (const r of rows) {
    if (r.key && r.key !== 'db_version') settingsObj[r.key] = r.value;
  }
  if (Object.keys(settingsObj).length > 0) {
    const res = await api('/settings', 'PUT', settingsObj);
    console.log(`  ${res.success ? '✓' : '✗'} Settings: ${res.success ? 'OK' : res.error}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  SQLite → PostgreSQL Migration');
  console.log(`  Server: ${SERVER_URL}`);
  console.log('═══════════════════════════════════════════\n');

  const db = await openSqlite();

  // Show counts
  const tables = ['customers', 'vehicles', 'categories', 'suppliers', 'products', 'records', 'sales', 'sale_items', 'expenses', 'price_base', 'appointments', 'tasks', 'settings'];
  console.log('\nLocal DB row counts:');
  for (const t of tables) {
    console.log(`  ${t}: ${countRows(db, t)}`);
  }

  await login();

  // Migrate in order (respecting foreign keys)
  await migrateSettings(db);
  await migrateCustomers(db);
  await migrateVehicles(db);
  await migrateCategories(db);
  await migrateSuppliers(db);
  await migrateProducts(db);
  await migrateRecords(db);
  await migrateSales(db);
  await migrateExpenses(db);
  await migratePrices(db);
  await migrateAppointments(db);
  await migrateTasks(db);

  db.close();
  console.log('\n═══════════════════════════════════════════');
  console.log('  Migration complete!');
  console.log('═══════════════════════════════════════════');
}

main().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
