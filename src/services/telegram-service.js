
const https = require('https');
const { getSetting } = require('../database/settings');
const { getTodayStats } = require('../database/stats');

function sendMessage(text) {
  const token = getSetting('telegram_bot_token');
  const chatId = getSetting('telegram_chat_id');

  if (!token || !chatId) {
    console.warn('[Telegram] Token or Chat ID not configured');
    return Promise.resolve({ success: false, error: 'Not configured' });
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(body) });
        } else {
          console.error('[Telegram] Error:', body);
          resolve({ success: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[Telegram] Request error:', e);
      resolve({ success: false, error: e.message });
    });

    req.write(data);
    req.end();
  });
}

async function sendDailyReport(userId = null) {
  try {
    const stats = getTodayStats(userId);
    const date = new Date().toLocaleDateString('az-AZ');
    
    let message = `<b>📅 Günlük Hesabat (${date})</b>\n\n`;
    message += `💰 <b>Gəlir:</b> ${stats.daily_revenue || 0} AZN\n`;
    message += `📉 <b>Xərc:</b> ${stats.daily_expenses || 0} AZN\n`;
    message += `🧾 <b>Xalis Mənfəət:</b> ${(stats.daily_revenue - stats.daily_expenses) || 0} AZN\n\n`;
    
    message += `🛠 <b>Servis Qeydləri:</b> ${stats.record_count || 0}\n`;
    message += `🛒 <b>Satışlar:</b> ${stats.sale_count || 0}\n`;
    
    if (stats.low_stock_count > 0) {
      message += `\n⚠️ <b>Azalan Stok:</b> ${stats.low_stock_count} məhsul\n`;
    }

    return await sendMessage(message);
  } catch (e) {
    console.error('[Telegram] Report error:', e);
    return { success: false, error: e.message };
  }
}

module.exports = { sendMessage, sendDailyReport };
