const cron   = require('node-cron');
const subsSvc  = require('./subscriptions');
const slotsSvc = require('./slots');
const logger   = require('../utils/logger');

function startJobs() {
  // Run every hour — expire subscriptions and release their slots
  cron.schedule('0 * * * *', () => {
    logger.info('[CRON] Running subscription expiry check…');
    subsSvc.expireOld();

    // Release slots of expired users
    const allSlots = slotsSvc.getAll();
    for (const slot of allSlots) {
      if (slot.status !== 'ASSIGNED') continue;
      const assignment = slotsSvc.getActiveAssignment(slot.id);
      if (!assignment) continue;

      const subsSvcDb = require('../database');
      const sub = subsSvcDb.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' AND expires_at > datetime('now') LIMIT 1`
      ).get(assignment.user_id);

      if (!sub) {
        logger.info(`[CRON] Releasing slot #${slot.slot_number} — subscription expired for user_id=${assignment.user_id}`);
        slotsSvc.release(slot.id);
      }
    }
  });

  logger.info('[CRON] Background jobs started (subscription expiry every hour)');
}

module.exports = { startJobs };
