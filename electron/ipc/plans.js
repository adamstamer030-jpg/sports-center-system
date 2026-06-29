import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function publicPlan(p) {
  return {
    id: p.id,
    sportId: p.sport_id,
    sportName: p.sport_name || null,
    name: p.name,
    durationType: p.duration_type,
    durationValue: p.duration_value,
    price: p.price,
    active: !!p.active,
  };
}

const SELECT = `
  SELECT plans.*, sports.name AS sport_name
  FROM plans
  LEFT JOIN sports ON sports.id = plans.sport_id
`;

export function registerPlansIpc() {
  ipcMain.handle('plans:list', (_evt, { sportId } = {}) => {
    const db = getDb();
    const rows = sportId
      ? db.prepare(`${SELECT} WHERE plans.sport_id = ? ORDER BY plans.price ASC`).all(sportId)
      : db.prepare(`${SELECT} ORDER BY sports.name ASC, plans.price ASC`).all();
    return rows.map(publicPlan);
  });

  ipcMain.handle('plans:create', (_evt, { sportId, name, durationType, durationValue, price }) => {
    if (!sportId || !name?.trim() || !durationValue || price === undefined) {
      return { ok: false, reason: 'invalid_input' };
    }
    const db = getDb();
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO plans (sport_id, name, duration_type, duration_value, price, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        sportId,
        name.trim(),
        durationType === 'sessions' ? 'sessions' : 'days',
        Number(durationValue),
        Number(price),
        now,
        now
      );

    const created = db.prepare(`${SELECT} WHERE plans.id = ?`).get(info.lastInsertRowid);
    return { ok: true, plan: publicPlan(created) };
  });

  ipcMain.handle('plans:update', (_evt, { id, name, durationType, durationValue, price, active }) => {
    const db = getDb();
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    if (!plan) return { ok: false, reason: 'not_found' };

    db.prepare(
      `UPDATE plans SET name = ?, duration_type = ?, duration_value = ?, price = ?, active = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name?.trim() || plan.name,
      durationType === 'sessions' || durationType === 'days' ? durationType : plan.duration_type,
      durationValue !== undefined ? Number(durationValue) : plan.duration_value,
      price !== undefined ? Number(price) : plan.price,
      active === undefined ? plan.active : active ? 1 : 0,
      new Date().toISOString(),
      id
    );

    const updated = db.prepare(`${SELECT} WHERE plans.id = ?`).get(id);
    return { ok: true, plan: publicPlan(updated) };
  });

  ipcMain.handle('plans:remove', (_evt, { id }) => {
    const db = getDb();
    const inUse = db.prepare('SELECT COUNT(*) AS c FROM subscriptions WHERE plan_id = ?').get(id).c;
    if (inUse > 0) return { ok: false, reason: 'in_use' };
    db.prepare('DELETE FROM plans WHERE id = ?').run(id);
    return { ok: true };
  });
}
