require('dotenv').config();

const required = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'BOT_OWNER_ID',
  'MASTER_SERVER_ID',
  'OWO_BOT_ID',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET || '',
    oauthRedirectUri: process.env.OAUTH_REDIRECT_URI || '',
  },
  database: {
    url: process.env.DATABASE_URL || './data/bot.db',
  },
  bot: {
    ownerId: process.env.BOT_OWNER_ID,
    masterServerId: process.env.MASTER_SERVER_ID,
    owoBotId: process.env.OWO_BOT_ID,
  },
  subscription: {
    amount: parseInt(process.env.SUBSCRIPTION_AMOUNT || '25000000', 10),
    days: parseInt(process.env.SUBSCRIPTION_DAYS || '30', 10),
  },
  api: {
    globalApiKey: process.env.GLOBAL_API_KEY || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
