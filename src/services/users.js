const db = require('../database');

function findByDiscordId(discordUserId) {
  return db.prepare('SELECT * FROM users WHERE discord_user_id = ?').get(discordUserId);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function upsert(discordUserId, username) {
  const now = new Date().toISOString();
  const existing = findByDiscordId(discordUserId);
  if (existing) {
    db.prepare('UPDATE users SET username = ?, updated_at = ? WHERE discord_user_id = ?')
      .run(username, now, discordUserId);
    return findByDiscordId(discordUserId);
  }
  db.prepare(
    'INSERT INTO users (discord_user_id, username, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(discordUserId, username, now, now);
  return findByDiscordId(discordUserId);
}

function validate(discordUserId) {
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE users SET validated = 1, validated_at = ?, updated_at = ? WHERE discord_user_id = ?'
  ).run(now, now, discordUserId);
}

function getAll() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

module.exports = { findByDiscordId, findById, upsert, validate, getAll };
