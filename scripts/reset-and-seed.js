/**
 * Reset + Seed Test Data to Remote PostgreSQL via API
 * Uses snake_case field names matching server routes
 * Usage: node scripts/reset-and-seed.js [server_url]
 */

const SERVER_URL = process.argv[2] || 'https://sky-relationship-narrow-opera.trycloudflare.com';
let AUTH_TOKEN = '';

async function api(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SERVER_URL}${endpoint}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, error: text }; }
}

async function login() {
  const r = await api('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  if (!r.success) throw new Error('Login failed: ' + JSON.stringify(r));
  AUTH_TOKEN = r.data.token;
  console.log('✓ Logged in');
}

async function seed(endpoint, data, label) {
  const r = await api(endpoint, 'POST', data);
  if (r.success) {
    console.log(`  ✓ ${label} (id: ${r.data?.id || '?'})`);
    return r.data;
  } else {
    console.log(`  ✗ ${label}: ${r.error || JSON.stringify(r)}`);
    return null;
  }
}

async function deleteAll(endpoint, label) {
  const r = await api(endpoint);
  if (!r.success || !Array.isArray(r.data)) { console.log(`  ⚠ ${label}: skip`); return; }
  let count = 0;
  for (const item of r.data) {
    const dr = await api(`${endpoint}/${item.id}`, 'DELETE');
    if (dr.success) count++;
  }
  console.log(`  🗑 ${label}: deleted ${count}`);
}

async function main() {
  console.log('════════════════════════════════════');
  console.log('  Reset + Seed Test Data');
  console.log(`  Server: ${SERVER_URL}`);
  console.log('════════════════════════════════════\n');

  await login();

  // --- Delete existing data (reverse order of dependencies) ---
  console.log('🗑 Cleaning existing data...');
  await deleteAll('/sales', 'Sales');
  await deleteAll('/records', 'Records');
  await deleteAll('/expenses', 'Expenses');
  await deleteAll('/appointments', 'Appointments');
  await deleteAll('/tasks', 'Tasks');
  await deleteAll('/vehicles', 'Vehicles');
  await deleteAll('/customers', 'Customers');
  await deleteAll('/products', 'Products');
  await deleteAll('/suppliers', 'Suppliers');
  await deleteAll('/categories', 'Categories');

  // --- Categories (server expects: name, description, color) ---
  console.log('\n📂 Categories:');
  const cat1 = await seed('/categories', { name: 'Yağlar', description: 'Motor yağları', color: '#f59e0b' }, 'Yağlar');
  const cat2 = await seed('/categories', { name: 'Filtr', description: 'Filterlər', color: '#3b82f6' }, 'Filtr');
  const cat3 = await seed('/categories', { name: 'Əyləc', description: 'Əyləc hissələri', color: '#ef4444' }, 'Əyləc');
  const cat4 = await seed('/categories', { name: 'Elektrik', description: 'Elektrik hissələri', color: '#8b5cf6' }, 'Elektrik');
  const cat5 = await seed('/categories', { name: 'Xidmət', description: 'Xidmət növləri', color: '#10b981' }, 'Xidmət');

  // --- Suppliers ---
  console.log('\n🏭 Suppliers:');
  const sup1 = await seed('/suppliers', { name: 'AutoParts MMC', phone: '+994501234567', email: 'info@autoparts.az', address: 'Bakı, Nəsimi r.' }, 'AutoParts MMC');
  const sup2 = await seed('/suppliers', { name: 'CarZone', phone: '+994502345678', address: 'Bakı, Yasamal r.' }, 'CarZone');
  const sup3 = await seed('/suppliers', { name: 'Filtex Azerbaijan', phone: '+994503456789', email: 'sales@filtex.az' }, 'Filtex Azerbaijan');

  // --- Products (snake_case: buy_price, sell_price, stock_qty, min_stock, category_id, supplier_id) ---
  console.log('\n📦 Products:');
  const prod1 = await seed('/products', { name: 'Castrol 5W-30 Motor Yağı', category_id: cat1?.id || null, sku: 'OIL-001', buy_price: 18, sell_price: 28, stock_qty: 50, min_stock: 10, unit: 'ədəd', supplier_id: sup1?.id || null }, 'Castrol 5W-30');
  const prod2 = await seed('/products', { name: 'Mobil 1 10W-40', category_id: cat1?.id || null, sku: 'OIL-002', buy_price: 22, sell_price: 35, stock_qty: 30, min_stock: 8, unit: 'ədəd', supplier_id: sup1?.id || null }, 'Mobil 1 10W-40');
  const prod3 = await seed('/products', { name: 'Yağ Filtri (Toyota)', category_id: cat2?.id || null, sku: 'FLT-001', buy_price: 5, sell_price: 12, stock_qty: 40, min_stock: 10, unit: 'ədəd', supplier_id: sup3?.id || null }, 'Yağ Filtri Toyota');
  const prod4 = await seed('/products', { name: 'Hava Filtri (Universal)', category_id: cat2?.id || null, sku: 'FLT-002', buy_price: 4, sell_price: 10, stock_qty: 35, min_stock: 8, unit: 'ədəd', supplier_id: sup3?.id || null }, 'Hava Filtri');
  const prod5 = await seed('/products', { name: 'Əyləc Diski (Ön)', category_id: cat3?.id || null, sku: 'BRK-001', buy_price: 45, sell_price: 75, stock_qty: 15, min_stock: 5, unit: 'ədəd', supplier_id: sup2?.id || null }, 'Əyləc Diski Ön');
  const prod6 = await seed('/products', { name: 'Əyləc Qəlibi', category_id: cat3?.id || null, sku: 'BRK-002', buy_price: 25, sell_price: 45, stock_qty: 20, min_stock: 5, unit: 'dəst', supplier_id: sup2?.id || null }, 'Əyləc Qəlibi');
  const prod7 = await seed('/products', { name: 'Akkumulyator 60Ah', category_id: cat4?.id || null, sku: 'ELK-001', buy_price: 80, sell_price: 130, stock_qty: 10, min_stock: 3, unit: 'ədəd', supplier_id: sup1?.id || null }, 'Akkumulyator 60Ah');
  const prod8 = await seed('/products', { name: 'Ön İşıq Lampası H7', category_id: cat4?.id || null, sku: 'ELK-002', buy_price: 8, sell_price: 18, stock_qty: 60, min_stock: 15, unit: 'ədəd' }, 'Ön İşıq H7');
  const prod9 = await seed('/products', { name: 'Antifrize 5L', category_id: cat1?.id || null, sku: 'OIL-003', buy_price: 12, sell_price: 22, stock_qty: 25, min_stock: 5, unit: 'ədəd', supplier_id: sup1?.id || null }, 'Antifrize 5L');
  const prod10 = await seed('/products', { name: 'Yağ dəyişmə xidməti', category_id: cat5?.id || null, sku: 'SRV-001', buy_price: 0, sell_price: 15, stock_qty: 999, min_stock: 0, unit: 'xidmət' }, 'Yağ dəyişmə xidməti');

  // --- Customers ---
  console.log('\n👥 Customers:');
  const cust1 = await seed('/customers', { name: 'Əli Həsənov', phone: '+994501112233' }, 'Əli Həsənov');
  const cust2 = await seed('/customers', { name: 'Vüsal Məmmədov', phone: '+994502223344' }, 'Vüsal Məmmədov');
  const cust3 = await seed('/customers', { name: 'Rəşad İsmayılov', phone: '+994503334455' }, 'Rəşad İsmayılov');
  const cust4 = await seed('/customers', { name: 'Kamran Əliyev', phone: '+994504445566' }, 'Kamran Əliyev');
  const cust5 = await seed('/customers', { name: 'Tural Quliyev', phone: '+994505556677' }, 'Tural Quliyev');
  const cust6 = await seed('/customers', { name: 'Orxan Hüseynov', phone: '+994506667788' }, 'Orxan Hüseynov');
  const cust7 = await seed('/customers', { name: 'Nicat Babayev', phone: '+994507778899' }, 'Nicat Babayev');
  const cust8 = await seed('/customers', { name: 'Samir Rzayev', phone: '+994508889900' }, 'Samir Rzayev');

  // --- Vehicles (snake_case: customer_id) ---
  console.log('\n🚗 Vehicles:');
  const v1 = await seed('/vehicles', { customer_id: cust1?.id, brand: 'Toyota', model: 'Camry', plate: '10-AB-123', year: 2020 }, 'Toyota Camry');
  const v2 = await seed('/vehicles', { customer_id: cust2?.id, brand: 'Mercedes', model: 'E220', plate: '77-BC-456', year: 2019 }, 'Mercedes E220');
  const v3 = await seed('/vehicles', { customer_id: cust3?.id, brand: 'BMW', model: '320i', plate: '90-CD-789', year: 2021 }, 'BMW 320i');
  const v4 = await seed('/vehicles', { customer_id: cust4?.id, brand: 'Hyundai', model: 'Tucson', plate: '10-DE-321', year: 2022 }, 'Hyundai Tucson');
  const v5 = await seed('/vehicles', { customer_id: cust5?.id, brand: 'Kia', model: 'Sportage', plate: '50-FG-654', year: 2023 }, 'Kia Sportage');
  const v6 = await seed('/vehicles', { customer_id: cust6?.id, brand: 'Lexus', model: 'RX350', plate: '77-HI-987', year: 2018 }, 'Lexus RX350');
  const v7 = await seed('/vehicles', { customer_id: cust7?.id, brand: 'Nissan', model: 'Qashqai', plate: '10-JK-147', year: 2020 }, 'Nissan Qashqai');
  const v8 = await seed('/vehicles', { customer_id: cust8?.id, brand: 'Chevrolet', model: 'Malibu', plate: '90-LM-258', year: 2017 }, 'Chevrolet Malibu');

  // --- Records (snake_case fields) ---
  console.log('\n📝 Records:');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const lastMonth1 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const lastMonth2 = new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0];

  await seed('/records', { date: today, time: '09:30', customer_id: cust1?.id, customer_name: 'Əli Həsənov', vehicle_id: v1?.id, car_brand: 'Toyota', car_model: 'Camry', car_plate: '10-AB-123', service_type: 'Yağ dəyişmə', total_price: 55, unit_price: 55, quantity: 1, payment_status: 'odenilib', paid_amount: 55, remaining_amount: 0 }, 'Əli - Yağ dəyişmə bu gün');
  await seed('/records', { date: today, time: '11:00', customer_id: cust2?.id, customer_name: 'Vüsal Məmmədov', vehicle_id: v2?.id, car_brand: 'Mercedes', car_model: 'E220', car_plate: '77-BC-456', service_type: 'Əyləc təmiri', total_price: 180, unit_price: 180, quantity: 1, payment_status: 'odenilib', paid_amount: 180, remaining_amount: 0 }, 'Vüsal - Əyləc təmiri bu gün');
  await seed('/records', { date: today, time: '14:00', customer_id: cust3?.id, customer_name: 'Rəşad İsmayılov', vehicle_id: v3?.id, car_brand: 'BMW', car_model: '320i', car_plate: '90-CD-789', service_type: 'Diaqnostika', total_price: 40, unit_price: 40, quantity: 1, payment_status: 'gozleyir', paid_amount: 0, remaining_amount: 40 }, 'Rəşad - Diaqnostika bu gün');
  await seed('/records', { date: yesterday, time: '10:00', customer_id: cust4?.id, customer_name: 'Kamran Əliyev', vehicle_id: v4?.id, car_brand: 'Hyundai', car_model: 'Tucson', car_plate: '10-DE-321', service_type: 'Yağ + Filtr dəyişmə', total_price: 85, unit_price: 85, quantity: 1, payment_status: 'odenilib', paid_amount: 85, remaining_amount: 0 }, 'Kamran - Yağ+Filtr dünən');
  await seed('/records', { date: yesterday, time: '15:30', customer_id: cust5?.id, customer_name: 'Tural Quliyev', vehicle_id: v5?.id, car_brand: 'Kia', car_model: 'Sportage', car_plate: '50-FG-654', service_type: 'Əyləc diski dəyişmə', total_price: 220, unit_price: 220, quantity: 1, payment_status: 'qismen', paid_amount: 150, remaining_amount: 70 }, 'Tural - Əyləc diski dünən');
  await seed('/records', { date: twoDaysAgo, time: '09:00', customer_id: cust6?.id, customer_name: 'Orxan Hüseynov', vehicle_id: v6?.id, car_brand: 'Lexus', car_model: 'RX350', car_plate: '77-HI-987', service_type: 'Tam baxış', total_price: 300, unit_price: 300, quantity: 1, payment_status: 'odenilib', paid_amount: 300, remaining_amount: 0 }, 'Orxan - Tam baxış');
  await seed('/records', { date: lastWeek, time: '11:30', customer_id: cust7?.id, customer_name: 'Nicat Babayev', vehicle_id: v7?.id, car_brand: 'Nissan', car_model: 'Qashqai', car_plate: '10-JK-147', service_type: 'Akkumulyator dəyişmə', total_price: 145, unit_price: 145, quantity: 1, payment_status: 'odenilib', paid_amount: 145, remaining_amount: 0 }, 'Nicat - Akkumulyator');
  await seed('/records', { date: lastWeek, time: '16:00', customer_id: cust8?.id, customer_name: 'Samir Rzayev', vehicle_id: v8?.id, car_brand: 'Chevrolet', car_model: 'Malibu', car_plate: '90-LM-258', service_type: 'Motor təmiri', total_price: 450, unit_price: 450, quantity: 1, payment_status: 'borc', paid_amount: 200, remaining_amount: 250 }, 'Samir - Motor təmiri (borc)');
  await seed('/records', { date: twoWeeksAgo, time: '10:00', customer_id: cust1?.id, customer_name: 'Əli Həsənov', vehicle_id: v1?.id, car_brand: 'Toyota', car_model: 'Camry', car_plate: '10-AB-123', service_type: 'Təkər balanslaşdırma', total_price: 30, unit_price: 30, quantity: 1, payment_status: 'odenilib', paid_amount: 30, remaining_amount: 0 }, 'Əli - Təkər balans 2 həftə');
  await seed('/records', { date: lastMonth1, time: '13:00', customer_id: cust2?.id, customer_name: 'Vüsal Məmmədov', vehicle_id: v2?.id, car_brand: 'Mercedes', car_model: 'E220', car_plate: '77-BC-456', service_type: 'Yağ dəyişmə', total_price: 65, unit_price: 65, quantity: 1, payment_status: 'odenilib', paid_amount: 65, remaining_amount: 0 }, 'Vüsal - Yağ keçən ay');
  await seed('/records', { date: lastMonth2, time: '09:30', customer_id: cust3?.id, customer_name: 'Rəşad İsmayılov', vehicle_id: v3?.id, car_brand: 'BMW', car_model: '320i', car_plate: '90-CD-789', service_type: 'Sükan sistemi təmiri', total_price: 200, unit_price: 200, quantity: 1, payment_status: 'odenilib', paid_amount: 200, remaining_amount: 0 }, 'Rəşad - Sükan keçən ay');
  await seed('/records', { date: lastMonth1, time: '14:30', customer_id: cust4?.id, customer_name: 'Kamran Əliyev', vehicle_id: v4?.id, car_brand: 'Hyundai', car_model: 'Tucson', car_plate: '10-DE-321', service_type: 'Kondisioner təmiri', total_price: 120, unit_price: 120, quantity: 1, payment_status: 'qismen', paid_amount: 80, remaining_amount: 40 }, 'Kamran - Kondisioner keçən ay');

  // --- Sales (snake_case: customer_id, customer_name, paid_amount, payment_status, payment_method, product_id, product_name, unit_price) ---
  console.log('\n🛒 Sales:');
  await seed('/sales', { date: today, time: '10:15', customer_id: cust1?.id, customer_name: 'Əli Həsənov', discount: 3, paid_amount: 60, payment_status: 'odenilib', payment_method: 'cash', items: [
    { product_id: prod1?.id, product_name: 'Castrol 5W-30', qty: 1, unit_price: 28 },
    { product_id: prod3?.id, product_name: 'Yağ Filtri Toyota', qty: 1, unit_price: 12 },
    { product_id: prod10?.id, product_name: 'Yağ dəyişmə xidməti', qty: 1, unit_price: 15 },
  ]}, 'Satış: Əli - Yağ+Filtr bu gün');

  await seed('/sales', { date: today, time: '11:30', customer_id: cust2?.id, customer_name: 'Vüsal Məmmədov', discount: 0, paid_amount: 120, payment_status: 'odenilib', payment_method: 'card', items: [
    { product_id: prod5?.id, product_name: 'Əyləc Diski Ön', qty: 1, unit_price: 75 },
    { product_id: prod6?.id, product_name: 'Əyləc Qəlibi', qty: 1, unit_price: 45 },
  ]}, 'Satış: Vüsal - Əyləc bu gün');

  await seed('/sales', { date: yesterday, time: '14:00', customer_id: cust5?.id, customer_name: 'Tural Quliyev', discount: 0, paid_amount: 53, payment_status: 'odenilib', payment_method: 'cash', items: [
    { product_id: prod2?.id, product_name: 'Mobil 1 10W-40', qty: 1, unit_price: 35 },
    { product_id: prod8?.id, product_name: 'Ön İşıq H7', qty: 1, unit_price: 18 },
  ]}, 'Satış: Tural - Yağ+İşıq dünən');

  await seed('/sales', { date: twoDaysAgo, time: '12:00', customer_id: cust6?.id, customer_name: 'Orxan Hüseynov', discount: 0, paid_amount: 130, payment_status: 'odenilib', payment_method: 'cash', items: [
    { product_id: prod7?.id, product_name: 'Akkumulyator 60Ah', qty: 1, unit_price: 130 },
  ]}, 'Satış: Orxan - Akkumulyator');

  await seed('/sales', { date: lastWeek, time: '10:00', customer_id: cust3?.id, customer_name: 'Rəşad İsmayılov', discount: 4, paid_amount: 70, payment_status: 'odenilib', payment_method: 'cash', items: [
    { product_id: prod1?.id, product_name: 'Castrol 5W-30', qty: 2, unit_price: 28 },
    { product_id: prod8?.id, product_name: 'Ön İşıq H7', qty: 1, unit_price: 18 },
  ]}, 'Satış: Rəşad - keçən həftə');

  await seed('/sales', { date: lastWeek, time: '16:30', customer_id: cust7?.id, customer_name: 'Nicat Babayev', discount: 0, paid_amount: 0, payment_status: 'borc', payment_method: 'cash', items: [
    { product_id: prod9?.id, product_name: 'Antifrize 5L', qty: 1, unit_price: 22 },
  ]}, 'Satış: Nicat - Antifrize (borc)');

  await seed('/sales', { date: lastMonth1, time: '09:00', customer_id: cust4?.id, customer_name: 'Kamran Əliyev', discount: 7, paid_amount: 140, payment_status: 'odenilib', payment_method: 'card', items: [
    { product_id: prod2?.id, product_name: 'Mobil 1 10W-40', qty: 2, unit_price: 35 },
    { product_id: prod4?.id, product_name: 'Hava Filtri', qty: 2, unit_price: 10 },
    { product_id: prod3?.id, product_name: 'Yağ Filtri Toyota', qty: 2, unit_price: 12 },
    { product_id: prod10?.id, product_name: 'Yağ dəyişmə xidməti', qty: 2, unit_price: 15 },
  ]}, 'Satış: Kamran - toplu keçən ay');

  await seed('/sales', { date: lastMonth2, time: '11:00', customer_id: cust8?.id, customer_name: 'Samir Rzayev', discount: 0, paid_amount: 30, payment_status: 'qismen', payment_method: 'cash', items: [
    { product_id: prod1?.id, product_name: 'Castrol 5W-30', qty: 1, unit_price: 28 },
    { product_id: prod8?.id, product_name: 'Ön İşıq H7', qty: 1, unit_price: 18 },
  ]}, 'Satış: Samir - keçən ay (qismən)');

  // --- Expenses ---
  console.log('\n💰 Expenses:');
  await seed('/expenses', { date: today, category: 'İcarə', description: 'Servis binası aylıq icarə', amount: 800, payment_method: 'transfer' }, 'İcarə bu gün');
  await seed('/expenses', { date: today, category: 'Kommunal', description: 'Elektrik ödənişi', amount: 120, payment_method: 'card' }, 'Elektrik bu gün');
  await seed('/expenses', { date: yesterday, category: 'Mal alışı', description: 'AutoParts-dan yağ alışı', amount: 450, payment_method: 'transfer' }, 'Mal alışı dünən');
  await seed('/expenses', { date: lastWeek, category: 'Əmək haqqı', description: 'Usta maaşı - Elvin', amount: 1200, payment_method: 'cash' }, 'Əmək haqqı');
  await seed('/expenses', { date: lastWeek, category: 'Əmək haqqı', description: 'Usta maaşı - Tamerlan', amount: 1000, payment_method: 'cash' }, 'Əmək haqqı 2');
  await seed('/expenses', { date: lastMonth1, category: 'İcarə', description: 'Keçən ay icarə', amount: 800, payment_method: 'transfer' }, 'İcarə keçən ay');
  await seed('/expenses', { date: lastMonth1, category: 'Avadanlıq', description: 'Yeni kompressor alınması', amount: 350, payment_method: 'cash' }, 'Kompressor');
  await seed('/expenses', { date: lastMonth2, category: 'Kommunal', description: 'Su + qaz', amount: 85, payment_method: 'cash' }, 'Kommunal keçən ay');

  // --- Appointments ---
  console.log('\n📅 Appointments:');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
  await seed('/appointments', { title: 'Yağ dəyişmə', customer_id: cust4?.id, customer_name: 'Kamran Əliyev', phone: '+994504445566', date: tomorrow, time: '10:00', duration: 45, status: 'pending' }, 'Kamran sabah');
  await seed('/appointments', { title: 'Əyləc yoxlaması', customer_id: cust6?.id, customer_name: 'Orxan Hüseynov', phone: '+994506667788', date: tomorrow, time: '14:00', duration: 60, status: 'pending' }, 'Orxan sabah');
  await seed('/appointments', { title: 'Diaqnostika', customer_id: cust8?.id, customer_name: 'Samir Rzayev', phone: '+994508889900', date: dayAfter, time: '11:00', duration: 30, status: 'pending' }, 'Samir birigün');

  // --- Tasks ---
  console.log('\n✅ Tasks:');
  await seed('/tasks', { title: 'Yeni avadanlıq sifariş et', description: 'Kompressor filtri lazımdır', priority: 'high', status: 'todo', due_date: tomorrow }, 'Task 1');
  await seed('/tasks', { title: 'Anbarda sayım keçir', description: 'Aylıq inventarizasiya', priority: 'medium', status: 'in_progress', due_date: dayAfter }, 'Task 2');
  await seed('/tasks', { title: 'Müştəri borclara bax', description: 'Borc olan müştərilərə zəng et', priority: 'high', status: 'todo', due_date: today }, 'Task 3');
  await seed('/tasks', { title: 'Telegram bot qur', description: 'Günlük hesabat göndərmək üçün', priority: 'low', status: 'todo' }, 'Task 4');

  // --- Verify stats ---
  console.log('\n📊 Verifying stats...');
  const stats = await api('/stats/today');
  console.log(`  Today stats: revenue=${stats.data?.revenue || stats.data?.total_revenue}, count=${stats.data?.count || stats.data?.record_count}`);
  const allStats = await api('/stats/all-time');
  console.log(`  All-time: revenue=${allStats.data?.revenue || allStats.data?.total_revenue}, count=${allStats.data?.count || allStats.data?.record_count}`);

  console.log('\n════════════════════════════════════');
  console.log('  ✅ Test data seeded successfully!');
  console.log('════════════════════════════════════');
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); });
