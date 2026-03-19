const { app, BrowserWindow, Menu } = require('electron');
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
    icon: fs.existsSync(path.join(__dirname, '../../assets/logo.ico')) ? path.join(__dirname, '../../assets/logo.ico') : undefined,
    show: false,
    title: 'SmartQeyd',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
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
