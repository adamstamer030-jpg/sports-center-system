import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function publicCoach(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    sportId: c.sport_id,
    sportName: c.sport_name || null,
    notes: c.notes,
    active: !!c.active,
    createdAt: c.created_at,
  };
}

const SELECT = `
  SELECT coaches.*, sports.name AS sport_name
  FROM coaches
  LEFT JOIN sports ON sports.id = coaches.sport_id
`;

export function registerCoachesIpc() {
  ipcMain.handle('coaches:list', () => {
    const db = getDb();
    const rows = db.prepare(`${SELECT} ORDER BY coaches.name ASC`).all();
    return rows.map(publicCoach);
  });

  ipcMain.handle('coaches:create', (_evt, { name, phone, sportId, notes }) => {
    if (!name?.trim()) return { ok: false, reason: 'invalid_input' };
    const db = getDb();
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO coaches (name, phone, sport_id, notes, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .run(name.trim(), phone || null, sportId || null, notes || null, now, now);

    const created = db.prepare(`${SELECT} WHERE coaches.id = ?`).get(info.lastInsertRowid);
    return { ok: true, coach: publicCoach(created) };
  });

  ipcMain.handle('coaches:update', (_evt, { id, name, phone, sportId, notes, active }) => {
    const db = getDb();
    const coach = db.prepare('SELECT * FROM coaches WHERE id = ?').get(id);
    if (!coach) return { ok: false, reason: 'not_found' };

    db.prepare(
      `UPDATE coaches SET name = ?, phone = ?, sport_id = ?, notes = ?, active = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name?.trim() || coach.name,
      phone !== undefined ? phone : coach.phone,
      sportId !== undefined ? sportId : coach.sport_id,
      notes !== undefined ? notes : coach.notes,
      active === undefined ? coach.active : active ? 1 : 0,
      new Date().toISOString(),
      id
    );

    const updated = db.prepare(`${SELECT} WHERE coaches.id = ?`).get(id);
    return { ok: true, coach: publicCoach(updated) };
  });

  ipcMain.handle('coaches:remove', (_evt, { id }) => {
    const db = getDb();
    db.prepare('UPDATE subscriptions SET coach_id = NULL WHERE coach_id = ?').run(id);
    db.prepare('DELETE FROM coaches WHERE id = ?').run(id);
    return { ok: true };
  });
}
