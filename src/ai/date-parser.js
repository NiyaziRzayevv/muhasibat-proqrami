const AZ_MONTHS = {
  'yanvar': 1, 'yan': 1, 'january': 1, 'jan': 1,
  'fevral': 2, 'fev': 2, 'february': 2, 'feb': 2,
  'mart': 3, 'mar': 3, 'march': 3,
  'aprel': 4, 'apr': 4, 'april': 4,
  'may': 5,
  'iyun': 6, 'june': 6, 'jun': 6,
  'iyul': 7, 'july': 7, 'jul': 7,
  'avqust': 8, 'avq': 8, 'august': 8, 'aug': 8,
  'sentyabr': 9, 'sen': 9, 'september': 9, 'sep': 9,
  'oktyabr': 10, 'okt': 10, 'october': 10, 'oct': 10,
  'noyabr': 11, 'noy': 11, 'november': 11, 'nov': 11,
  'dekabr': 12, 'dek': 12, 'december': 12, 'dec': 12,
};

function padDate(d, m, y) {
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const yyyy = y ? String(y) : String(new Date().getFullYear());
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const today = new Date();

  if (/\bbu\s*g[üu]n\b/i.test(lower) || /\bbugun\b/i.test(lower)) {
    return today.toISOString().split('T')[0];
  }
  if (/\bsabah\b/i.test(lower)) {
    const tom = new Date(today); tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  }
  if (/\bd[üu]n[əe]n\b/i.test(lower) || /\bdunen\b/i.test(lower)) {
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    return yest.toISOString().split('T')[0];
  }

  const ddmmyyyy = /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})\b/.exec(lower);
  if (ddmmyyyy) {
    return padDate(ddmmyyyy[1], ddmmyyyy[2], ddmmyyyy[3]);
  }

  const ddmm = /\b(\d{1,2})[.\-\/](\d{1,2})\b/.exec(lower);
  if (ddmm) {
    return padDate(ddmm[1], ddmm[2], today.getFullYear());
  }

  for (const [monthName, monthNum] of Object.entries(AZ_MONTHS)) {
    const patternDay = new RegExp(`(\\d{1,2})\\s*(?:${monthName})(?:ın|in|un|ün|n|'?ı|'?i|'?u|'?ü)?\\s*(\\d{4})?`, 'i');
    const matchDay = patternDay.exec(lower);
    if (matchDay) {
      return padDate(matchDay[1], monthNum, matchDay[2] || today.getFullYear());
    }

    const patternMonth = new RegExp(`(?:${monthName})(?:ın|in|un|ün|n)?(?:'?ı|'?i|'?u|'?ü)?\\s*(\\d{1,2})(?:[-ı i u ü]|'?ı|'?i|'?u|'?ü|ncu|nü|inci|üncü)?\\s*(\\d{4})?`, 'i');
    const matchMonth = patternMonth.exec(lower);
    if (matchMonth) {
      return padDate(matchMonth[1], monthNum, matchMonth[2] || today.getFullYear());
    }
  }

  const ayinX = /\bay[ı]n\s*(\d{1,2})(?:[- ](s[iı]|ü|u|cu|cü|ncu|ncü)?)?/i.exec(lower);
  if (ayinX) {
    return padDate(ayinX[1], today.getMonth() + 1, today.getFullYear());
  }

  const buAyinX = /\bbu\s*ay[ı]n\s*(\d{1,2})/i.exec(lower);
  if (buAyinX) {
    return padDate(buAyinX[1], today.getMonth() + 1, today.getFullYear());
  }

  return null;
}

function extractDateFromText(text) {
  const segments = text.split(/\s+/);
  for (let i = 0; i < segments.length; i++) {
    const window2 = segments.slice(i, i + 2).join(' ');
    const window3 = segments.slice(i, i + 3).join(' ');
    const window4 = segments.slice(i, i + 4).join(' ');

    for (const w of [window4, window3, window2, segments[i]]) {
      const result = parseDate(w);
      if (result) return { date: result, matched: w };
    }
  }
  return null;
}

module.exports = { parseDate, extractDateFromText, AZ_MONTHS };
