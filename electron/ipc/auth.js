import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

export function registerAuthIpc() {
  ipcMain.handle('auth:login', (_evt, { username, password }) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);

    if (!user) return { ok: false, reason: 'invalid_credentials' };

    const match = bcrypt.compareSync(password ?? '', user.password_hash);
    if (!match) return { ok: false, reason: 'invalid_credentials' };

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        mustChangePassword: !!user.must_change_password,
      },
    };
  });

  ipcMain.handle('auth:changePassword', (_evt, { userId, oldPassword, newPassword }) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return { ok: false, reason: 'not_found' };

    if (!bcrypt.compareSync(oldPassword ?? '', user.password_hash)) {
      return { ok: false, reason: 'wrong_old_password' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, reason: 'weak_password' };
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?'
    ).run(hash, new Date().toISOString(), userId);

    return { ok: true };
  });
}
