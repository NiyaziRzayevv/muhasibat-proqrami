# Avtomobil Servis İdarəetmə Proqramı

Windows üçün tam işlək desktop proqram. Electron + React + SQLite ilə hazırlanmışdır.

## Tez Başlanğıc

```bash
# 1. Asılılıqları yükləyin
npm install

# 2. Proqramı işə salın (development rejimi)
npm run dev

# Və ya birbaşa Electron ilə başladın (renderer artıq build edilibsə)
npm start
```

## Build (İnstaller hazırlamaq)

```bash
# Əvvəlcə renderer-i build edin
npm run build:renderer

# Sonra installer yaradın
npm run dist
```

Build çıxışı `dist-electron/` qovluğunda olacaq.

## Layihə Strukturu

```
├── src/
│   ├── main/
│   │   ├── index.js          ← Electron ana proses
│   │   ├── preload.js        ← Güvənli IPC körpüsü
│   │   └── ipc-handlers.js   ← Bütün IPC hadisə işləyiciləri
│   ├── database/
│   │   ├── index.js          ← DB bağlantısı və init
│   │   ├── schema.js         ← Cədvəl strukturu
│   │   ├── records.js        ← Qeydlər CRUD
│   │   ├── customers.js      ← Müştərilər CRUD
│   │   ├── vehicles.js       ← Maşınlar CRUD
│   │   ├── prices.js         ← Qiymət bazası CRUD
│   │   ├── settings.js       ← Ayarlar
│   │   └── seed.js           ← Test məlumatları
│   ├── ai/
│   │   ├── parser.js         ← Əsas parser (qaydabazalı + AI fallback)
│   │   ├── rule-parser.js    ← Qaydabazalı parser
│   │   ├── ai-parser.js      ← OpenAI GPT-4o-mini parser
│   │   ├── normalizer.js     ← Marka/xidmət normalizasiyası
│   │   └── date-parser.js    ← Azərbaycan dili tarix parseri
│   ├── services/
│   │   ├── record-service.js ← Qeyd biznes məntiqi
│   │   └── backup-service.js ← Backup/bərpa
│   └── exports/
│       ├── excel-export.js   ← Excel export (xlsx)
│       └── pdf-export.js     ← PDF export (jsPDF)
├── renderer/
│   ├── index.html
│   ├── index.jsx             ← React giriş nöqtəsi
│   ├── App.jsx               ← Routing, tema, kontekst
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── SmartInput.jsx    ← Ağıllı giriş komponenti
│   │   ├── Modal.jsx
│   │   ├── StatCard.jsx
│   │   └── ConfirmDialog.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── NewRecord.jsx
│   │   ├── Records.jsx
│   │   ├── Customers.jsx
│   │   ├── Vehicles.jsx
│   │   ├── PriceBase.jsx
│   │   ├── Reports.jsx
│   │   ├── Debts.jsx
│   │   ├── Export.jsx
│   │   └── Settings.jsx
│   └── styles/
│       └── globals.css
└── package.json
```

## OpenAI API Key

1. Proqramı açın → **Ayarlar** bölməsinə gedin
2. "OpenAI API Key" sahəsinə `sk-...` açarınızı daxil edin
3. **Yadda saxla** düyməsinə basın

> **Qeyd:** API key olmadan da proqram tam işləyir. Yerli (qaydabazalı) parser istifadə olunur. AI yalnız mürəkkəb cümlələr üçün fallback kimi dəvət olunur.

## Verilənlər Bazası

SQLite bazası `%APPDATA%\servis-idareetme\servis.db` yerləşir.

Bazanın yerini görmək üçün: **Ayarlar → Verilənlər Bazası** bölməsi.

## Export Faylları

Bütün export faylları `Sənədlər\ServisExport\` qovluğuna düşür.

## Backup

- **Backup yarat:** Ayarlar → Backup bölməsi → "Backup yarat" düyməsi
- Backuplar `Sənədlər\ServisBackup\` qovluğuna saxlanır
- **Bərpa:** Ayarlar → Backup bölməsi → "Backup bərpa et" düyməsi

## Ağıllı Parser — Nümunə Cümlələr

```
Mercedes yag deyisme 45 manat
BMW F10 padveska temiri bu gun 120 azn
Kia Rio antifriz deyisimi sabah 30 manat
Toyota Prado Elvin 12 mart yag deyisimi
Namiq ucun BMW 520 yag ve filter 70 azn
Mercedes C200 90-AB-123 yag deyisme
bu gun BMW tormoz bendi 80 manat
mecedes yag deyiwme 45
bmw f10 on padveska 250
```

## Texniki Tələblər

- Node.js 18+
- Windows 10/11
- npm 9+
