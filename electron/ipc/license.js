import { ipcMain } from 'electron';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { machineIdSync } = require('node-machine-id');
import { verifyLicenseKey } from '../licensing.js';
import { meta } from '../db.js';

// ⚠️ مهم جدًا: الحالة دي بتُحسب من الصفر (إعادة تحقق كاملة من التوقيع)
// في كل مرة، وليس من فلاج محفوظ. ده اللي بيمنع تمامًا أي تلاعب بملف
// التخزين المحلي (زي مشكلة الأنظمة القديمة اللي كانت بتثق بفلاج
// "activated: true" بدون أي تحقق تشفيري مستمر).
function computeStatus() {
  const key = meta.get('license_key');
  const hwid = machineIdSync();

  if (!key) {
    return { activated: false, reason: 'not_activated', hwid };
  }

  const result = verifyLicenseKey(key, { hwid });

  if (!result.valid) {
    return { activated: false, reason: result.reason, hwid };
  }

  const exp = result.payload.exp;
  const daysLeft = exp && exp > 0 ? Math.max(0, Math.ceil((exp * 1000 - Date.now()) / 86400000)) : null;

  return {
    activated: true,
    hwid,
    expiresAt: exp && exp > 0 ? new Date(exp * 1000).toISOString() : null,
    daysLeft,
  };
}

export function registerLicenseIpc() {
  ipcMain.handle('license:status', () => computeStatus());

  ipcMain.handle('license:machineId', () => machineIdSync());

  ipcMain.handle('license:activate', (_evt, { key }) => {
    const hwid = machineIdSync();
    const result = verifyLicenseKey(key, { hwid });
    if (!result.valid) {
      return { ok: false, reason: result.reason };
    }
    // بنخزّن المفتاح الموقّع الخام بس — مفيش أي فلاج "activated" منفصل
    // يُمكن العبث فيه، لأن computeStatus() بيعيد التحقق من هذا المفتاح
    // نفسه تشفيريًا في كل مرة.
    meta.set('license_key', key);
    return { ok: true, status: computeStatus() };
  });
}
