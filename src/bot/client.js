const { Client, GatewayIntentBits, Collection } = require('discord.js');
const path = require('path');
const fs   = require('fs');
const logger = require('../utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

/* ─── Load commands ──────────────────────────────────────── */
function loadCommands() {
  const commandDirs = [
    path.join(__dirname, '../commands/user'),
    path.join(__dirname, '../commands/owner'),
  ];

  for (const dir of commandDirs) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const mod = require(path.join(dir, file));

      // Support both { commands: [...] } and direct { data, execute }
      const cmds = mod.commands ?? [mod];
      for (const cmd of cmds) {
        if (cmd.data && cmd.execute) {
          client.commands.set(cmd.data.name, cmd);
          logger.info(`[BOT] Command loaded: /${cmd.data.name}`);
        }
      }
    }
  }
}

/* ─── Load events ────────────────────────────────────────── */
function loadEvents() {
  const eventsDir = path.join(__dirname, 'events');
  for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`[BOT] Event registered: ${event.name} (${file})`);
  }
}

loadCommands();
loadEvents();

module.exports = client;
