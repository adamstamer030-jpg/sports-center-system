import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// الحالة الفعلية للاشتراك: مجمّدة/ملغية بتفضل كما هي، وإلا بتُحسب من التاريخ أو عدد الحصص
function effectiveStatus(s) {
  if (s.status === 'frozen' || s.status === 'cancelled') return s.status;
  if (s.duration_type === 'sessions') {
    return s.sessions_used >= s.sessions_total ? 'expired' : 'active';
  }
  if (s.end_date && s.end_date < today()) return 'expired';
  return 'active';
}

function publicSubscription(s) {
  const status = effectiveStatus(s);
  let daysLeft = null;
  if (s.duration_type !== 'sessions' && s.end_date) {
    daysLeft = Math.ceil((new Date(s.end_date).getTime() - new Date(today()).getTime()) / 86400000);
  }
  return {
    id: s.id,
    memberId: s.member_id,
    memberName: s.member_name || null,
    memberPhone: s.member_phone || null,
    sportId: s.sport_id,
    sportName: s.sport_name || null,
    sportColor: s.sport_color || null,
    planId: s.plan_id,
    planName: s.plan_name || null,
    coachId: s.coach_id,
    coachName: s.coach_name || null,
    durationType: s.duration_type,
    startDate: s.start_date,
    endDate: s.end_date,
    sessionsTotal: s.sessions_total,
    sessionsUsed: s.sessions_used,
    sessionsLeft: s.duration_type === 'sessions' ? s.sessions_total - s.sessions_used : null,
    daysLeft,
    price: s.price,
    amountPaid: s.amount_paid,
    remaining: Math.max(0, s.price - s.amount_paid),
    rawStatus: s.status,
    status,
    notes: s.notes,
    createdAt: s.created_at,
  };
}

const SELECT = `
  SELECT subscriptions.*,
    members.name AS member_name, members.phone AS member_phone,
    sports.name AS sport_name, sports.color AS sport_color,
    plans.name AS plan_name,
    coaches.name AS coach_name
  FROM subscriptions
  LEFT JOIN members ON members.id = subscriptions.member_id
  LEFT JOIN sports ON sports.id = subscriptions.sport_id
  LEFT JOIN plans ON plans.id = subscriptions.plan_id
  LEFT JOIN coaches ON coaches.id = subscriptions.coach_id
`;

export function registerSubscriptionsIpc() {
  ipcMain.handle('subscriptions:list', (_evt, { search = '', sportId, status, expiringWithinDays } = {}) => {
    const db = getDb();
    let rows = db.prepare(`${SELECT} ORDER BY subscriptions.created_at DESC`).all();

    let mapped = rows.map(publicSubscription);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter(
        (s) => s.memberName?.toLowerCase().includes(q) || s.memberPhone?.includes(q)
      );
    }
    if (sportId) mapped = mapped.filter((s) => s.sportId === Number(sportId));
    if (status) mapped = mapped.filter((s) => s.status === status);
    if (expiringWithinDays !== undefined) {
      mapped = mapped.filter(
        (s) =>
          s.status === 'active' &&
          ((s.daysLeft !== null && s.daysLeft >= 0 && s.daysLeft <= expiringWithinDays) ||
            (s.sessionsLeft !== null && s.sessionsLeft >= 0 && s.sessionsLeft <= 2))
      );
    }
    return mapped;
  });

  ipcMain.handle('subscriptions:get', (_evt, { id }) => {
    const db = getDb();
    const row = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(id);
    if (!row) return { ok: false, reason: 'not_found' };

    const payments = db
      .prepare('SELECT * FROM payments WHERE subscription_id = ? ORDER BY paid_at DESC')
      .all(id);
    const attendance = db
      .prepare('SELECT * FROM attendance WHERE subscription_id = ? ORDER BY attended_at DESC')
      .all(id);

    return { ok: true, subscription: publicSubscription(row), payments, attendance };
  });

  ipcMain.handle(
    'subscriptions:create',
    (_evt, { memberId, sportId, planId, coachId, durationType, durationValue, startDate, price, amountPaid, notes }) => {
      if (!memberId || !sportId || !durationValue || price === undefined) {
        return { ok: false, reason: 'invalid_input' };
      }
      const db = getDb();
      const now = new Date().toISOString();
      const start = startDate || today();
      const isSessions = durationType === 'sessions';

      const info = db
        .prepare(
          `INSERT INTO subscriptions
            (member_id, sport_id, plan_id, coach_id, duration_type, start_date, end_date,
             sessions_total, sessions_used, price, amount_paid, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?, ?, ?)`
        )
        .run(
          memberId,
          sportId,
          planId || null,
          coachId || null,
          isSessions ? 'sessions' : 'days',
          start,
          isSessions ? null : addDays(start, durationValue),
          isSessions ? Number(durationValue) : null,
          Number(price),
          Number(amountPaid) || 0,
          notes || null,
          now,
          now
        );

      const subId = info.lastInsertRowid;

      if (Number(amountPaid) > 0) {
        db.prepare(
          `INSERT INTO payments (subscription_id, member_id, amount, method, paid_at, notes, created_at)
           VALUES (?, ?, ?, 'cash', ?, 'دفعة أولى عند الاشتراك', ?)`
        ).run(subId, memberId, Number(amountPaid), now, now);
      }

      const created = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(subId);
      return { ok: true, subscription: publicSubscription(created) };
    }
  );

  // تجديد اشتراك منتهي: بينسخ نفس الرياضة/الخطة/المدرب ويبدأ من تاريخ جديد
  ipcMain.handle('subscriptions:renew', (_evt, { id, startDate, durationValue, price, amountPaid }) => {
    const db = getDb();
    const old = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    if (!old) return { ok: false, reason: 'not_found' };

    const now = new Date().toISOString();
    const start = startDate || today();
    const isSessions = old.duration_type === 'sessions';
    const finalDurationValue = durationValue !== undefined ? Number(durationValue) : (isSessions ? old.sessions_total : null);
    const finalPrice = price !== undefined ? Number(price) : old.price;

    const info = db
      .prepare(
        `INSERT INTO subscriptions
          (member_id, sport_id, plan_id, coach_id, duration_type, start_date, end_date,
           sessions_total, sessions_used, price, amount_paid, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?, ?, ?)`
      )
      .run(
        old.member_id,
        old.sport_id,
        old.plan_id,
        old.coach_id,
        old.duration_type,
        start,
        isSessions ? null : addDays(start, finalDurationValue || 30),
        isSessions ? finalDurationValue : null,
        finalPrice,
        Number(amountPaid) || 0,
        'تجديد اشتراك',
        now,
        now
      );

    const subId = info.lastInsertRowid;
    if (Number(amountPaid) > 0) {
      db.prepare(
        `INSERT INTO payments (subscription_id, member_id, amount, method, paid_at, notes, created_at)
         VALUES (?, ?, ?, 'cash', ?, 'دفعة تجديد', ?)`
      ).run(subId, old.member_id, Number(amountPaid), now, now);
    }

    const created = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(subId);
    return { ok: true, subscription: publicSubscription(created) };
  });

  ipcMain.handle('subscriptions:updateStatus', (_evt, { id, status, notes }) => {
    if (!['active', 'frozen', 'cancelled'].includes(status)) return { ok: false, reason: 'invalid_input' };
    const db = getDb();
    db.prepare('UPDATE subscriptions SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(
      status,
      notes ?? null,
      new Date().toISOString(),
      id
    );
    const updated = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(id);
    return { ok: true, subscription: publicSubscription(updated) };
  });

  ipcMain.handle('subscriptions:addPayment', (_evt, { id, amount, method, notes }) => {
    if (!amount || Number(amount) <= 0) return { ok: false, reason: 'invalid_input' };
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    if (!sub) return { ok: false, reason: 'not_found' };

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO payments (subscription_id, member_id, amount, method, paid_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, sub.member_id, Number(amount), method || 'cash', now, notes || null, now);

    db.prepare('UPDATE subscriptions SET amount_paid = amount_paid + ?, updated_at = ? WHERE id = ?').run(
      Number(amount),
      now,
      id
    );

    const updated = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(id);
    return { ok: true, subscription: publicSubscription(updated) };
  });

  // تسجيل حضور حصة — بيزوّد sessions_used للاشتراكات المحسوبة بعدد الحصص
  ipcMain.handle('subscriptions:recordAttendance', (_evt, { id, notes }) => {
    const db = getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    if (!sub) return { ok: false, reason: 'not_found' };
    if (sub.duration_type === 'sessions' && sub.sessions_used >= sub.sessions_total) {
      return { ok: false, reason: 'no_sessions_left' };
    }

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO attendance (subscription_id, member_id, attended_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, sub.member_id, now, notes || null, now);

    if (sub.duration_type === 'sessions') {
      db.prepare('UPDATE subscriptions SET sessions_used = sessions_used + 1, updated_at = ? WHERE id = ?').run(
        now,
        id
      );
    }

    const updated = db.prepare(`${SELECT} WHERE subscriptions.id = ?`).get(id);
    return { ok: true, subscription: publicSubscription(updated) };
  });
}
