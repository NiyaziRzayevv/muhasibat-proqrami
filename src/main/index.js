const { app, BrowserWindow, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerHandlers } = require('./ipc-handlers');
const logger = require('./logger');
const { initAutoUpdater } = require('./updater');

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'default',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: fs.existsSync(path.join(__dirname, '../../assets/icon.ico')) ? path.join(__dirname, '../../assets/icon.ico') : undefined,
    show: false,
    title: 'SmartQeyd',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    setTimeout(() => checkLowStockNotification(), 3000);
    initAutoUpdater(mainWindow);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else if (app.isPackaged) {
    // exe is at: dist-electron/Servis-Idareetme-win32-x64/Servis-Idareetme.exe
    // project dist/ is 2 levels up from exe dir → always reflects latest build
    const exeDir = path.dirname(process.execPath);
    const projectDist = path.join(exeDir, '..', '..', 'dist', 'index.html');
    const internalDist = path.join(app.getAppPath(), 'dist', 'index.html');
    const htmlPath = fs.existsSync(projectDist) ? projectDist : internalDist;
    mainWindow.loadFile(htmlPath);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkLowStockNotification() {
  logger.info('STOCK', 'Running low-stock notification check');
  try {
    const { getDb } = require('../database/index');
    const db = getDb();
    const lowStock = db.prepare(`
      SELECT name, stock_qty, min_stock, unit FROM products
      WHERE stock_qty <= min_stock AND min_stock > 0
      ORDER BY (min_stock - stock_qty) DESC LIMIT 10
    `).all();

    if (lowStock.length > 0 && Notification.isSupported()) {
      const names = lowStock.slice(0, 3).map(p => `• ${p.name}: ${p.stock_qty} ${p.unit}`).join('\n');
      new Notification({
        title: `⚠️ Azalan Stok — ${lowStock.length} məhsul`,
        body: names + (lowStock.length > 3 ? `\n... və ${lowStock.length - 3} digər` : ''),
        urgency: 'normal',
      }).show();
    }
  } catch (e) {
    logger.errorLog('LOW_STOCK_CHECK', e);
  }
}

app.whenReady().then(() => {
  logger.init(app.getPath('userData'));
  logger.info('APP', `Starting — version ${app.getVersion() || '1.0.0'}, isDev=${isDev}`);
  registerHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const { closeDb } = require('../database/index');
    try { closeDb(); } catch (e) {}
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  logger.errorLog('UNCAUGHT_EXCEPTION', err);
});

process.on('unhandledRejection', (reason) => {
  logger.errorLog('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
});
