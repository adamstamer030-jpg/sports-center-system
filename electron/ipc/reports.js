import { ipcMain } from 'electron';
import { getDb } from '../db.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function registerReportsIpc() {
  ipcMain.handle('reports:dashboard', () => {
    const db = getDb();

    const membersCount = db.prepare('SELECT COUNT(*) AS c FROM members WHERE active = 1').get().c;

    const allSubs = db.prepare('SELECT * FROM subscriptions').all();
    const activeSubs = allSubs.filter((s) => {
      if (s.status !== 'active') return false;
      if (s.duration_type === 'sessions') return s.sessions_used < s.sessions_total;
      return !s.end_date || s.end_date >= today();
    });

    const expiringSoon = activeSubs.filter((s) => {
      if (s.duration_type === 'sessions') return s.sessions_total - s.sessions_used <= 2;
      if (!s.end_date) return false;
      const daysLeft = Math.ceil((new Date(s.end_date).getTime() - new Date(today()).getTime()) / 86400000);
      return daysLeft <= 7;
    }).length;

    const todayRevenue = db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE substr(paid_at, 1, 10) = ?")
      .get(today()).total;

    const monthRevenue = db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE paid_at >= ?')
      .get(startOfMonth()).total;

    const bySport = db
      .prepare(
        `SELECT sports.id, sports.name, sports.color,
            COUNT(*) AS total
         FROM subscriptions
         JOIN sports ON sports.id = subscriptions.sport_id
         WHERE subscriptions.status = 'active'
         GROUP BY sports.id
         ORDER BY total DESC`
      )
      .all();

    return {
      membersCount,
      activeSubscriptions: activeSubs.length,
      expiringSoon,
      todayRevenue,
      monthRevenue,
      bySport,
    };
  });

  // إيراد آخر 14 يوم — للرسم البياني في صفحة التقارير
  ipcMain.handle('reports:revenueSeries', () => {
    const db = getDb();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const rows = db
      .prepare(
        `SELECT substr(paid_at, 1, 10) AS day, COALESCE(SUM(amount), 0) AS total
         FROM payments
         WHERE substr(paid_at, 1, 10) >= ?
         GROUP BY day`
      )
      .all(days[0]);

    const map = Object.fromEntries(rows.map((r) => [r.day, r.total]));
    return days.map((day) => ({ day, total: map[day] || 0 }));
  });
}
