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

  // Disable auto-download — we ask user first
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

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

    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Yeniləmə mövcuddur',
      message: `SmartQeyd v${info.version} mövcuddur.\n\nYeniləməni yükləmək istəyirsiniz?`,
      buttons: ['Yüklə', 'Sonra'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
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
    sendToRenderer('updater:status', { status: 'downloaded', version: info.version });

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Yeniləmə hazırdır',
      message: `SmartQeyd v${info.version} yükləndi.\n\nProqramı indi yenidən başladıb yeniləmək istəyirsiniz?`,
      buttons: ['İndi yenilə', 'Sonra'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
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
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

module.exports = { initAutoUpdater };
