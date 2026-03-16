const fs = require('fs');
const path = require('path');
const { getDbFilePath } = require('../database/index');
const { getSetting } = require('../database/settings');

function getDefaultBackupDir() {
  const backupPath = getSetting('backup_path');
  if (backupPath && fs.existsSync(backupPath)) return backupPath;
  const { app } = require('electron');
  return path.join(app.getPath('documents'), 'ServisBackup');
}

function createBackup(targetDir) {
  const dir = targetDir || getDefaultBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const dbPath = getDbFilePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(dir, `servis-backup-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupFile);
  return { success: true, path: backupFile, filename: path.basename(backupFile) };
}

function restoreBackup(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    return { success: false, error: 'Backup faylı tapılmadı' };
  }
  const dbPath = getDbFilePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tempBackup = dbPath + `.before-restore-${timestamp}.bak`;
  fs.copyFileSync(dbPath, tempBackup);
  try {
    const { closeDb } = require('../database/index');
    closeDb();
    fs.copyFileSync(backupFilePath, dbPath);
    return { success: true };
  } catch (err) {
    fs.copyFileSync(tempBackup, dbPath);
    return { success: false, error: err.message };
  }
}

function listBackups(dir) {
  const backupDir = dir || getDefaultBackupDir();
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db') && f.startsWith('servis-backup-'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, path: path.join(backupDir, f), size: stat.size, created: stat.mtime };
    })
    .sort((a, b) => b.created - a.created);
}

module.exports = { createBackup, restoreBackup, listBackups, getDefaultBackupDir };
