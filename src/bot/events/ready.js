const { Events } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    logger.info(`[BOT] Logged in as ${client.user.tag}`);
    logger.info(`[BOT] Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setActivity('Minecraft AFK | /status', { type: 3 }); // WATCHING
  },
};
