import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { initDatabase, checkpointDb } from './db.js';
import { registerAuthIpc } from './ipc/auth.js';
import { registerUsersIpc } from './ipc/users.js';
import { registerLicenseIpc } from './ipc/license.js';
import { registerSportsIpc } from './ipc/sports.js';
import { registerCoachesIpc } from './ipc/coaches.js';
import { registerMembersIpc } from './ipc/members.js';
import { registerPlansIpc } from './ipc/plans.js';
import { registerSubscriptionsIpc } from './ipc/subscriptions.js';
import { registerReportsIpc } from './ipc/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#F7F6F3',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // أي لينك خارجي يتفتح في المتصفح الافتراضي، مش جوه نافذة التطبيق
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase(app.getPath('userData'));

  registerAuthIpc();
  registerUsersIpc();
  registerLicenseIpc();
  registerSportsIpc();
  registerCoachesIpc();
  registerMembersIpc();
  registerPlansIpc();
  registerSubscriptionsIpc();
  registerReportsIpc();

  // ── Backup ──────────────────────────────────────────────────
  const dbPath = path.join(app.getPath('userData'), 'data', 'app.sqlite3');

  ipcMain.handle('backup:export', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'حفظ نسخة احتياطية',
        defaultPath: path.join(app.getPath('documents'), `sports-backup-${new Date().toISOString().slice(0,10)}.db`),
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
      });
      if (canceled || !filePath) return { ok: false };
      checkpointDb(); // فرّغ ملف WAL في القاعدة الرئيسية قبل النسخ، عشان النسخة الاحتياطية تكون كاملة
      fs.copyFileSync(dbPath, filePath);
      return { ok: true, filePath };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'استعادة نسخة احتياطية',
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (canceled || !filePaths.length) return { ok: false };
      fs.copyFileSync(filePaths[0], dbPath);
      app.relaunch();
      app.exit(0);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
