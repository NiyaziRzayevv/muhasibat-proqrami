
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron'); // Electron mühitində olacağımız üçün app-i çağıra bilərik

// DB yolunu tapmaq
function getDbPath() {
    // 1. Electron-un app.getPath('userData') istifadə etmək (əgər electron-da işləyiriksə)
    if (app) {
        try {
            const userData = app.getPath('userData');
            const dbPath = path.join(userData, 'servis.db');
            console.log('Electron userData yolu:', dbPath);
            if (fs.existsSync(dbPath)) return dbPath;
            
            // Bəlkə SmartQeyd qovluğundadır (əgər app name fərqlidirsə)
            const smartQeydPath = path.join(process.env.APPDATA, 'SmartQeyd', 'servis.db');
            if (fs.existsSync(smartQeydPath)) {
                 console.log('SmartQeyd qovluğu tapıldı:', smartQeydPath);
                 return smartQeydPath;
            }
        } catch (e) {
            console.error('Electron path xətası:', e);
        }
    }

    // 2. Birbaşa AppData yoxlamaq (əgər app hazır deyilsə)
    const userDataPath = process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'SmartQeyd', 'servis.db')
        : path.join(process.env.HOME, '.config', 'SmartQeyd', 'servis.db');
    
    if (fs.existsSync(userDataPath)) {
        console.log('Production bazası tapıldı (manual):', userDataPath);
        return userDataPath;
    }

    // 3. Proje qovluğundakı data qovluğunu yoxla (dev mühit)
    const localDb = path.join(__dirname, 'data', 'servis.db');
    if (fs.existsSync(localDb)) {
        console.log('Development bazası tapıldı:', localDb);
        return localDb;
    }
    
    console.log('Baza tapılmadı, yenisi yaradılacaq (dev üçün):', localDb);
    if (!fs.existsSync(path.dirname(localDb))) fs.mkdirSync(path.dirname(localDb), { recursive: true });
    return localDb;
}

// Electron-da app.whenReady gözləmək yaxşıdır, amma script kimi işləyəndə dərhal başlaya bilər
// Əsas məsələ odur ki, app obyektini istifadə edirik.

const dbPath = getDbPath();
console.log('İstifadə olunan baza:', dbPath);

const db = new Database(dbPath);

console.log('Verilənlər bazası açıldı. Sütunlar yoxlanılır...');

const tables = [
  'records', 
  'sales', 
  'customers', 
  'vehicles', 
  'products', 
  'suppliers', 
  'categories', 
  'price_base', 
  'stock_movements'
];

try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    const colCheck = (tbl) => db.prepare(`PRAGMA table_info(${tbl})`).all();

    for (const table of tables) {
        const exists = tableCheck.get(table);
        if (!exists) {
            console.log(`[XƏBƏRDARLIQ] ${table} cədvəli tapılmadı, keçilir.`);
            continue;
        }

        const cols = colCheck(table);
        const hasCreatedBy = cols.some(c => c.name === 'created_by');

        if (!hasCreatedBy) {
            console.log(`${table} cədvəlinə created_by sütunu əlavə edilir...`);
            try {
                db.exec(`ALTER TABLE ${table} ADD COLUMN created_by INTEGER DEFAULT NULL;`);
                db.exec(`UPDATE ${table} SET created_by = 1 WHERE created_by IS NULL;`);
                console.log(`${table} UĞURLA yeniləndi.`);
            } catch (err) {
                console.error(`${table} yenilənərkən xəta:`, err.message);
            }
        } else {
            console.log(`${table} cədvəlində created_by artıq var.`);
        }
    }
} catch (error) {
    console.error('Ümumi xəta:', error);
} finally {
    db.close();
    console.log('Bütün düzəlişlər tamamlandı. Pəncərəni bağlaya bilərsiniz.');
    if (app) app.quit(); // Electron prosesini bitir
}
