const db = require('../database');
const config = require('../config');
const logger = require('../utils/logger');

function getActive(userId) {
  return db.prepare(
    `SELECT * FROM subscriptions
     WHERE user_id = ? AND status = 'ACTIVE' AND expires_at > datetime('now')
     ORDER BY expires_at DESC LIMIT 1`
  ).get(userId);
}

function getAny(userId) {
  return db.prepare(
    `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  ).get(userId);
}

function create(userId) {
  const now = new Date();
  const expires = new Date(now.getTime() + config.subscription.days * 24 * 60 * 60 * 1000);
  const startedAt = now.toISOString();
  const expiresAt = expires.toISOString();

  db.prepare(
    `INSERT INTO subscriptions (user_id, status, started_at, expires_at, created_at, updated_at)
     VALUES (?, 'ACTIVE', ?, ?, ?, ?)`
  ).run(userId, startedAt, expiresAt, startedAt, startedAt);

  logger.info(`[SUBSCRIPTION] Created for user_id=${userId}, expires=${expiresAt}`);
}

function renew(userId) {
  const existing = getActive(userId);
  const now = new Date().toISOString();

  if (existing) {
    // Extend from current expiry
    const currentExpiry = new Date(existing.expires_at);
    const newExpiry = new Date(
      currentExpiry.getTime() + config.subscription.days * 24 * 60 * 60 * 1000
    ).toISOString();
    db.prepare(
      `UPDATE subscriptions SET expires_at = ?, updated_at = ? WHERE id = ?`
    ).run(newExpiry, now, existing.id);
    logger.info(`[SUBSCRIPTION] Renewed user_id=${userId}, new_expiry=${newExpiry}`);
  } else {
    // Create fresh subscription
    create(userId);
  }
}

function expireOld() {
  const now = new Date().toISOString();
  const result = db.prepare(
    `UPDATE subscriptions SET status = 'EXPIRED', updated_at = ?
     WHERE status = 'ACTIVE' AND expires_at <= ?`
  ).run(now, now);
  if (result.changes > 0) {
    logger.info(`[SUBSCRIPTION] Expired ${result.changes} subscription(s)`);
  }
}

function revoke(userId) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE subscriptions SET status = 'REVOKED', updated_at = ? WHERE user_id = ? AND status = 'ACTIVE'`
  ).run(now, userId);
}

function getAll() {
  return db.prepare(
    `SELECT s.*, u.discord_user_id, u.username
     FROM subscriptions s JOIN users u ON s.user_id = u.id
     ORDER BY s.created_at DESC`
  ).all();
}

module.exports = { getActive, getAny, create, renew, expireOld, revoke, getAll };
