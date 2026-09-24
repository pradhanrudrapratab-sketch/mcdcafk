const http = require('http');
const logger = require('../utils/logger');

const PORT = parseInt(process.env.HEALTH_PORT || '3000', 10);

const BOOT_TIME = new Date().toISOString();

function start(discordClient) {
  const server = http.createServer((req, res) => {
    // Only respond to GET /health (and GET / for convenience)
    if (req.method !== 'GET' || (req.url !== '/health' && req.url !== '/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'not_found' }));
      return;
    }

    const discordReady = discordClient?.isReady?.() ?? false;

    const body = JSON.stringify({
      status: discordReady ? 'ok' : 'starting',
      bot: discordClient?.user?.tag ?? 'not_connected',
      uptime_seconds: Math.floor(process.uptime()),
      boot_time: BOOT_TIME,
      guilds: discordClient?.guilds?.cache?.size ?? 0,
      timestamp: new Date().toISOString(),
    });

    const statusCode = discordReady ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(body);
  });

  server.listen(PORT, () => {
    logger.info(`[HEALTH] HTTP health server running on port ${PORT} → GET /health`);
  });

  server.on('error', (err) => {
    logger.error(`[HEALTH] Server error: ${err.message}`);
  });

  return server;
}

module.exports = { start };
