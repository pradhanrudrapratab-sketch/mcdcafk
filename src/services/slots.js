const db = require('../database');
const logger = require('../utils/logger');

/* ─── Slot CRUD ─────────────────────────────────────────── */

function getAll() {
  return db.prepare('SELECT * FROM slots ORDER BY slot_number ASC').all();
}

function getByNumber(slotNumber) {
  return db.prepare('SELECT * FROM slots WHERE slot_number = ?').get(slotNumber);
}

function getById(id) {
  return db.prepare('SELECT * FROM slots WHERE id = ?').get(id);
}

function getAvailable() {
  return db.prepare(`SELECT * FROM slots WHERE status = 'AVAILABLE' ORDER BY slot_number ASC LIMIT 1`).get();
}

function nextSlotNumber() {
  const row = db.prepare('SELECT MAX(slot_number) as max FROM slots').get();
  return (row?.max ?? 0) + 1;
}

function add(url) {
  const num = nextSlotNumber();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO slots (slot_number, url, status, created_at, updated_at) VALUES (?, ?, 'AVAILABLE', ?, ?)`
  ).run(num, url, now, now);
  logger.info(`[SLOT] Added slot #${num} → ${url}`);
  return num;
}

function updateUrl(slotNumber, newUrl) {
  const now = new Date().toISOString();
  db.prepare('UPDATE slots SET url = ?, updated_at = ? WHERE slot_number = ?').run(newUrl, now, slotNumber);
}

function updateStatus(slotNumber, status) {
  const now = new Date().toISOString();
  db.prepare('UPDATE slots SET status = ?, updated_at = ? WHERE slot_number = ?').run(status, now, slotNumber);
}

function remove(slotNumber) {
  db.prepare('DELETE FROM slots WHERE slot_number = ?').run(slotNumber);
  logger.info(`[SLOT] Deleted slot #${slotNumber}`);
}

/* ─── Slot Assignments ───────────────────────────────────── */

function getActiveAssignment(slotId) {
  return db.prepare(
    `SELECT sa.*, u.discord_user_id, u.username, s.url, s.slot_number
     FROM slot_assignments sa
     JOIN users u ON sa.user_id = u.id
     JOIN slots s ON sa.slot_id = s.id
     WHERE sa.slot_id = ? AND sa.released_at IS NULL`
  ).get(slotId);
}

function getAssignmentByServer(serverId) {
  return db.prepare(
    `SELECT sa.*, s.url, s.slot_number, s.id as slot_id
     FROM slot_assignments sa
     JOIN slots s ON sa.slot_id = s.id
     WHERE sa.server_id = ? AND sa.released_at IS NULL`
  ).get(serverId);
}

function getAssignmentByUser(userId) {
  return db.prepare(
    `SELECT sa.*, s.url, s.slot_number, s.status as slot_status
     FROM slot_assignments sa
     JOIN slots s ON sa.slot_id = s.id
     WHERE sa.user_id = ? AND sa.released_at IS NULL`
  ).get(userId);
}

function assign(slotId, userId, serverId, serverName) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO slot_assignments (slot_id, user_id, server_id, server_name, assigned_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(slotId, userId, serverId, serverName || '', now);

  updateStatus(
    db.prepare('SELECT slot_number FROM slots WHERE id = ?').get(slotId)?.slot_number,
    'ASSIGNED'
  );
  logger.info(`[SLOT] Slot id=${slotId} assigned to server=${serverId} by user_id=${userId}`);
}

function release(slotId) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE slot_assignments SET released_at = ? WHERE slot_id = ? AND released_at IS NULL`
  ).run(now, slotId);

  const slot = getById(slotId);
  if (slot) updateStatus(slot.slot_number, 'AVAILABLE');
  logger.info(`[SLOT] Slot id=${slotId} released`);
}

function releaseByUser(userId) {
  const assignment = getAssignmentByUser(userId);
  if (assignment) release(assignment.slot_id);
}

/* ─── Stats ──────────────────────────────────────────────── */

function getStats() {
  const total     = db.prepare('SELECT COUNT(*) as c FROM slots').get().c;
  const available = db.prepare(`SELECT COUNT(*) as c FROM slots WHERE status = 'AVAILABLE'`).get().c;
  const assigned  = db.prepare(`SELECT COUNT(*) as c FROM slots WHERE status = 'ASSIGNED'`).get().c;
  const inactive  = db.prepare(`SELECT COUNT(*) as c FROM slots WHERE status = 'INACTIVE'`).get().c;
  return { total, available, assigned, inactive };
}

module.exports = {
  getAll, getByNumber, getById, getAvailable, add, updateUrl, updateStatus, remove,
  getActiveAssignment, getAssignmentByServer, getAssignmentByUser,
  assign, release, releaseByUser, getStats,
};
