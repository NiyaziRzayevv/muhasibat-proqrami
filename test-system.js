
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3'); // Birbaşa better-sqlite3 istifadə edək, src/database/index.js əvəzinə

// Log funksiyası
function log(msg, type = 'info') {
    const symbol = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    console.log(`[${symbol}] ${msg}`);
}

// DB yolunu tapmaq (fix-db-columns.js məntiqi ilə)
function getDbPath() {
    if (app) {
        try {
            const userData = app.getPath('userData');
            // Electron default olaraq 'Electron' qovluğunu istifadə edə bilər
            // Amma biz SmartQeyd axtarırıq
            const smartQeydPath = path.join(process.env.APPDATA, 'SmartQeyd', 'servis.db');
            if (fs.existsSync(smartQeydPath)) {
                 log(`İstifadəçi bazası tapıldı: ${smartQeydPath}`, 'success');
                 return smartQeydPath;
            }
            // Yoxdursa, electron-un öz userData-sına baxaq
            const dbPath = path.join(userData, 'servis.db');
            if (fs.existsSync(dbPath)) return dbPath;
        } catch (e) {
            console.error('Electron path xətası:', e);
        }
    }
    return null;
}

app.whenReady().then(async () => {
    try {
        log('Sistem testi başlayır (REAL BAZA İLƏ)...', 'info');

        const dbPath = getDbPath();
        if (!dbPath) {
            log('Baza faylı tapılmadı!', 'error');
            app.quit();
            return;
        }

        const db = new Database(dbPath);
        log('Verilənlər bazası açıldı.', 'success');

        // 1. Cədvəlləri yoxla
        const tables = ['users', 'records', 'customers', 'products', 'sales', 'stock_movements'];
        for (const table of tables) {
            const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
            if (exists) {
                // created_by sütununu yoxla
                const cols = db.prepare(`PRAGMA table_info(${table})`).all();
                const hasCreatedBy = cols.some(c => c.name === 'created_by');
                if (hasCreatedBy) log(`[✓] ${table}: created_by VAR`, 'success');
                else if (table !== 'users') log(`[✗] ${table}: created_by YOXDUR!`, 'error');
            } else {
                log(`[✗] Cədvəl TAPILMADI: ${table}`, 'error');
            }
        }

        // 2. Müştəri Testi (Birbaşa DB sorğuları ilə)
        // src/database/customers.js faylını istifadə etmək çətindir çünki o getDb() çağırır
        // Biz birbaşa SQL ilə yoxlayacağıq
        
        const testName = 'SystemCheck ' + Date.now();
        log(`Müştəri yaradılır: ${testName}`, 'info');
        
        try {
            const insert = db.prepare(`INSERT INTO customers (name, phone, created_by) VALUES (?, ?, ?)`).run(testName, '000', 1);
            if (insert.lastInsertRowid) {
                log(`Müştəri yaradıldı (ID: ${insert.lastInsertRowid})`, 'success');
                
                // Axtarış
                const found = db.prepare(`SELECT * FROM customers WHERE name = ?`).get(testName);
                if (found) log('Müştəri axtarışı uğurlu.', 'success');
                else log('Müştəri axtarışı uğursuz!', 'error');
                
                // Silmək
                db.prepare(`DELETE FROM customers WHERE id = ?`).run(insert.lastInsertRowid);
            }
        } catch (e) {
            log(`Müştəri yaratmaq xətası: ${e.message}`, 'error');
        }

    } catch (err) {
        log(`Kritik Xəta: ${err.message}`, 'error');
    } finally {
        log('Test tamamlandı.', 'info');
        app.quit();
    }
});
