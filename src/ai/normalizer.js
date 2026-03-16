const BRAND_MAP = {
  'mercedes': 'Mercedes', 'mecedes': 'Mercedes', 'mersedes': 'Mercedes',
  'merсedes': 'Mercedes', 'mersedez': 'Mercedes', 'merc': 'Mercedes',
  'bmw': 'BMW', 'bim': 'BMW', 'bimmer': 'BMW',
  'audi': 'Audi', 'avdi': 'Audi', 'avdy': 'Audi',
  'toyota': 'Toyota', 'toyata': 'Toyota', 'toyta': 'Toyota',
  'honda': 'Honda', 'hunda': 'Honda',
  'hyundai': 'Hyundai', 'xundai': 'Hyundai', 'hyundaı': 'Hyundai', 'hundai': 'Hyundai',
  'kia': 'Kia', 'kıa': 'Kia',
  'nissan': 'Nissan', 'nisan': 'Nissan',
  'volkswagen': 'Volkswagen', 'vw': 'Volkswagen', 'volkvagen': 'Volkswagen',
  'opel': 'Opel', 'opal': 'Opel',
  'ford': 'Ford',
  'chevrolet': 'Chevrolet', 'shevrolet': 'Chevrolet', 'aveo': 'Chevrolet',
  'lada': 'Lada', 'vaz': 'Lada', 'jiguli': 'Lada',
  'renault': 'Renault', 'reno': 'Renault',
  'peugeot': 'Peugeot', 'pyejo': 'Peugeot', 'pejo': 'Peugeot',
  'citroen': 'Citroën', 'sitroyen': 'Citroën',
  'fiat': 'Fiat',
  'mitsubishi': 'Mitsubishi', 'mitsubisi': 'Mitsubishi',
  'mazda': 'Mazda',
  'subaru': 'Subaru',
  'lexus': 'Lexus',
  'infiniti': 'Infiniti', 'infinity': 'Infiniti',
  'acura': 'Acura',
  'land rover': 'Land Rover', 'landrover': 'Land Rover', 'rover': 'Land Rover',
  'range rover': 'Range Rover', 'rangerover': 'Range Rover',
  'volvo': 'Volvo',
  'skoda': 'Skoda', 'shkoda': 'Skoda',
  'seat': 'Seat',
  'porsche': 'Porsche', 'porsh': 'Porsche',
  'jeep': 'Jeep',
  'dodge': 'Dodge',
  'chrysler': 'Chrysler',
  'cadillac': 'Cadillac',
  'buick': 'Buick',
  'lincoln': 'Lincoln',
  'tesla': 'Tesla',
  'suzuki': 'Suzuki', 'suzuky': 'Suzuki',
  'dacia': 'Dacia',
  'alfa romeo': 'Alfa Romeo', 'alfaromeo': 'Alfa Romeo',
  'geely': 'Geely',
  'chery': 'Chery', 'çeri': 'Chery',
  'byd': 'BYD',
  'gac': 'GAC',
  'haval': 'Haval',
  'great wall': 'Great Wall',
  'ssangyong': 'SsangYong',
  'daewoo': 'Daewoo', 'devo': 'Daewoo',
};

const SERVICE_MAP = {
  'yag deyisme': 'Yağ dəyişmə',
  'yag deyisimi': 'Yağ dəyişmə',
  'yag deyishme': 'Yağ dəyişmə',
  'yag deyiwme': 'Yağ dəyişmə',
  'yağ deyişmə': 'Yağ dəyişmə',
  'yağ dəyişmə': 'Yağ dəyişmə',
  'mühərrik yağı': 'Yağ dəyişmə',
  'muherrik yagi': 'Yağ dəyişmə',
  'muherrik yag': 'Yağ dəyişmə',
  'yag ve filter': 'Yağ və filter dəyişmə',
  'yag filter': 'Yağ və filter dəyişmə',
  'yağ filter': 'Yağ və filter dəyişmə',
  'filter deyisme': 'Filter dəyişmə',
  'filter deyisimi': 'Filter dəyişmə',
  'yag filteri': 'Yağ filteri dəyişmə',
  'hava filteri': 'Hava filteri dəyişmə',
  'salon filteri': 'Salon filteri dəyişmə',
  'antifriz deyisme': 'Antifriz dəyişmə',
  'antifriz deyisimi': 'Antifriz dəyişmə',
  'antifriz deyishme': 'Antifriz dəyişmə',
  'antfriz': 'Antifriz dəyişmə',
  'antifriz': 'Antifriz dəyişmə',
  'padveska temiri': 'Padveska təmiri',
  'padveska': 'Padveska təmiri',
  'on padveska': 'Ön padveska təmiri',
  'arxa padveska': 'Arxa padveska təmiri',
  'asqi temiri': 'Asqı təmiri',
  'tormoz bendi': 'Tormoz bəndi dəyişmə',
  'tormoz': 'Tormoz bəndi dəyişmə',
  'disk yonma': 'Disk yonma',
  'disk': 'Disk yonma',
  'akumulyator deyisme': 'Akkumulyator dəyişmə',
  'akumulyator': 'Akkumulyator dəyişmə',
  'akkumulyator': 'Akkumulyator dəyişmə',
  'batareya': 'Akkumulyator dəyişmə',
  'şam deyisme': 'Şam dəyişmə',
  'sham deyisme': 'Şam dəyişmə',
  'buji': 'Şam dəyişmə',
  'diagnostika': 'Diagnostika',
  'diaqnostika': 'Diagnostika',
  'elektrik isi': 'Elektrik işi',
  'elektrik': 'Elektrik işi',
  'kondisioner gazi': 'Kondisioner qazı',
  'kondisioner': 'Kondisioner qazı',
  'rulavoy': 'Rul işi',
  'rul': 'Rul işi',
  'mühərrik temiri': 'Mühərrik təmiri',
  'muherrik temiri': 'Mühərrik təmiri',
  'karobka': 'Karobka təmiri',
  'transmissiya': 'Transmissiya təmiri',
  'vitez qutusu': 'Vitez qutusu təmiri',
};

function normalizeBrand(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  if (BRAND_MAP[lower]) return BRAND_MAP[lower];
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (lower.includes(key)) return val;
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function normalizeService(text) {
  if (!text) return null;
  const lower = text.toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .trim();

  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    const normKey = key.toLowerCase()
      .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    if (lower.includes(normKey) || normKey.includes(lower)) return val;
  }
  return text;
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\btemiri\b/gi, 'təmiri')
    .replace(/\bdeyi[sş]m[ea]\b/gi, 'dəyişmə')
    .replace(/\bdeyi[sş]imi\b/gi, 'dəyişmə')
    .replace(/\byag\b/gi, 'yağ')
    .replace(/\bantfriz\b/gi, 'antifriz')
    .replace(/\bpadveska\b/gi, 'padveska');
}

function extractPrice(text) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:azn|manat|₼|m\b)/gi,
    /(?:azn|manat|₼)\s*(\d+(?:[.,]\d+)?)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:qepik|qəpik)/gi,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  const standaloneNum = /\b(\d{2,4})\b/.exec(text);
  if (standaloneNum) {
    const num = parseInt(standaloneNum[1]);
    if (num >= 10 && num <= 5000) return num;
  }
  return null;
}

function extractPlate(text) {
  const platePattern = /\b(\d{2}[A-Za-z\u0041-\u007A]{2}\d{3}|\d{2}-[A-Za-z]{2}-\d{3}|[A-Za-z]{2}\d{3}[A-Za-z]{2}|\b\d{2}[A-Z]{2}\d{3}\b)\b/i;
  const match = platePattern.exec(text);
  return match ? match[1].toUpperCase() : null;
}

module.exports = { normalizeBrand, normalizeService, normalizeText, extractPrice, extractPlate, BRAND_MAP, SERVICE_MAP };
