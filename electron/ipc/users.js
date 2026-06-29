import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

function isAdmin(actorRole) {
  return actorRole === 'admin';
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    active: !!u.active,
    mustChangePassword: !!u.must_change_password,
    createdAt: u.created_at,
  };
}

export function registerUsersIpc() {
  ipcMain.handle('users:list', () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all();
    return rows.map(publicUser);
  });

  ipcMain.handle('users:create', (_evt, { actorRole, name, username, password, role }) => {
    if (!isAdmin(actorRole)) return { ok: false, reason: 'forbidden' };
    if (!name?.trim() || !username?.trim() || !password || password.length < 6) {
      return { ok: false, reason: 'invalid_input' };
    }

    const db = getDb();
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (exists) return { ok: false, reason: 'username_taken' };

    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?)`
      )
      .run(name.trim(), username.trim(), hash, role || 'staff', now, now);

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    return { ok: true, user: publicUser(created) };
  });

  ipcMain.handle('users:update', (_evt, { actorRole, id, name, role, active }) => {
    if (!isAdmin(actorRole)) return { ok: false, reason: 'forbidden' };
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return { ok: false, reason: 'not_found' };

    db.prepare('UPDATE users SET name = ?, role = ?, active = ?, updated_at = ? WHERE id = ?').run(
      name?.trim() || user.name,
      role || user.role,
      active === undefined ? user.active : active ? 1 : 0,
      new Date().toISOString(),
      id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return { ok: true, user: publicUser(updated) };
  });

  ipcMain.handle('users:resetPassword', (_evt, { actorRole, id, newPassword }) => {
    if (!isAdmin(actorRole)) return { ok: false, reason: 'forbidden' };
    if (!newPassword || newPassword.length < 6) return { ok: false, reason: 'weak_password' };

    const db = getDb();
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?'
    ).run(hash, new Date().toISOString(), id);

    return { ok: true };
  });
}
