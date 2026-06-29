import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function publicMember(m) {
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    phone2: m.phone2,
    gender: m.gender,
    birthDate: m.birth_date,
    address: m.address,
    guardianName: m.guardian_name,
    guardianPhone: m.guardian_phone,
    notes: m.notes,
    joinDate: m.join_date,
    active: !!m.active,
    activeSubscriptions: m.active_subscriptions ?? undefined,
    createdAt: m.created_at,
  };
}

export function registerMembersIpc() {
  ipcMain.handle('members:list', (_evt, { search = '' } = {}) => {
    const db = getDb();
    const q = `%${search.trim()}%`;
    const rows = db
      .prepare(
        `SELECT members.*,
          (SELECT COUNT(*) FROM subscriptions
            WHERE subscriptions.member_id = members.id AND subscriptions.status = 'active') AS active_subscriptions
         FROM members
         WHERE members.name LIKE ? OR members.phone LIKE ?
         ORDER BY members.created_at DESC`
      )
      .all(q, q);
    return rows.map(publicMember);
  });

  ipcMain.handle('members:get', (_evt, { id }) => {
    const db = getDb();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!member) return { ok: false, reason: 'not_found' };

    const subscriptions = db
      .prepare(
        `SELECT subscriptions.*, sports.name AS sport_name, plans.name AS plan_name, coaches.name AS coach_name
         FROM subscriptions
         LEFT JOIN sports ON sports.id = subscriptions.sport_id
         LEFT JOIN plans ON plans.id = subscriptions.plan_id
         LEFT JOIN coaches ON coaches.id = subscriptions.coach_id
         WHERE subscriptions.member_id = ?
         ORDER BY subscriptions.created_at DESC`
      )
      .all(id);

    return { ok: true, member: publicMember(member), subscriptions };
  });

  ipcMain.handle(
    'members:create',
    (_evt, { name, phone, phone2, gender, birthDate, address, guardianName, guardianPhone, notes, joinDate }) => {
      if (!name?.trim() || !phone?.trim()) return { ok: false, reason: 'invalid_input' };
      const db = getDb();
      const now = new Date().toISOString();
      const info = db
        .prepare(
          `INSERT INTO members
            (name, phone, phone2, gender, birth_date, address, guardian_name, guardian_phone, notes, join_date, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .run(
          name.trim(),
          phone.trim(),
          phone2 || null,
          gender === 'female' ? 'female' : 'male',
          birthDate || null,
          address || null,
          guardianName || null,
          guardianPhone || null,
          notes || null,
          joinDate || now.slice(0, 10),
          now,
          now
        );

      const created = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
      return { ok: true, member: publicMember(created) };
    }
  );

  ipcMain.handle(
    'members:update',
    (_evt, { id, name, phone, phone2, gender, birthDate, address, guardianName, guardianPhone, notes, active }) => {
      const db = getDb();
      const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      if (!member) return { ok: false, reason: 'not_found' };

      db.prepare(
        `UPDATE members SET
          name = ?, phone = ?, phone2 = ?, gender = ?, birth_date = ?, address = ?,
          guardian_name = ?, guardian_phone = ?, notes = ?, active = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        name?.trim() || member.name,
        phone?.trim() || member.phone,
        phone2 !== undefined ? phone2 : member.phone2,
        gender === 'female' || gender === 'male' ? gender : member.gender,
        birthDate !== undefined ? birthDate : member.birth_date,
        address !== undefined ? address : member.address,
        guardianName !== undefined ? guardianName : member.guardian_name,
        guardianPhone !== undefined ? guardianPhone : member.guardian_phone,
        notes !== undefined ? notes : member.notes,
        active === undefined ? member.active : active ? 1 : 0,
        new Date().toISOString(),
        id
      );

      const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      return { ok: true, member: publicMember(updated) };
    }
  );

  ipcMain.handle('members:remove', (_evt, { id }) => {
    const db = getDb();
    const inUse = db.prepare('SELECT COUNT(*) AS c FROM subscriptions WHERE member_id = ?').get(id).c;
    if (inUse > 0) return { ok: false, reason: 'in_use' };
    db.prepare('DELETE FROM members WHERE id = ?').run(id);
    return { ok: true };
  });
}
