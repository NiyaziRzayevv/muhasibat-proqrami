const { getDb } = require('./index');
const { seedDefaultCategories } = require('./categories');

function seedDatabase() {
  const db = getDb();

  seedDefaultCategories();

  const hasPrices = db.prepare(`SELECT COUNT(*) as c FROM price_base`).get();
  if (hasPrices.c > 0) return;

  // Seed price base
  const prices = [
    { brand: 'Telefon', service_type: 'Ekran dəyişmə', price: 50 },
    { brand: 'Telefon', service_type: 'Batareya dəyişmə', price: 30 },
    { brand: 'Telefon', service_type: 'Şarj portu təmiri', price: 25 },
    { brand: 'Telefon', service_type: 'Kamera təmiri', price: 35 },
    { brand: 'Elektronika', service_type: 'Ekran dəyişmə', price: 80 },
    { brand: 'Elektronika', service_type: 'Proqram yüklənməsi', price: 15 },
    { brand: null, service_type: 'Ekran dəyişmə', price: 50 },
    { brand: null, service_type: 'Batareya dəyişmə', price: 30 },
    { brand: null, service_type: 'Diagnostika', price: 20 },
    { brand: null, service_type: 'Təmizləmə', price: 10 },
    { brand: null, service_type: 'Hissə dəyişmə', price: 40 },
    { brand: null, service_type: 'Quraşdırma', price: 25 },
    { brand: null, service_type: 'Texniki baxış', price: 15 },
    { brand: null, service_type: 'Məlumat köçürmə', price: 10 },
    { brand: null, service_type: 'Garanti təmiri', price: 0 },
    { brand: null, service_type: 'Ümumi təmir', price: 35 },
  ];

  const priceStmt = db.prepare(`INSERT OR IGNORE INTO price_base (brand, service_type, price) VALUES (?, ?, ?)`);
  for (const p of prices) {
    priceStmt.run(p.brand, p.service_type, p.price);
  }

}

module.exports = { seedDatabase };
