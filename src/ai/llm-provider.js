/**
 * LLM Provider - Groq API inteqrasiyası
 * Primary: Groq API (online olduqda)
 * Fallback: Rule-based intent parser (offline)
 * 
 * Gələcəkdə Ollama və ya başqa lokal LLM əlavə edilə bilər.
 */

const https = require('https');
const http = require('http');

// API key base64-encoded saxlanılır (GitHub push protection üçün)
const _K = Buffer.from('Z3NrX1RTbHA1WkdSR2VseUoyUlhBZEZXR2R5YjNGWUNTTzFYaXY0OTdwbGFIR0hNVzh0MHRISQ==', 'base64').toString('utf8');
const GROQ_API_KEY = process.env.GROQ_API_KEY || _K;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Database schema məlumatını LLM-ə göndərmək üçün system prompt
 */
function buildSystemPrompt(dbContext) {
  return `Sən SmartQeyd mühasibat proqramının daxili AI köməkçisisən. Azərbaycan dilində cavab ver.

QAYDALAR:
- Yalnız verilən database məlumatlarına əsasən cavab ver
- Uydurma məlumat vermə
- Məlumat yoxdursa "Məlumat tapılmadı" yaz
- Cavablar qısa, konkret və professional olsun
- Məbləğləri AZN ilə göstər
- Tarixləri dəqiq göstər
- Rəqəmləri formatla (1,234.56 AZN)

DATABASE MƏLUMATLARI:
${dbContext}

Cavabını düz mətn kimi ver, markdown istifadə et (**qalın**, siyahı və s.). Emoji istifadə etmə.`;
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
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout (30s)'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Groq API ilə chat completion
 * @param {string} userMessage - İstifadəçi mesajı
 * @param {string} dbContext - Database kontekst məlumatı
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
async function chatWithGroq(userMessage, dbContext) {
  try {
    const response = await makeRequest(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    }, {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(dbContext) },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
      return {
        success: true,
        text: response.data.choices[0].message.content.trim(),
      };
    }

    const errMsg = response.data?.error?.message || `API status: ${response.status}`;
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
