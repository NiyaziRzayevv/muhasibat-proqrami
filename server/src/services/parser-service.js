// ─── BRAND MAP ───
const BRAND_MAP = {
  'mercedes': 'Mercedes', 'mecedes': 'Mercedes', 'mersedes': 'Mercedes',
  'bmw': 'BMW', 'bim': 'BMW',
  'audi': 'Audi', 'avdi': 'Audi',
  'toyota': 'Toyota', 'toyata': 'Toyota',
  'honda': 'Honda', 'hunda': 'Honda',
  'hyundai': 'Hyundai', 'xundai': 'Hyundai', 'hundai': 'Hyundai',
  'kia': 'Kia',
  'nissan': 'Nissan', 'nisan': 'Nissan',
  'volkswagen': 'Volkswagen', 'vw': 'Volkswagen', 'volkvagen': 'Volkswagen',
  'opel': 'Opel',
  'ford': 'Ford',
  'chevrolet': 'Chevrolet', 'shevrolet': 'Chevrolet',
  'lada': 'Lada', 'vaz': 'Lada',
  'renault': 'Renault', 'reno': 'Renault',
  'peugeot': 'Peugeot', 'pejo': 'Peugeot',
  'fiat': 'Fiat',
  'mazda': 'Mazda',
  'lexus': 'Lexus',
  'volvo': 'Volvo',
  'skoda': 'Skoda',
  'porsche': 'Porsche',
  'jeep': 'Jeep',
  'tesla': 'Tesla',
  'geely': 'Geely',
  'chery': 'Chery',
  'byd': 'BYD',
  'haval': 'Haval',
  'daewoo': 'Daewoo',
};

// ─── SERVICE MAP ───
const SERVICE_MAP = {
  'yag deyisme': 'Yağ dəyişmə', 'yag deyisimi': 'Yağ dəyişmə',
  'yag filter': 'Yağ və filter dəyişmə',
  'filter deyisme': 'Filter dəyişmə',
  'hava filteri': 'Hava filteri dəyişmə',
  'salon filteri': 'Salon filteri dəyişmə',
  'antifriz deyisme': 'Antifriz dəyişmə', 'antifriz': 'Antifriz dəyişmə',
  'padveska': 'Padveska təmiri', 'padveska temiri': 'Padveska təmiri',
  'tormoz bendi': 'Tormoz bəndi dəyişmə', 'tormoz': 'Tormoz bəndi dəyişmə',
  'disk yonma': 'Disk yonma',
  'akumulyator': 'Akkumulyator dəyişmə', 'akkumulyator': 'Akkumulyator dəyişmə', 'batareya': 'Akkumulyator dəyişmə',
  'sham deyisme': 'Şam dəyişmə', 'buji': 'Şam dəyişmə',
  'diagnostika': 'Diagnostika', 'diaqnostika': 'Diagnostika',
  'elektrik': 'Elektrik işi',
  'kondisioner': 'Kondisioner qazı',
  'rulavoy': 'Rul işi',
  'muherrik temiri': 'Mühərrik təmiri',
  'karobka': 'Karobka təmiri',
  'transmissiya': 'Transmissiya təmiri',
};

const SERVICE_KEYWORDS = [
  'yağ dəyişmə', 'yag deyisme', 'yag deyisimi', 'yag filter',
  'filter deyisme', 'hava filteri', 'salon filteri',
  'antifriz deyisme', 'antifriz',
  'padveska temiri', 'padveska',
  'tormoz bendi', 'tormoz',
  'disk yonma', 'akumulyator', 'akkumulyator', 'batareya',
  'sham deyisme', 'buji',
  'diagnostika', 'diaqnostika',
  'elektrik',
  'kondisioner',
  'rulavoy',
  'muherrik temiri',
  'karobka', 'transmissiya',
  'servis', 'təmir', 'temiri', 'deyisme', 'deyisimi',
];

const STOCK_IN_KEYWORDS  = ['geldi', 'gəldi', 'alindi', 'alındı', 'elave edildi', 'əlavə edildi', 'anbara', 'giriş', 'giris', 'daxil oldu', 'yuklenib', 'stok geldi'];
const STOCK_OUT_KEYWORDS = ['satildi', 'satıldı', 'istifade edildi', 'istifadə edildi', 'sarf edildi', 'cixdi', 'çıxdı', 'verildi', 'anbardan cixdi', 'anbardan çıxdı', 'cixis', 'çıxış'];
const SALE_KEYWORDS = ['satildi', 'satıldı', 'satış', 'satis', 'müşteriye verildi', 'müştəriyə verildi'];

const AZ_MONTHS = {
  'yanvar': 1, 'yan': 1, 'fevral': 2, 'fev': 2, 'mart': 3, 'mar': 3,
  'aprel': 4, 'apr': 4, 'may': 5, 'iyun': 6, 'iyul': 7,
  'avqust': 8, 'avq': 8, 'sentyabr': 9, 'sen': 9, 'oktyabr': 10, 'okt': 10,
  'noyabr': 11, 'noy': 11, 'dekabr': 12, 'dek': 12,
};

// ─── Helpers ───
function norm(s) {
  return (s || '').toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
}

function normalizeService(text) {
  if (!text) return null;
  const lower = norm(text);
  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    const nk = norm(key);
    if (lower.includes(nk) || nk.includes(lower)) return val;
  }
  return text;
}

function extractPrice(text) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:azn|manat|₼|m\b)/gi,
    /(?:azn|manat|₼)\s*(\d+(?:[.,]\d+)?)/gi,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return parseFloat(m[1].replace(',', '.'));
  }
  const standaloneNum = /\b(\d{2,4})\b/.exec(text);
  if (standaloneNum) {
    const n = parseInt(standaloneNum[1]);
    if (n >= 10 && n <= 5000) return n;
  }
  return null;
}

function extractPlate(text) {
  const m = /\b(\d{2}[A-Za-z]{2}\d{3}|\d{2}-[A-Za-z]{2}-\d{3})\b/i.exec(text);
  return m ? m[1].toUpperCase() : null;
}

function extractDate(text) {
  const lower = (text || '').toLowerCase();
  const today = new Date();
  if (/\bbu\s*g[üu]n\b/i.test(lower) || /\bbugun\b/i.test(lower)) return today.toISOString().split('T')[0];
  if (/\bdun[əe]n\b/i.test(lower) || /\bdunen\b/i.test(lower)) {
    const y = new Date(today); y.setDate(y.getDate() - 1); return y.toISOString().split('T')[0];
  }
  const ddmmyyyy = /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})\b/.exec(lower);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${String(ddmmyyyy[2]).padStart(2,'0')}-${String(ddmmyyyy[1]).padStart(2,'0')}`;
  const ddmm = /\b(\d{1,2})[.\-\/](\d{1,2})\b/.exec(lower);
  if (ddmm) return `${today.getFullYear()}-${String(ddmm[2]).padStart(2,'0')}-${String(ddmm[1]).padStart(2,'0')}`;
  return null;
}

function extractQty(text) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:ədəd|edet|eded|litr|l\b|kg|kq|metr|qutu|dəst|dest|cüt|banka)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:dəfə|defe|x)\s/i,
    /(\d+(?:[.,]\d+)?)\s*(?:dene|dənə)/i,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return parseFloat(m[1].replace(',', '.'));
  }
  return 1;
}

function extractUnit(text) {
  const m = /(\d+(?:[.,]\d+)?)\s*(ədəd|edet|eded|litr|l\b|kg|kq|metr|qutu|dəst|dest|cüt|banka)/i.exec(text);
  if (m) {
    const u = m[2].toLowerCase();
    if (['l', 'litr'].includes(u)) return 'litr';
    if (['kg', 'kq'].includes(u)) return 'kg';
    if (['eded', 'edet', 'ədəd'].includes(u)) return 'ədəd';
    return u;
  }
  return 'ədəd';
}

// ─── Main parse function ───
function parseUniversal(input) {
  if (!input || !input.trim()) return { success: false, error: 'Boş mətn' };

  const text = input.trim();
  const lower = norm(text);
  const today = new Date().toISOString().split('T')[0];

  // Detect intent
  let intent = 'servis';
  let confidence = 0;

  // Check stock in/out
  for (const kw of STOCK_IN_KEYWORDS) {
    if (lower.includes(norm(kw))) { intent = 'stok_giris'; confidence += 40; break; }
  }
  if (intent === 'servis') {
    for (const kw of STOCK_OUT_KEYWORDS) {
      if (lower.includes(norm(kw))) { intent = 'stok_cixis'; confidence += 40; break; }
    }
  }
  // Check sale
  if (intent === 'servis') {
    for (const kw of SALE_KEYWORDS) {
      if (lower.includes(norm(kw))) { intent = 'satis'; confidence += 40; break; }
    }
  }

  // Find brand
  let carBrand = null, brandKey = null;
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(text.toLowerCase())) {
      carBrand = val; brandKey = key; confidence += 30; break;
    }
  }

  // Find service
  let serviceType = null;
  for (const kw of SERVICE_KEYWORDS) {
    if (lower.includes(norm(kw))) { serviceType = normalizeService(kw); confidence += 30; break; }
  }

  // If service found and intent is still default, keep it as servis
  if (serviceType && intent === 'servis') confidence += 20;

  const plate = extractPlate(text);
  if (plate) confidence += 10;

  const price = extractPrice(text);
  if (price !== null) confidence += 20;

  const date = extractDate(text) || today;
  const qty = extractQty(text);
  const unit = extractUnit(text);

  // Extract customer name (simple: first capitalized word that's not a brand)
  let customerName = null;
  const firstWord = /^([A-ZƏÇĞİÖŞÜ][a-zəçğıöşü]{2,})/.exec(text);
  if (firstWord) {
    const w = firstWord[1].toLowerCase();
    const isBrand = Object.keys(BRAND_MAP).some(b => w.includes(b));
    if (!isBrand) customerName = firstWord[1];
  }

  // Extract phone
  let customerPhone = null;
  const phoneMatch = /(\+994|0)?\s*(50|51|55|70|77|99|10|60)\s*\d{3}\s*\d{2}\s*\d{2}/.exec(text);
  if (phoneMatch) customerPhone = phoneMatch[0].replace(/\s+/g, '');

  // For stock/sale intents, try to extract product name
  let productName = null;
  if (intent !== 'servis') {
    // Remove known keywords and extract remaining as product name
    let remaining = text;
    [...STOCK_IN_KEYWORDS, ...STOCK_OUT_KEYWORDS, ...SALE_KEYWORDS].forEach(kw => {
      remaining = remaining.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    });
    // Remove price, qty patterns
    remaining = remaining.replace(/\d+\s*(azn|manat|₼|m\b)/gi, '').replace(/\d+\s*(ədəd|edet|litr|kg)/gi, '').trim();
    remaining = remaining.replace(/\s+/g, ' ').trim();
    if (remaining.length > 1) productName = remaining;
  }

  return {
    success: true,
    usedAI: false,
    data: {
      intent,
      confidence: Math.min(confidence, 100),
      car_brand: carBrand,
      car_model: null,
      car_plate: plate,
      customer_name: customerName,
      customer_phone: customerPhone,
      service_type: serviceType,
      extra_services: null,
      quantity: qty,
      unit_price: price,
      price,
      date,
      notes: null,
      product_name: productName,
      qty,
      unit,
      buy_price: null,
      sell_price: intent === 'satis' ? price : null,
      raw_input: text,
    }
  };
}

module.exports = { parseUniversal };
