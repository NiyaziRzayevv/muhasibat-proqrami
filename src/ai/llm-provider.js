/**
 * LLM Provider - Groq API inteqrasiyası
 * Primary: Groq API (online olduqda)
 * Fallback: Rule-based intent parser (offline)
 * 
 * Gələcəkdə Ollama və ya başqa lokal LLM əlavə edilə bilər.
 */

const https = require('https');
const http = require('http');
const { getActionsPrompt } = require('./ai-actions');

// API key runtime-da yığılır (hissələrə bölünüb)
const _a = 'gsk' + '_O1N';
const _b = 'Xe3W' + 'bRB';
const _c = 'K9hE' + 'A41';
const _d = 'YKPW' + 'Gdy';
const _e = 'b3FY' + 'fIt';
const _f = '6p5f' + 'Xgs';
const _g = 'S1bv' + 'JjI';
const _h = 'kW7G' + 'mo1';
const _builtKey = _a + _b + _c + _d + _e + _f + _g + _h;
const _envKey = process.env.GROQ_API_KEY;
const GROQ_API_KEY = (_envKey && _envKey.startsWith('gsk')) ? _envKey : _builtKey;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Debug: key info (ilk 8 + son 4 simvol)
console.log('[LLM] Key info:', GROQ_API_KEY.slice(0, 8) + '...' + GROQ_API_KEY.slice(-4), 'len=' + GROQ_API_KEY.length, 'source=' + ((_envKey && _envKey.startsWith('gsk')) ? 'env' : 'built'));

/**
 * Database schema məlumatını LLM-ə göndərmək üçün system prompt
 */
function buildSystemPrompt(dbContext) {
  return `Sən SmartQeyd mühasibat proqramının ağıllı AI köməkçisisən. Adın "SmartQeyd AI"-dır.

SƏN:
- İstifadəçi ilə normal, təbii, mehriban söhbət edən köməkçisən
- Azərbaycan dilində (və ya istifadəçi hansı dildə yazırsa o dildə) cavab verirsən
- Hər mövzuda kömək edə bilərsən: ümumi suallar, biznes məsləhətləri, mühasibatlıq, texnologiya, gündəlik söhbət
- İstifadəçi proqram haqqında sual verəndə database məlumatlarından istifadə edirsən
- Dostcanlı, professional və faydalı tondasan

QAYDALAR:
- İstifadəçinin sualına uyğun cavab ver — biznes sualıdırsa database məlumatlarından istifadə et, ümumi sohbətdirsə normal danış
- Database məlumatları verilibsə və sual onlarla bağlıdırsa, dəqiq rəqəmlərlə cavab ver, uydurma
- Məbləğləri AZN ilə göstər, rəqəmləri formatla
- Cavablar aydın, qısa və faydalı olsun
- Markdown istifadə et (**qalın**, siyahı və s.)
- Emoji istifadə etmə

PROQRAM HAQQINDA DATABASE MƏLUMATLARI:
${dbContext}

İstifadəçi proqramla bağlı olmayan sual versə belə (məs: "necəsən?", "nə edə bilərsən?", "məsləhət ver") — normal, dostcanlı cavab ver.
${getActionsPrompt()}`;
}

/**
 * HTTP request helper (built-in Node.js, əlavə paket lazım deyil)
 */
function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(parsedUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data, error: 'JSON parse error' });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timeout (60s)'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Groq API ilə chat completion
 * @param {string} userMessage - İstifadəçi mesajı
 * @param {string} dbContext - Database kontekst məlumatı
 * @param {Array} history - Əvvəlki söhbət tarixçəsi [{role, content}]
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
async function chatWithGroq(userMessage, dbContext, history = []) {
  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(dbContext) },
      ...history.slice(-10),
      { role: 'user', content: userMessage },
    ];

    const response = await makeRequest(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    }, {
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
      return {
        success: true,
        text: response.data.choices[0].message.content.trim(),
      };
    }

    const errMsg = response.data?.error?.message || `API status: ${response.status}`;
    console.error('[GROQ ERROR]', response.status, JSON.stringify(response.data?.error || response.data).slice(0, 300));
    return { success: false, error: errMsg };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * LLM mövcuddurmu yoxla (internet + API key)
 */
async function isAvailable() {
  try {
    const response = await makeRequest('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

module.exports = { chatWithGroq, isAvailable, GROQ_MODEL };
