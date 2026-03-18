const { autoUpdater } = require('electron-updater');
const { ipcMain, dialog } = require('electron');
const logger = require('./logger');

let mainWindow = null;

function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function initAutoUpdater(win) {
  mainWindow = win;

  const { app } = require('electron');
  logger.info('UPDATER', `Init auto-updater. Version: ${app.getVersion()}, isPackaged: ${app.isPackaged}`);

  // Auto-download updates silently
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  // Force GitHub provider config
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'NiyaziRzayevv',
    repo: 'muhasibat-proqrami',
  });

  logger.info('UPDATER', 'Feed URL set to GitHub: NiyaziRzayevv/muhasibat-proqrami');

  // Don't check for updates in dev mode
  if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
    logger.info('UPDATER', 'Skipping auto-update in dev mode');
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    logger.info('UPDATER', 'Checking for update...');
    sendToRenderer('updater:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('UPDATER', `Update available: v${info.version}`);
    sendToRenderer('updater:status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });

    // Auto-download is enabled, update will download automatically
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('UPDATER', 'No update available');
    sendToRenderer('updater:status', { status: 'up-to-date', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('UPDATER', `Update downloaded: v${info.version}`);
    sendToRenderer('updater:status', {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes || '',
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('error', (err) => {
    logger.errorLog('UPDATER', err);
    sendToRenderer('updater:status', { status: 'error', error: err?.message || String(err) });
  });

  // IPC: manual check from renderer
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result?.updateInfo };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // IPC: get current version
  ipcMain.handle('updater:version', () => {
    const { app } = require('electron');
    return { success: true, data: { version: app.getVersion() } };
  });

  // IPC: manual download
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // IPC: install now
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Check for updates 5 seconds after launch, then every 4 hours
  setTimeout(() => {
    logger.info('UPDATER', 'Auto-check starting...');
    autoUpdater.checkForUpdates().then(r => {
      logger.info('UPDATER', `Auto-check result: ${JSON.stringify(r?.updateInfo?.version)}`);
    }).catch(e => {
      logger.error('UPDATER', `Auto-check failed: ${e.message}`);
    });
  }, 5000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(e => {
      logger.error('UPDATER', `Interval check failed: ${e.message}`);
    });
  }, 4 * 60 * 60 * 1000);
}

module.exports = { initAutoUpdater };
