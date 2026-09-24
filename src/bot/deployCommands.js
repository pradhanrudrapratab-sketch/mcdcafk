require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [];
const commandDirs = [
  path.join(__dirname, '../commands/user'),
  path.join(__dirname, '../commands/owner'),
];

for (const dir of commandDirs) {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const mod = require(path.join(dir, file));
    const cmds = mod.commands ?? [mod];
    for (const cmd of cmds) {
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash commands globally…`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ All commands deployed successfully.');
  } catch (err) {
    console.error('❌ Deploy failed:', err);
  }
})();
