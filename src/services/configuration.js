const db = require('../database');
const config = require('../config');

function get(key) {
  const row = db.prepare('SELECT value FROM configuration WHERE key = ?').get(key);
  return row ? row.value : null;
}

function set(key, value) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO configuration (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, now);
}

function getGlobalApiKey() {
  return get('global_api_key') || config.api.globalApiKey;
}

function setGlobalApiKey(key) {
  set('global_api_key', key);
}

module.exports = { get, set, getGlobalApiKey, setGlobalApiKey };
