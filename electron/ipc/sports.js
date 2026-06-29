import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function publicSport(s) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    color: s.color,
    active: !!s.active,
    createdAt: s.created_at,
  };
}

export function registerSportsIpc() {
  ipcMain.handle('sports:list', (_evt, { includeInactive = true } = {}) => {
    const db = getDb();
    const rows = includeInactive
      ? db.prepare('SELECT * FROM sports ORDER BY name ASC').all()
      : db.prepare('SELECT * FROM sports WHERE active = 1 ORDER BY name ASC').all();
    return rows.map(publicSport);
  });

  ipcMain.handle('sports:create', (_evt, { name, type, color }) => {
    if (!name?.trim()) return { ok: false, reason: 'invalid_input' };
    const db = getDb();
    const exists = db.prepare('SELECT id FROM sports WHERE name = ?').get(name.trim());
    if (exists) return { ok: false, reason: 'name_taken' };

    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO sports (name, type, color, active, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(name.trim(), type === 'group' ? 'group' : 'individual', color || '#0F6B5C', now, now);

    const created = db.prepare('SELECT * FROM sports WHERE id = ?').get(info.lastInsertRowid);
    return { ok: true, sport: publicSport(created) };
  });

  ipcMain.handle('sports:update', (_evt, { id, name, type, color, active }) => {
    const db = getDb();
    const sport = db.prepare('SELECT * FROM sports WHERE id = ?').get(id);
    if (!sport) return { ok: false, reason: 'not_found' };

    db.prepare(
      'UPDATE sports SET name = ?, type = ?, color = ?, active = ?, updated_at = ? WHERE id = ?'
    ).run(
      name?.trim() || sport.name,
      type === 'group' || type === 'individual' ? type : sport.type,
      color || sport.color,
      active === undefined ? sport.active : active ? 1 : 0,
      new Date().toISOString(),
      id
    );

    const updated = db.prepare('SELECT * FROM sports WHERE id = ?').get(id);
    return { ok: true, sport: publicSport(updated) };
  });

  ipcMain.handle('sports:remove', (_evt, { id }) => {
    const db = getDb();
    const inUse = db
      .prepare('SELECT COUNT(*) AS c FROM subscriptions WHERE sport_id = ?')
      .get(id).c;
    if (inUse > 0) return { ok: false, reason: 'in_use' };

    db.prepare('DELETE FROM plans WHERE sport_id = ?').run(id);
    db.prepare('DELETE FROM sports WHERE id = ?').run(id);
    return { ok: true };
  });
}
