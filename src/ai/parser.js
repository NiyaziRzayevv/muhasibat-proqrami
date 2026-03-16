const { ruleBasedParse, parseInventoryInput } = require('./rule-parser');
const { aiParse, aiParseUniversal } = require('./ai-parser');
const { getSetting } = require('../database/settings');

async function parseInput(input) {
  if (!input || input.trim().length === 0) {
    return { success: false, error: 'Boş mətn' };
  }

  const ruleResult = ruleBasedParse(input);

  const useAI = getSetting('use_ai_parser') === 'true';
  const apiKey = getSetting('openai_api_key');
  const shouldCallAI = useAI && apiKey && apiKey.trim() !== ''; // Always call AI if enabled

  let finalResult = ruleResult;
  let usedAI = false;

  if (shouldCallAI) {
    try {
      const aiResult = await aiParse(input);
      if (aiResult) {
        usedAI = true;
        finalResult = mergeResults(ruleResult, aiResult);
      }
    } catch (err) {
      console.error('AI fallback error:', err.message);
    }
  }

  return {
    success: true,
    data: finalResult,
    usedAI,
    confidence: finalResult?.confidence || 0,
  };
}

function mergeResults(ruleResult, aiResult) {
  const merged = { ...ruleResult };

  if (aiResult.car_brand && !ruleResult.car_brand) merged.car_brand = aiResult.car_brand;
  if (aiResult.car_model && !ruleResult.car_model) merged.car_model = aiResult.car_model;
  if (aiResult.car_plate && !ruleResult.car_plate) merged.car_plate = aiResult.car_plate;
  if (aiResult.customer_name && !ruleResult.customer_name) merged.customer_name = aiResult.customer_name;
  if (aiResult.service_type && !ruleResult.service_type) merged.service_type = aiResult.service_type;
  if (aiResult.date && !ruleResult.date) merged.date = aiResult.date;
  if (aiResult.notes && !ruleResult.notes) merged.notes = aiResult.notes;

  if (aiResult.price !== null && aiResult.price !== undefined && ruleResult.price === null) {
    merged.price = aiResult.price;
  }

  merged.confidence = Math.min(100, (ruleResult.confidence || 0) + 20);

  return merged;
}

function parseInventory(input) {
  if (!input || input.trim().length === 0) return { success: false, error: 'Boş mətn' };
  const result = parseInventoryInput(input);
  if (!result) return { success: false, error: 'Anbar əməliyyatı tanınmadı' };
  return { success: true, data: result };
}

// ── Rule-based universal intent detector ─────────────────────────────────────
const SERVIS_SIGNALS = [
  'yag', 'yağ', 'filter', 'filtr', 'tormoz', 'padveska', 'antifriz',
  'deyisme', 'dəyişmə', 'temiri', 'təmiri', 'servis', 'diaqnostika',
  'diagnostika', 'akumulyator', 'sham', 'şam', 'buji', 'kondisioner',
  'karobka', 'transmissiya', '77', '10', '99', 'aa-', 'bp-',
];
const STOK_GIRIS_SIGNALS = [
  'anbara', 'geldi', 'gəldi', 'alindi', 'alındı', 'giriş', 'giris',
  'yuklenib', 'yüklənib', 'daxil oldu', 'elave edildi', 'stok geldi',
];
const STOK_CIXIS_SIGNALS = [
  'anbardan', 'cixdi', 'çıxdı', 'istifade edildi', 'istifadə edildi',
  'sarf edildi', 'xerclenib', 'xərclənib', 'cixis', 'çıxış', 'verildi',
];
const SATIS_SIGNALS = [
  'satildi', 'satıldı', 'satis', 'satış', 'satdim', 'satdım',
  'müştəriyə verildi', 'muşteriye verildi',
];
const MUSTERI_SIGNALS = [
  'musteri', 'müştəri', 'yeni adam', 'telefon', 'nomre', 'nömrə',
  'adini yaz', 'adını yaz', 'qeyde al', 'qeydə al',
];
const BRAND_SIGNALS = [
  'mercedes', 'bmw', 'toyota', 'kia', 'hyundai', 'honda', 'nissan',
  'opel', 'volkswagen', 'vw', 'audi', 'ford', 'chevrolet', 'lada',
  'lexus', 'subaru', 'suzuki', 'mitsubishi', 'renault', 'peugeot',
  'skoda', 'volvo', 'porsche', 'tesla', 'jeep', 'dodge',
];

function ruleDetectIntent(text) {
  const lower = text.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');

  const has = (signals) => signals.some(s => {
    const norm = s.replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    return lower.includes(norm);
  });

  if (has(SATIS_SIGNALS)) return 'satis';
  if (has(STOK_GIRIS_SIGNALS)) return 'stok_giris';
  if (has(STOK_CIXIS_SIGNALS)) return 'stok_cixis';
  if (has(MUSTERI_SIGNALS)) return 'musteri';
  if (has(SERVIS_SIGNALS) || has(BRAND_SIGNALS)) return 'servis';
  return null;
}

async function parseUniversal(input) {
  if (!input || input.trim().length === 0) {
    return { success: false, error: 'Boş mətn' };
  }

  const hasAI = getSetting('use_ai_parser') === 'true' && getSetting('openai_api_key');
  const today = new Date().toISOString().split('T')[0];

  // Try AI first if available (it gives richer data)
  if (hasAI) {
    try {
      const aiResult = await aiParseUniversal(input);
      if (aiResult && aiResult.intent && aiResult.intent !== 'unknown') {
        return { success: true, data: aiResult, usedAI: true };
      }
    } catch (e) {
      console.warn('AI parse failed, falling back to rule:', e.message);
    }
  }

  // Rule-based fallback
  const ruleIntent = ruleDetectIntent(input);
  if (!ruleIntent) {
    return { success: false, error: 'Mətn başa düşülmədi. Daha ətraflı yazın.' };
  }

  if (ruleIntent === 'servis') {
    const ruleResult = ruleBasedParse(input);
    return {
      success: true,
      usedAI: false,
      data: { intent: 'servis', confidence: ruleResult.confidence, ...ruleResult },
    };
  }

  if (ruleIntent === 'stok_giris' || ruleIntent === 'stok_cixis') {
    const inv = parseInventoryInput(input);
    return {
      success: true,
      usedAI: false,
      data: {
        intent: inv ? inv.movement_type === 'giris' ? 'stok_giris' : 'stok_cixis' : ruleIntent,
        confidence: inv?.confidence || 50,
        product_name: inv?.product_hint || null,
        qty: inv?.qty || null,
        unit: inv?.unit || 'ədəd',
        date: today,
        raw_input: input,
      },
    };
  }

  if (ruleIntent === 'satis') {
    const inv = parseInventoryInput(input);
    // extract price if present
    const priceMatch = /(\d+(?:[.,]\d+)?)\s*(?:manat|azn|₼)/i.exec(input);
    return {
      success: true,
      usedAI: false,
      data: {
        intent: 'satis',
        confidence: 60,
        product_name: inv?.product_hint || null,
        qty: inv?.qty || null,
        unit: inv?.unit || 'ədəd',
        sell_price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null,
        date: today,
        raw_input: input,
      },
    };
  }

  if (ruleIntent === 'musteri') {
    const phoneMatch = /(\+?994|0)?[\s-]?(\d{2})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})/.exec(input);
    const nameMatch = /([A-ZƏÇĞİÖŞÜ][a-zəçğıöşü]+(?:\s+[A-ZƏÇĞİÖŞÜ][a-zəçğıöşü]+)?)/.exec(input);
    return {
      success: true,
      usedAI: false,
      data: {
        intent: 'musteri',
        confidence: 60,
        customer_name: nameMatch?.[0] || null,
        customer_phone: phoneMatch?.[0] || null,
        date: today,
        raw_input: input,
      },
    };
  }

  return { success: false, error: 'Mətn başa düşülmədi' };
}

module.exports = { parseInput, parseInventory, parseUniversal };
