const db = require('../database');

function isDuplicate(paymentMessageId) {
  const row = db.prepare('SELECT id FROM payments WHERE payment_message_id = ?').get(paymentMessageId);
  return !!row;
}

function record({ paymentMessageId, senderId, receiverId, amount, status = 'VALID' }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO payments (payment_message_id, sender_id, receiver_id, amount, status, processed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(paymentMessageId, senderId, receiverId, amount, status, now, now);
}

function getAll() {
  return db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
}

module.exports = { isDuplicate, record, getAll };
