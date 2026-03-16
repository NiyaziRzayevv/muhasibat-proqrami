const { getSetting } = require('../database/settings');

const SYSTEM_PROMPT = `Sen Azərbaycan dilindəki xidmət/servis qeydlərini analiz edən bir sistemsən.
İstifadəçi xidmət qeydini yazır, sən isə həmin mətndən strukturlaşdırılmış JSON çıxarırsan.

QAYDALAR:
1. Yalnız JSON qaytarmalısan, heç bir izahat yox
2. Qiymət HEÇ VAXT uydurma - əgər mətndə yoxdursa null qaytar
3. Bilmədiklərini null qaytar
4. Tarix üçün YYYY-MM-DD formatı istifadə et
5. "bu gün", "sabah", "dünən" kimi ifadələri real tarixə çevir
6. Azərbaycan dilindəki səhv yazıları düzəlt
7. Kateqoriya adlarını düzgün yaz (Telefon, Elektronika, Geyim, Aksesuar...)
8. Xidmət adlarını standartlaşdır (Ekran dəyişmə, Batareya dəyişmə, Təmir, Diaqnostika...)

QAYTARILACAQ JSON FORMATI:
{
  "car_brand": "string or null (kateqoriya/növ: Telefon, Elektronika, Geyim və s.)",
  "car_model": "string or null (marka/model: Samsung, Apple, Nike və s.)",
  "car_plate": "string or null (kod/seriya nömrəsi)",
  "customer_name": "string or null",
  "service_type": "string or null",
  "price": number or null,
  "date": "YYYY-MM-DD or null",
  "notes": "string or null"
}

Nümunə:
Input: "Samsung telefon ekran deyisme 09.03.2026 50 manat"
Output: {"car_brand":"Telefon","car_model":"Samsung","car_plate":null,"customer_name":null,"service_type":"Ekran dəyişmə","price":50,"date":"2026-03-09","notes":null}`;

const UNIVERSAL_SYSTEM_PROMPT = `Sən universal biznes idarəetmə sistemi üçün Azərbaycan dilindəki mətnləri analiz edən AI-sən.
İstifadəçinin yazdığı mətni oxu, nə etmək istədiyini anla, strukturlaşdırılmış JSON qaytar.

QAYDALAR:
1. Yalnız JSON qaytarmalısan, heç bir izahat yox
2. Qiymət HEÇ VAXT uydurma - əgər mətndə yoxdursa null qaytar
3. Bilmədiklərini null qaytar
4. Tarix üçün YYYY-MM-DD formatı istifadə et
5. "bu gün", "sabah", "dünən" kimi ifadələri real tarixə çevir
6. Azərbaycan dilindəki səhv yazıları düzəlt

QAYTARILACAQ JSON FORMATI:
{
  "car_brand": "string or null (kateqoriya/növ: Telefon, Elektronika, Geyim və s.)",
  "car_model": "string or null (marka/model: Samsung, Apple, Nike və s.)",
  "car_plate": "string or null (kod/seriya nömrəsi)",
  "customer_name": "string or null",
  "service_type": "string or null",
  "price": number or null,
  "date": "YYYY-MM-DD or null",
  "notes": "string or null"
}

MÖVCUD NİYYƏTLƏR (intent):
- "servis" → xidmət/təmir qeydi (ekran dəyişmə, batareya, təmir, quraşdırma və s.)
- "stok_giris" → anbara məhsul gəldi (geldi, alindi, anbara, giriş, yükləndi)
- "stok_cixis" → anbardan çıxdı (istifadə edildi, verildi, çıxdı, sərfləndi)
- "satis" → məhsul satışı (satıldı, satış, müştəriyə verildi)
- "musteri" → yeni müştəri əlavə et (müştəri, ad, telefon)
- "unknown" → anlaşılmır

QAYTARILACAQ JSON FORMATI:
{
  "intent": "servis|stok_giris|stok_cixis|satis|musteri|unknown",
  "confidence": 0-100,

  "car_brand": null,  // Kateqoriya/Növ: Telefon, Elektronika, Geyim, Maşın və s.
  "car_model": null,  // Marka/Model: Samsung, Apple, Nike, Toyota və s.
  "car_plate": null,  // Kod/Seriya nömrəsi
  "customer_name": null,
  "service_type": null,
  "price": null,
  /* QEYD: satis intent üçün qiyməti sell_price-a yaz, price-a yox */
  "date": null,
  "notes": null,

  "product_name": null,
  "qty": null,
  "unit": null,
  "buy_price": null,
  "sell_price": null
}

QAYDALAR:
1. Yalnız JSON qaytarmalısan
2. Qiymət və miqdar HEÇ VAXT uydurma - mətndə yoxdursa null
3. Tarix YYYY-MM-DD formatında olsun
4. Azərbaycan dilindəki yazı səhvlərini düzəlt
5. Kateqoriya adlarını düzgün yaz (Telefon, Elektronika, Geyim, Aksesuar...)
6. Xidmət adlarını standartlaşdır (Ekran dəyişmə, Batareya dəyişmə, Təmir, Diaqnostika...)

Nümunə:
Input: "Samsung telefon ekran deyisme 09.03.2026 50 manat"
Output: {"car_brand":"Telefon","car_model":"Samsung","car_plate":null,"customer_name":null,"service_type":"Ekran dəyişmə","price":50,"date":"2026-03-09","notes":null}`;

async function aiParseUniversal(input) {
  try {
    const apiKey = getSetting('openai_api_key');
    if (!apiKey || apiKey.trim() === '') return null;

    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: apiKey.trim() });
    const today = new Date().toISOString().split('T')[0];

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UNIVERSAL_SYSTEM_PROMPT },
        { role: 'user', content: `Bugünkü tarix: ${today}\n\nMətn: "${input}"` },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (['number', 'null'].indexOf(typeof parsed.price) === -1) parsed.price = null;
    if (['number', 'null'].indexOf(typeof parsed.qty) === -1) parsed.qty = null;
    return parsed;
  } catch (err) {
    console.error('AI universal parse error:', err.message);
    return null;
  }
}

async function aiParse(input) {
  try {
    const apiKey = getSetting('openai_api_key');
    if (!apiKey || apiKey.trim() === '') {
      return null;
    }

    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: apiKey.trim() });

    const today = new Date().toISOString().split('T')[0];
    const userMessage = `Bugünkü tarix: ${today}\n\nMətn: "${input}"`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    if (parsed.price !== undefined && typeof parsed.price !== 'number' && parsed.price !== null) {
      parsed.price = null;
    }

    return parsed;
  } catch (err) {
    console.error('AI parse error:', err.message);
    return null;
  }
}

module.exports = { aiParse, aiParseUniversal };
