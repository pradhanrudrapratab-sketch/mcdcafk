// ─── Bootstrap ────────────────────────────────────────────
require('dotenv').config();
const config = require('./config'); // validates required env vars

const logger = require('./utils/logger');
logger.info('[BOOT] Starting Discord AFK Bot…');

// ─── Run migrations ───────────────────────────────────────
const path = require('path');
const { execSync } = require('child_process');
try {
  execSync(`node ${path.join(__dirname, 'database/migrate.js')}`, { stdio: 'inherit' });
} catch (err) {
  logger.error('[BOOT] Migration failed', err);
  process.exit(1);
}

// ─── Start cron jobs ──────────────────────────────────────
const cron = require('./services/cron');
cron.startJobs();

// ─── Start Discord client ─────────────────────────────────
const client = require('./bot/client');

// ─── Start health HTTP server (for UptimeRobot etc.) ──────
const healthServer = require('./services/healthServer');
const httpServer = healthServer.start(client);

client.login(config.discord.token).catch(err => {
  logger.error('[BOOT] Failed to log in to Discord:', err);
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('[BOOT] SIGTERM received — shutting down');
  httpServer.close();
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[BOOT] SIGINT received — shutting down');
  httpServer.close();
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[BOOT] Unhandled rejection:', reason);
});
