/**
 * Seed Test Data to Remote PostgreSQL via API
 * Usage: node scripts/seed-test-data.js [server_url]
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
    console.log(`  ✓ ${label}`);
    return r.data;
  } else {
    console.log(`  ✗ ${label}: ${r.error || JSON.stringify(r)}`);
    return null;
  }
}

async function main() {
  console.log('════════════════════════════════════');
  console.log('  Seeding Test Data');
  console.log(`  Server: ${SERVER_URL}`);
  console.log('════════════════════════════════════\n');

  await login();

  // --- Categories ---
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

  // --- Products ---
  console.log('\n📦 Products:');
  const prod1 = await seed('/products', { name: 'Castrol 5W-30 Motor Yağı', categoryId: cat1?.id, sku: 'OIL-001', buyPrice: 18, sellPrice: 28, stockQty: 50, minStock: 10, unit: 'ədəd', supplierId: sup1?.id }, 'Castrol 5W-30');
  const prod2 = await seed('/products', { name: 'Mobil 1 10W-40', categoryId: cat1?.id, sku: 'OIL-002', buyPrice: 22, sellPrice: 35, stockQty: 30, minStock: 8, unit: 'ədəd', supplierId: sup1?.id }, 'Mobil 1 10W-40');
  const prod3 = await seed('/products', { name: 'Yağ Filtri (Toyota)', categoryId: cat2?.id, sku: 'FLT-001', buyPrice: 5, sellPrice: 12, stockQty: 40, minStock: 10, unit: 'ədəd', supplierId: sup3?.id }, 'Yağ Filtri Toyota');
  const prod4 = await seed('/products', { name: 'Hava Filtri (Universal)', categoryId: cat2?.id, sku: 'FLT-002', buyPrice: 4, sellPrice: 10, stockQty: 35, minStock: 8, unit: 'ədəd', supplierId: sup3?.id }, 'Hava Filtri');
  const prod5 = await seed('/products', { name: 'Əyləc Diski (Ön)', categoryId: cat3?.id, sku: 'BRK-001', buyPrice: 45, sellPrice: 75, stockQty: 15, minStock: 5, unit: 'ədəd', supplierId: sup2?.id }, 'Əyləc Diski Ön');
  const prod6 = await seed('/products', { name: 'Əyləc Qəlibi', categoryId: cat3?.id, sku: 'BRK-002', buyPrice: 25, sellPrice: 45, stockQty: 20, minStock: 5, unit: 'dəst', supplierId: sup2?.id }, 'Əyləc Qəlibi');
  const prod7 = await seed('/products', { name: 'Akkumulyator 60Ah', categoryId: cat4?.id, sku: 'ELK-001', buyPrice: 80, sellPrice: 130, stockQty: 10, minStock: 3, unit: 'ədəd', supplierId: sup1?.id }, 'Akkumulyator 60Ah');
  const prod8 = await seed('/products', { name: 'Ön İşıq Lampası H7', categoryId: cat4?.id, sku: 'ELK-002', buyPrice: 8, sellPrice: 18, stockQty: 60, minStock: 15, unit: 'ədəd' }, 'Ön İşıq H7');
  const prod9 = await seed('/products', { name: 'Antifrize 5L', categoryId: cat1?.id, sku: 'OIL-003', buyPrice: 12, sellPrice: 22, stockQty: 25, minStock: 5, unit: 'ədəd', supplierId: sup1?.id }, 'Antifrize 5L');
  const prod10 = await seed('/products', { name: 'Yağ dəyişmə xidməti', categoryId: cat5?.id, sku: 'SRV-001', buyPrice: 0, sellPrice: 15, stockQty: 999, minStock: 0, unit: 'xidmət' }, 'Yağ dəyişmə xidməti');

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

  // --- Vehicles ---
  console.log('\n🚗 Vehicles:');
  const v1 = await seed('/vehicles', { customerId: cust1?.id, brand: 'Toyota', model: 'Camry', plate: '10-AB-123', year: 2020 }, 'Toyota Camry');
  const v2 = await seed('/vehicles', { customerId: cust2?.id, brand: 'Mercedes', model: 'E220', plate: '77-BC-456', year: 2019 }, 'Mercedes E220');
  const v3 = await seed('/vehicles', { customerId: cust3?.id, brand: 'BMW', model: '320i', plate: '90-CD-789', year: 2021 }, 'BMW 320i');
  const v4 = await seed('/vehicles', { customerId: cust4?.id, brand: 'Hyundai', model: 'Tucson', plate: '10-DE-321', year: 2022 }, 'Hyundai Tucson');
  const v5 = await seed('/vehicles', { customerId: cust5?.id, brand: 'Kia', model: 'Sportage', plate: '50-FG-654', year: 2023 }, 'Kia Sportage');
  const v6 = await seed('/vehicles', { customerId: cust6?.id, brand: 'Lexus', model: 'RX350', plate: '77-HI-987', year: 2018 }, 'Lexus RX350');
  const v7 = await seed('/vehicles', { customerId: cust7?.id, brand: 'Nissan', model: 'Qashqai', plate: '10-JK-147', year: 2020 }, 'Nissan Qashqai');
  const v8 = await seed('/vehicles', { customerId: cust8?.id, brand: 'Chevrolet', model: 'Malibu', plate: '90-LM-258', year: 2017 }, 'Chevrolet Malibu');

  // --- Records (servis qeydləri) ---
  console.log('\n📝 Records:');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const lastMonth1 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const lastMonth2 = new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0];

  await seed('/records', { date: today, time: '09:30', customerId: cust1?.id, customerName: 'Əli Həsənov', vehicleId: v1?.id, carBrand: 'Toyota', carModel: 'Camry', carPlate: '10-AB-123', serviceType: 'Yağ dəyişmə', totalPrice: 55, unitPrice: 55, quantity: 1, paymentStatus: 'odenilib', paidAmount: 55, remainingAmount: 0 }, 'Əli - Yağ dəyişmə bu gün');
  await seed('/records', { date: today, time: '11:00', customerId: cust2?.id, customerName: 'Vüsal Məmmədov', vehicleId: v2?.id, carBrand: 'Mercedes', carModel: 'E220', carPlate: '77-BC-456', serviceType: 'Əyləc təmiri', totalPrice: 180, unitPrice: 180, quantity: 1, paymentStatus: 'odenilib', paidAmount: 180, remainingAmount: 0 }, 'Vüsal - Əyləc təmiri bu gün');
  await seed('/records', { date: today, time: '14:00', customerId: cust3?.id, customerName: 'Rəşad İsmayılov', vehicleId: v3?.id, carBrand: 'BMW', carModel: '320i', carPlate: '90-CD-789', serviceType: 'Diaqnostika', totalPrice: 40, unitPrice: 40, quantity: 1, paymentStatus: 'gozleyir', paidAmount: 0, remainingAmount: 40 }, 'Rəşad - Diaqnostika bu gün');
  await seed('/records', { date: yesterday, time: '10:00', customerId: cust4?.id, customerName: 'Kamran Əliyev', vehicleId: v4?.id, carBrand: 'Hyundai', carModel: 'Tucson', carPlate: '10-DE-321', serviceType: 'Yağ + Filtr dəyişmə', totalPrice: 85, unitPrice: 85, quantity: 1, paymentStatus: 'odenilib', paidAmount: 85, remainingAmount: 0 }, 'Kamran - Yağ+Filtr dünən');
  await seed('/records', { date: yesterday, time: '15:30', customerId: cust5?.id, customerName: 'Tural Quliyev', vehicleId: v5?.id, carBrand: 'Kia', carModel: 'Sportage', carPlate: '50-FG-654', serviceType: 'Əyləc diski dəyişmə', totalPrice: 220, unitPrice: 220, quantity: 1, paymentStatus: 'qismen', paidAmount: 150, remainingAmount: 70 }, 'Tural - Əyləc diski dünən');
  await seed('/records', { date: twoDaysAgo, time: '09:00', customerId: cust6?.id, customerName: 'Orxan Hüseynov', vehicleId: v6?.id, carBrand: 'Lexus', carModel: 'RX350', carPlate: '77-HI-987', serviceType: 'Tam baxış', totalPrice: 300, unitPrice: 300, quantity: 1, paymentStatus: 'odenilib', paidAmount: 300, remainingAmount: 0 }, 'Orxan - Tam baxış');
  await seed('/records', { date: lastWeek, time: '11:30', customerId: cust7?.id, customerName: 'Nicat Babayev', vehicleId: v7?.id, carBrand: 'Nissan', carModel: 'Qashqai', carPlate: '10-JK-147', serviceType: 'Akkumulyator dəyişmə', totalPrice: 145, unitPrice: 145, quantity: 1, paymentStatus: 'odenilib', paidAmount: 145, remainingAmount: 0 }, 'Nicat - Akkumulyator');
  await seed('/records', { date: lastWeek, time: '16:00', customerId: cust8?.id, customerName: 'Samir Rzayev', vehicleId: v8?.id, carBrand: 'Chevrolet', carModel: 'Malibu', carPlate: '90-LM-258', serviceType: 'Motor təmiri', totalPrice: 450, unitPrice: 450, quantity: 1, paymentStatus: 'borc', paidAmount: 200, remainingAmount: 250 }, 'Samir - Motor təmiri (borc)');
  await seed('/records', { date: twoWeeksAgo, time: '10:00', customerId: cust1?.id, customerName: 'Əli Həsənov', vehicleId: v1?.id, carBrand: 'Toyota', carModel: 'Camry', carPlate: '10-AB-123', serviceType: 'Təkər balanslaşdırma', totalPrice: 30, unitPrice: 30, quantity: 1, paymentStatus: 'odenilib', paidAmount: 30, remainingAmount: 0 }, 'Əli - Təkər balans 2 həftə');
  await seed('/records', { date: lastMonth1, time: '13:00', customerId: cust2?.id, customerName: 'Vüsal Məmmədov', vehicleId: v2?.id, carBrand: 'Mercedes', carModel: 'E220', carPlate: '77-BC-456', serviceType: 'Yağ dəyişmə', totalPrice: 65, unitPrice: 65, quantity: 1, paymentStatus: 'odenilib', paidAmount: 65, remainingAmount: 0 }, 'Vüsal - Yağ keçən ay');
  await seed('/records', { date: lastMonth2, time: '09:30', customerId: cust3?.id, customerName: 'Rəşad İsmayılov', vehicleId: v3?.id, carBrand: 'BMW', carModel: '320i', carPlate: '90-CD-789', serviceType: 'Sükan sistemi təmiri', totalPrice: 200, unitPrice: 200, quantity: 1, paymentStatus: 'odenilib', paidAmount: 200, remainingAmount: 0 }, 'Rəşad - Sükan keçən ay');
  await seed('/records', { date: lastMonth1, time: '14:30', customerId: cust4?.id, customerName: 'Kamran Əliyev', vehicleId: v4?.id, carBrand: 'Hyundai', carModel: 'Tucson', carPlate: '10-DE-321', serviceType: 'Kondisioner təmiri', totalPrice: 120, unitPrice: 120, quantity: 1, paymentStatus: 'qismen', paidAmount: 80, remainingAmount: 40 }, 'Kamran - Kondisioner keçən ay');

  // --- Sales (satışlar) ---
  console.log('\n🛒 Sales:');
  await seed('/sales', { date: today, time: '10:15', customerId: cust1?.id, customerName: 'Əli Həsənov', subtotal: 63, discount: 3, total: 60, paymentStatus: 'odenilib', paidAmount: 60, paymentMethod: 'cash', items: [
    { productId: prod1?.id, productName: 'Castrol 5W-30', qty: 1, unitPrice: 28, total: 28 },
    { productId: prod3?.id, productName: 'Yağ Filtri Toyota', qty: 1, unitPrice: 12, total: 12 },
    { productId: prod10?.id, productName: 'Yağ dəyişmə xidməti', qty: 1, unitPrice: 15, total: 15 },
  ]}, 'Satış: Əli - Yağ+Filtr bu gün');

  await seed('/sales', { date: today, time: '11:30', customerId: cust2?.id, customerName: 'Vüsal Məmmədov', subtotal: 120, discount: 0, total: 120, paymentStatus: 'odenilib', paidAmount: 120, paymentMethod: 'card', items: [
    { productId: prod5?.id, productName: 'Əyləc Diski Ön', qty: 1, unitPrice: 75, total: 75 },
    { productId: prod6?.id, productName: 'Əyləc Qəlibi', qty: 1, unitPrice: 45, total: 45 },
  ]}, 'Satış: Vüsal - Əyləc bu gün');

  await seed('/sales', { date: yesterday, time: '14:00', customerId: cust5?.id, customerName: 'Tural Quliyev', subtotal: 53, discount: 0, total: 53, paymentStatus: 'odenilib', paidAmount: 53, paymentMethod: 'cash', items: [
    { productId: prod2?.id, productName: 'Mobil 1 10W-40', qty: 1, unitPrice: 35, total: 35 },
    { productId: prod8?.id, productName: 'Ön İşıq H7', qty: 1, unitPrice: 18, total: 18 },
  ]}, 'Satış: Tural - Yağ+İşıq dünən');

  await seed('/sales', { date: twoDaysAgo, time: '12:00', customerId: cust6?.id, customerName: 'Orxan Hüseynov', subtotal: 130, discount: 0, total: 130, paymentStatus: 'odenilib', paidAmount: 130, paymentMethod: 'cash', items: [
    { productId: prod7?.id, productName: 'Akkumulyator 60Ah', qty: 1, unitPrice: 130, total: 130 },
  ]}, 'Satış: Orxan - Akkumulyator');

  await seed('/sales', { date: lastWeek, time: '10:00', customerId: cust3?.id, customerName: 'Rəşad İsmayılov', subtotal: 74, discount: 4, total: 70, paymentStatus: 'odenilib', paidAmount: 70, paymentMethod: 'cash', items: [
    { productId: prod1?.id, productName: 'Castrol 5W-30', qty: 2, unitPrice: 28, total: 56 },
    { productId: prod8?.id, productName: 'Ön İşıq H7', qty: 1, unitPrice: 18, total: 18 },
  ]}, 'Satış: Rəşad - keçən həftə');

  await seed('/sales', { date: lastWeek, time: '16:30', customerId: cust7?.id, customerName: 'Nicat Babayev', subtotal: 22, discount: 0, total: 22, paymentStatus: 'borc', paidAmount: 0, paymentMethod: 'cash', items: [
    { productId: prod9?.id, productName: 'Antifrize 5L', qty: 1, unitPrice: 22, total: 22 },
  ]}, 'Satış: Nicat - Antifrize (borc)');

  await seed('/sales', { date: lastMonth1, time: '09:00', customerId: cust4?.id, customerName: 'Kamran Əliyev', subtotal: 147, discount: 7, total: 140, paymentStatus: 'odenilib', paidAmount: 140, paymentMethod: 'card', items: [
    { productId: prod2?.id, productName: 'Mobil 1 10W-40', qty: 2, unitPrice: 35, total: 70 },
    { productId: prod4?.id, productName: 'Hava Filtri', qty: 2, unitPrice: 10, total: 20 },
    { productId: prod3?.id, productName: 'Yağ Filtri Toyota', qty: 2, unitPrice: 12, total: 24 },
    { productId: prod10?.id, productName: 'Yağ dəyişmə xidməti', qty: 2, unitPrice: 15, total: 30 },
  ]}, 'Satış: Kamran - toplu keçən ay');

  await seed('/sales', { date: lastMonth2, time: '11:00', customerId: cust8?.id, customerName: 'Samir Rzayev', subtotal: 46, discount: 0, total: 46, paymentStatus: 'qismen', paidAmount: 30, paymentMethod: 'cash', items: [
    { productId: prod1?.id, productName: 'Castrol 5W-30', qty: 1, unitPrice: 28, total: 28 },
    { productId: prod8?.id, productName: 'Ön İşıq H7', qty: 1, unitPrice: 18, total: 18 },
  ]}, 'Satış: Samir - keçən ay (qismən)');

  // --- Expenses ---
  console.log('\n💰 Expenses:');
  await seed('/expenses', { date: today, category: 'İcarə', description: 'Servis binası aylıq icarə', amount: 800, paymentMethod: 'transfer' }, 'İcarə bu gün');
  await seed('/expenses', { date: today, category: 'Kommunal', description: 'Elektrik ödənişi', amount: 120, paymentMethod: 'card' }, 'Elektrik bu gün');
  await seed('/expenses', { date: yesterday, category: 'Mal alışı', description: 'AutoParts-dan yağ alışı', amount: 450, paymentMethod: 'transfer' }, 'Mal alışı dünən');
  await seed('/expenses', { date: lastWeek, category: 'Əmək haqqı', description: 'Usta maaşı - Elvin', amount: 1200, paymentMethod: 'cash' }, 'Əmək haqqı');
  await seed('/expenses', { date: lastWeek, category: 'Əmək haqqı', description: 'Usta maaşı - Tamerlan', amount: 1000, paymentMethod: 'cash' }, 'Əmək haqqı 2');
  await seed('/expenses', { date: lastMonth1, category: 'İcarə', description: 'Keçən ay icarə', amount: 800, paymentMethod: 'transfer' }, 'İcarə keçən ay');
  await seed('/expenses', { date: lastMonth1, category: 'Avadanlıq', description: 'Yeni kompressor alınması', amount: 350, paymentMethod: 'cash' }, 'Kompressor');
  await seed('/expenses', { date: lastMonth2, category: 'Kommunal', description: 'Su + qaz', amount: 85, paymentMethod: 'cash' }, 'Kommunal keçən ay');

  // --- Appointments ---
  console.log('\n📅 Appointments:');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
  await seed('/appointments', { title: 'Yağ dəyişmə', customerId: cust4?.id, customerName: 'Kamran Əliyev', phone: '+994504445566', date: tomorrow, time: '10:00', duration: 45, status: 'pending' }, 'Kamran sabah');
  await seed('/appointments', { title: 'Əyləc yoxlaması', customerId: cust6?.id, customerName: 'Orxan Hüseynov', phone: '+994506667788', date: tomorrow, time: '14:00', duration: 60, status: 'pending' }, 'Orxan sabah');
  await seed('/appointments', { title: 'Diaqnostika', customerId: cust8?.id, customerName: 'Samir Rzayev', phone: '+994508889900', date: dayAfter, time: '11:00', duration: 30, status: 'pending' }, 'Samir birigün');

  // --- Tasks ---
  console.log('\n✅ Tasks:');
  await seed('/tasks', { title: 'Yeni avadanlıq sifariş et', description: 'Kompressor filtri lazımdır', priority: 'high', status: 'todo', dueDate: tomorrow }, 'Task 1');
  await seed('/tasks', { title: 'Anbarda sayım keçir', description: 'Aylıq inventarizasiya', priority: 'medium', status: 'in_progress', dueDate: dayAfter }, 'Task 2');
  await seed('/tasks', { title: 'Müştəri borclara bax', description: 'Borc olan müştərilərə zəng et', priority: 'high', status: 'todo', dueDate: today }, 'Task 3');
  await seed('/tasks', { title: 'Telegram bot qur', description: 'Günlük hesabat göndərmək üçün', priority: 'low', status: 'todo' }, 'Task 4');

  console.log('\n════════════════════════════════════');
  console.log('  ✅ Test data seeded successfully!');
  console.log('════════════════════════════════════');
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); });
