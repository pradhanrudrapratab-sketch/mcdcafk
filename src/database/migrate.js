const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DATABASE_URL || './data/bot.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const Database = require('better-sqlite3');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT    NOT NULL UNIQUE,
  username        TEXT    NOT NULL,
  validated       INTEGER NOT NULL DEFAULT 0,
  validated_at    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL DEFAULT 'ACTIVE',
  started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS slots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_number INTEGER NOT NULL UNIQUE,
  url         TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'AVAILABLE',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS slot_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id     INTEGER NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_id   TEXT    NOT NULL,
  server_name TEXT,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  released_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_message_id TEXT    NOT NULL UNIQUE,
  sender_id          TEXT    NOT NULL,
  receiver_id        TEXT    NOT NULL,
  amount             INTEGER NOT NULL,
  status             TEXT    NOT NULL DEFAULT 'VALID',
  processed_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS configuration (
  key        TEXT NOT NULL PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_discord        ON users(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_subs_user            ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status          ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_slots_status         ON slots(status);
CREATE INDEX IF NOT EXISTS idx_assignments_slot     ON slot_assignments(slot_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user     ON slot_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_server   ON slot_assignments(server_id);
CREATE INDEX IF NOT EXISTS idx_payments_msg         ON payments(payment_message_id);
`;

db.exec(schema);
console.log('[MIGRATE] Schema applied successfully.');
db.close();
