const { normalizeBrand, normalizeService, extractPrice, extractPlate, BRAND_MAP, SERVICE_MAP } = require('./normalizer');
const { extractDateFromText } = require('./date-parser');

const SERVICE_KEYWORDS = [
  'yağ dəyişmə', 'yag deyisme', 'yag deyisimi', 'yag deyiwme', 'yag filter',
  'filter deyisme', 'filter deyisimi', 'hava filteri', 'salon filteri', 'yağ filteri',
  'antifriz deyisme', 'antifriz deyisimi', 'antfriz', 'antifriz',
  'padveska temiri', 'padveska', 'on padveska', 'arxa padveska', 'asqi temiri',
  'tormoz bendi', 'tormoz bəndi', 'tormoz',
  'disk yonma', 'akumulyator', 'akkumulyator', 'batareya',
  'sham deyisme', 'şam deyisme', 'buji',
  'diagnostika', 'diaqnostika',
  'elektrik isi', 'elektrik',
  'kondisioner gazi', 'kondisioner',
  'rulavoy', 'rul isi',
  'muherrik temiri', 'mühərrik temiri',
  'karobka', 'transmissiya', 'vitez qutusu',
  'servis', 'təmir', 'temiri', 'deyisme', 'deyisimi',
];

const NAME_INDICATORS = [
  'ucun', 'üçün', 'için', 'adina', 'adına', 'müşteri', 'musteri', 'sahib',
];

function findBrandInText(text) {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      return { brand: val, key };
    }
  }
  return null;
}

function findServiceInText(text) {
  const lower = text.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');

  for (const keyword of SERVICE_KEYWORDS) {
    const normKey = keyword.toLowerCase()
      .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    if (lower.includes(normKey)) {
      return normalizeService(keyword);
    }
  }
  return null;
}

function extractCustomerName(text, brandKey) {
  let remaining = text;
  if (brandKey) {
    remaining = remaining.replace(new RegExp(brandKey, 'gi'), '').trim();
  }

  for (const indicator of NAME_INDICATORS) {
    const pattern = new RegExp(`([A-Za-zƏəÇçĞğİiÖöŞşÜü][a-zəçğıöşü]+)\\s+${indicator}\\b`, 'i');
    const match = pattern.exec(remaining);
    if (match) return match[1];

    const pattern2 = new RegExp(`${indicator}\\s+([A-Za-zƏəÇçĞğİiÖöŞşÜü][a-zəçğıöşü]+)`, 'i');
    const match2 = pattern2.exec(remaining);
    if (match2) return match2[1];
  }

  const possessivePattern = /([A-ZƏÇĞİÖŞÜ][a-zəçğıöşü]{2,})(?:in|ın|un|ün|nin|nın|nun|nün)(?:\s+(?:maşını|avtomobili|mexanizmi))?/;
  const possMatch = possessivePattern.exec(text);
  if (possMatch) return possMatch[1];

  // Try to find a name at the beginning of the sentence if no other indicators found
  const firstWordMatch = /^([A-ZƏÇĞİÖŞÜ][a-zəçğıöşü]+)(?:\s+|$)/.exec(text);
  if (firstWordMatch) {
    const word = firstWordMatch[1];
    // Check if it's not a brand or service keyword (simple check)
    const isBrand = Object.keys(BRAND_MAP).some(b => word.toLowerCase().includes(b));
    const isService = SERVICE_KEYWORDS.some(s => word.toLowerCase().includes(s.split(' ')[0]));
    
    if (!isBrand && !isService && word.length > 2) {
      return word;
    }
  }

  return null;
}

function extractModel(text, brandKey) {
  if (!brandKey) return null;

  const brandPos = text.toLowerCase().indexOf(brandKey.toLowerCase());
  if (brandPos === -1) return null;

  const afterBrand = text.slice(brandPos + brandKey.length).trim();
  const modelPatterns = [
    /^([A-Z]\d+\s*\w*)/i,
    /^([A-Z]\d{2,3}[a-z]?)/i,
    /^(\w+\s+(?:series|seriya|serisi))/i,
    /^(\d{3,4}[a-z]?)/i,
    /^([A-Za-z]\w{0,8})\s/i,
  ];

  for (const pattern of modelPatterns) {
    const match = pattern.exec(afterBrand);
    if (match) {
      const candidate = match[1].trim();
      if (candidate.length > 1 && !/\d{2}[.\-\/]\d{2}/.test(candidate) &&
          !Object.keys(SERVICE_MAP).some(k => candidate.toLowerCase().includes(k.toLowerCase().slice(0, 4)))) {
        return candidate;
      }
    }
  }
  return null;
}

function extractServiceQty(text) {
  // "2 dəfə yağ dəyişmə", "3x filter", "2 ədəd"
  const patterns = [
    /(\d+)\s*(?:dəfə|defe|x)\s/i,
    /(\d+)\s*(?:ədəd|edet|eded)\s/i,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return parseInt(m[1], 10);
  }
  return 1;
}

function ruleBasedParse(input) {
  if (!input || input.trim().length === 0) return null;

  const text = input.trim();
  const result = {
    car_brand: null,
    car_model: null,
    car_plate: null,
    customer_name: null,
    customer_phone: null,
    service_type: null,
    extra_services: null,
    quantity: 1,
    unit_price: null,
    price: null,
    date: null,
    notes: null,
    confidence: 0,
    raw_input: text,
  };

  const plate = extractPlate(text);
  if (plate) result.car_plate = plate;

  const brandResult = findBrandInText(text);
  if (brandResult) {
    result.car_brand = brandResult.brand;
    result.confidence += 30;

    const model = extractModel(text, brandResult.key);
    if (model) {
      result.car_model = model;
      result.confidence += 15;
    }
  }

  const service = findServiceInText(text);
  if (service) {
    result.service_type = service;
    result.confidence += 30;
  }

  // Extract quantity
  const qty = extractServiceQty(text);
  result.quantity = qty;

  const price = extractPrice(text);
  if (price !== null) {
    result.price = price;
    // If quantity > 1, calculate unit price
    if (qty > 1) {
      result.unit_price = price / qty;
    } else {
      result.unit_price = price;
    }
    result.confidence += 20;
  }

  const dateResult = extractDateFromText(text);
  if (dateResult) {
    result.date = dateResult.date;
    result.confidence += 10;
  } else {
    result.date = new Date().toISOString().split('T')[0];
  }

  const customerName = extractCustomerName(text, brandResult?.key);
  if (customerName) {
    result.customer_name = customerName;
    result.confidence += 10;
  }

  // Extract phone number
  const phoneMatch = /(\+994|0)?\s*(50|51|55|70|77|99|10|60)\s*\d{3}\s*\d{2}\s*\d{2}/.exec(text);
  if (phoneMatch) {
    result.customer_phone = phoneMatch[0].replace(/\s+/g, '');
    result.confidence += 10;
  }

  return result;
}

const STOCK_IN_KEYWORDS  = ['geldi', 'gəldi', 'alindi', 'alındı', 'elave edildi', 'əlavə edildi', 'anbara geldi', 'anbara gəldi', 'giriş', 'giris', 'daxil oldu', 'yuklenib', 'yüklənib', 'stok geldi'];
const STOCK_OUT_KEYWORDS = ['satildi', 'satıldı', 'istifade edildi', 'istifadə edildi', 'sarf edildi', 'xerclenib', 'xərclənib', 'cixdi', 'çıxdı', 'verildi', 'anbardan cixdi', 'anbardan çıxdı', 'cixis', 'çıxış'];

const PRODUCT_HINTS = [
  'yag', 'yağ', 'motor yagi', 'motor yağı', 'filtr', 'filter', 'hava filteri',
  'antifriz', 'tormoz mayesi', 'akkumulyator', 'şam', 'sham', 'buji',
  'şüşə suyu', 'suse suyu', 'kondisioner qazi', 'kondisioner qazı',
  'biskvit', 'disk', 'kəmər', 'kemer', 'maye',
];

function extractQty(text) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:ədəd|edet|eded|eded|litr|l\b|kg|kq|metr|qutu|dəst|dest|cüt|cut|banka)/i,
    /(\d+(?:[.,]\d+)?)\s+(?:dene|dənə|dona|dōna)/i,
    /(\d+(?:[.,]\d+)?)\s*x\s*/i,
    /(\d+(?:[.,]\d+)?)/,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return parseFloat(m[1].replace(',', '.'));
  }
  return 1;
}

function extractUnit(text) {
  const m = /(\d+(?:[.,]\d+)?)\s*(ədəd|edet|eded|litr|l\b|kg|kq|metr|qutu|dəst|dest|cüt|cut|banka)/i.exec(text);
  if (m) {
    const u = m[2].toLowerCase();
    if (['l', 'litr'].includes(u)) return 'litr';
    if (['kg', 'kq'].includes(u)) return 'kg';
    if (['eded', 'edet', 'ədəd'].includes(u)) return 'ədəd';
    return u;
  }
  return 'ədəd';
}

function findProductInText(text) {
  const lower = text.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
  for (const hint of PRODUCT_HINTS) {
    const norm = hint.replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    if (lower.includes(norm)) return hint;
  }
  return null;
}

function parseInventoryInput(input) {
  if (!input || input.trim().length === 0) return null;

  const text = input.trim();
  const lower = text.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');

  let movementType = null;
  for (const kw of STOCK_IN_KEYWORDS) {
    const norm = kw.replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    if (lower.includes(norm)) { movementType = 'giris'; break; }
  }
  if (!movementType) {
    for (const kw of STOCK_OUT_KEYWORDS) {
      const norm = kw.replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
      if (lower.includes(norm)) { movementType = 'cixis'; break; }
    }
  }

  if (!movementType) return null;

  const qty = extractQty(text);
  const unit = extractUnit(text);
  const product = findProductInText(text);

  return {
    intent: 'inventory',
    movement_type: movementType,
    product_hint: product,
    qty,
    unit,
    raw_input: text,
    confidence: product ? 70 : 40,
  };
}

module.exports = { ruleBasedParse, findBrandInText, findServiceInText, parseInventoryInput };
