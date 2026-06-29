import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';

let db = null;

export function initDatabase(userDataPath) {
  const dir = path.join(userDataPath, 'data');
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'app.sqlite3');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate();
  seedIfEmpty();

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized yet');
  return db;
}

// بيفرّغ أي بيانات لسه قاعدة في ملف WAL جوه ملف القاعدة الرئيسي.
// لازم تتنادى قبل أي نسخ مباشر لملف الـ .sqlite3 (مثل النسخ الاحتياطي)،
// لأن SQLite في وضع WAL ممكن يفضل فترة قبل ما يدمج التغييرات الأخيرة في الملف الرئيسي.
export function checkpointDb() {
  if (!db) return;
  db.pragma('wal_checkpoint(TRUNCATE)');
}

function migrate() {
  // جدول إعدادات/بيانات عامة للتطبيق (الترخيص، إصدار السكيما..)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // جدول المستخدمين — أساس موديول Auth، أي موديول مستقبلي (HR..) بيتمدّ منه
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ============================================================
  // موديولات مركز التدريب الرياضي (يصلح لأي رياضة: جماعية أو فردية)
  // ============================================================

  // الأنشطة/الرياضات اللي المركز بيقدمها — قابلة للتخصيص بالكامل
  // (جيم، سباحة، كاراتيه، أو أي رياضة تانية تتضاف من واجهة الإدارة)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'individual', -- individual | group
      color TEXT NOT NULL DEFAULT '#0F6B5C',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // المدربين — كل مدرب مرتبط (اختياريًا) برياضة أساسية
  db.exec(`
    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      sport_id INTEGER REFERENCES sports(id) ON DELETE SET NULL,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // المتدربين/الأعضاء
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone2 TEXT,
      gender TEXT NOT NULL DEFAULT 'male', -- male | female
      birth_date TEXT,
      address TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      notes TEXT,
      join_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // خطط الاشتراك — كل خطة مرتبطة برياضة معيّنة، بسعر ومدة (أيام أو عدد حصص)
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      duration_type TEXT NOT NULL DEFAULT 'days', -- days | sessions
      duration_value INTEGER NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // اشتراكات الأعضاء — قلب النظام: عضو + رياضة + خطة + مدرب اختياري
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
      coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL,
      duration_type TEXT NOT NULL DEFAULT 'days', -- days | sessions (منسوخة من الخطة وقت الإنشاء)
      start_date TEXT NOT NULL,
      end_date TEXT,
      sessions_total INTEGER,
      sessions_used INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', -- active | frozen | cancelled
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // سجل الدفعات — اشتراك واحد ممكن يتدفع على أكتر من قسط
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash', -- cash | card | transfer
      paid_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // سجل الحضور — لتسجيل الحصص خصوصًا للاشتراكات المحسوبة بعدد الحصص
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      attended_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_sport ON subscriptions(sport_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_subscription ON attendance(subscription_id);');
}

function getMeta(key) {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

function setMeta(key, value) {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count === 0) {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      `INSERT INTO users (name, username, password_hash, role, active, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', 1, 1, ?, ?)`
    ).run('مدير النظام', 'admin', hash, now, now);
  }

  // أمثلة رياضات افتراضية — تقدر تعدّلها أو تمسحها أو تضيف غيرها من صفحة "الرياضات"
  const sportsCount = db.prepare('SELECT COUNT(*) AS c FROM sports').get().c;
  if (sportsCount === 0) {
    const now = new Date().toISOString();
    const defaults = [
      ['جيم عام', 'individual', '#0F6B5C'],
      ['سباحة', 'individual', '#1F6FA6'],
      ['كاراتيه', 'individual', '#B5562B'],
      ['كرة قدم (جماعي)', 'group', '#2453A6'],
    ];
    const insert = db.prepare(
      `INSERT INTO sports (name, type, color, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)`
    );
    for (const [name, type, color] of defaults) insert.run(name, type, color, now, now);
  }

  if (getMeta('schema_version') === null) {
    setMeta('schema_version', '2');
  }
}

export const meta = { get: getMeta, set: setMeta };
