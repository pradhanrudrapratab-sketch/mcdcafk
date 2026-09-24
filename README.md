# Discord Minecraft AFK Bot

A production-ready, subscription-based Discord bot that provides remote control of Minecraft 24/7 AFK bot instances through HTTP APIs — authenticated via Owo payment verification.

---

## Architecture

```
MASTER DISCORD SERVER
       │
       │  Owo Payment
       ▼
   SUBSCRIBER  ──── 1 Slot
       │
       ▼
 DISCORD SERVER  ─── Slot URL + Global API Key
       │
       ▼
 MINECRAFT AFK API
```

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourname/discord-afk-bot
cd discord-afk-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal |
| `CLIENT_ID` | Application Client ID |
| `CLIENT_SECRET` | OAuth2 Client Secret |
| `OAUTH_REDIRECT_URI` | Your OAuth2 redirect URI |
| `BOT_OWNER_ID` | Your personal Discord User ID |
| `MASTER_SERVER_ID` | The server where Owo payments happen |
| `OWO_BOT_ID` | `408785106942164992` (default Owo bot) |
| `SUBSCRIPTION_AMOUNT` | Required payment in cowoncy (e.g. `25000000`) |
| `SUBSCRIPTION_DAYS` | Duration per subscription (default `30`) |
| `GLOBAL_API_KEY` | Shared API key for all Minecraft slots |
| `DATABASE_URL` | SQLite file path (default `./data/bot.db`) |

### 3. Deploy slash commands

```bash
npm run deploy-commands
```

This registers all slash commands globally. Allow up to 1 hour to propagate.

### 4. Start the bot

```bash
npm start
```

Development (with auto-restart):

```bash
npm run dev
```

---

## Commands

### 👑 Owner Commands (Bot Owner only)

| Command | Description |
|---|---|
| `/setkey <key>` | Set the global API key for all slots |
| `/addslot <url>` | Add a new Minecraft API slot |
| `/editslot <slot> <url>` | Update a slot's API URL |
| `/deleteslot <slot>` | Delete a slot (confirms if assigned) |
| `/state` | Show slot inventory and statuses |
| `/health <slot>` | Run health check on a slot |
| `/userinfo <user>` | View user subscription/slot info |
| `/revoke <user>` | Revoke subscription and release slot |
| `/unassign <serverid>` | Force-release a slot from a server |
| `/renew <user>` | Manually renew a user's subscription |

### 🎮 Server Admin Commands (Administrator permission required)

| Command | Description |
|---|---|
| `/assign` | Bind your slot to this server |
| `/status` | Show bot status with quick-action buttons |
| `/start` | Start the Minecraft AFK bot |
| `/stop` | Stop the Minecraft AFK bot |
| `/ip <address>` | Set the Minecraft server IP |
| `/port <port>` | Set the Minecraft server port |
| `/rename <username>` | Rename the AFK bot |
| `/jump` | Toggle auto-jump |
| `/move` | Toggle auto-move |
| `/sneak` | Toggle auto-sneak |
| `/ping` | Check Minecraft server status |

---

## Payment Flow

1. User joins the **Master Discord Server**
2. User sends the required Owo payment:
   ```
   owo pay @BotOwner 25000000
   ```
3. Bot detects the payment, verifies sender/receiver/amount
4. User is validated and gets a subscription
5. Bot sends a DM with the OAuth2 authorization link
6. User adds the bot to their server via OAuth2
7. User runs `/assign` in their server
8. Server administrators can now control the Minecraft AFK bot

---

## Slot Management

Add a slot:
```
/addslot https://your-minecraft-api.example.com
```

Each slot = one user = one Discord server = one Minecraft API endpoint.

The global API key is automatically appended to every API request.

---

## Minecraft API Endpoints

Your Minecraft AFK service must expose these endpoints:

| Method | Path | Notes |
|---|---|---|
| `GET` | `/start?key=API_KEY` | Start AFK bot |
| `GET` | `/stop?key=API_KEY` | Stop AFK bot |
| `GET` | `/ip?value=IP&key=API_KEY` | Set server IP |
| `GET` | `/port?value=PORT&key=API_KEY` | Set server port |
| `GET` | `/rename?value=NAME&key=API_KEY` | Rename bot |
| `GET` | `/jump?key=API_KEY` | Toggle auto-jump |
| `GET` | `/move?key=API_KEY` | Toggle auto-move |
| `GET` | `/sneak?key=API_KEY` | Toggle auto-sneak |
| `GET` | `/ping?key=API_KEY` | Server status |
| `GET` | `/health` | Health check (no key needed) |

The `/ping` endpoint should return:
```json
{
  "online": true,
  "players": { "online": 3, "max": 20 }
}
```

---

## `/status` Button Panel

The `/status` command shows a control panel with clickable buttons — no need to type commands:

```
📊 Bot Status
─────────────────────────────
Slot: #3
Status: 🟢 Assigned
Server: My Minecraft Server

Use buttons below to control the AFK bot.

[ ▶ Start ]  [ ⏹ Stop ]  [ 📡 Ping ]
[ 🦘 Auto-Jump ]  [ 🚶 Auto-Move ]  [ 🥷 Auto-Sneak ]
```

---

## Deployment (VPS / Render / Railway)

### Systemd (VPS)

```ini
[Unit]
Description=Discord AFK Bot
After=network.target

[Service]
WorkingDirectory=/opt/discord-afk-bot
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
EnvironmentFile=/opt/discord-afk-bot/.env

[Install]
WantedBy=multi-user.target
```

### Railway / Render

Set environment variables in the dashboard and deploy. The `Procfile` handles the start command:

```
worker: npm start
```

### Requirements

- Node.js 18+
- Writable filesystem for SQLite (`./data/`)

---

## Security

- API key is **never** shown in Discord messages, logs, or error responses
- Bot token and secrets are **only** read from environment variables
- Owner commands are restricted by **Discord User ID**, not username
- Minecraft commands require both **Administrator permission** and **active subscription**
- Payment validation checks: Owo bot identity, sender, receiver, exact amount, and duplicate status

---

## Project Structure

```
discord-afk-bot/
├── src/
│   ├── index.js                   # Entry point
│   ├── config/index.js            # Environment config
│   ├── bot/
│   │   ├── client.js              # Discord client setup
│   │   ├── deployCommands.js      # Command registration
│   │   └── events/
│   │       ├── ready.js
│   │       ├── interactionCreate.js
│   │       ├── buttonHandler.js   # Button interactions
│   │       └── owoPayment.js      # Payment listener
│   ├── commands/
│   │   ├── user/
│   │   │   ├── assign.js
│   │   │   └── minecraft.js       # All MC control commands + /status
│   │   └── owner/
│   │       └── manage.js          # All owner commands
│   ├── services/
│   │   ├── users.js
│   │   ├── payments.js
│   │   ├── subscriptions.js
│   │   ├── slots.js
│   │   ├── api.js                 # HTTP abstraction
│   │   ├── configuration.js
│   │   └── cron.js                # Background jobs
│   ├── middleware/
│   │   └── checks.js              # Permission middleware
│   ├── database/
│   │   ├── index.js               # DB connection
│   │   └── migrate.js             # Schema setup
│   └── utils/
│       ├── logger.js
│       └── embeds.js
├── .env.example
├── .gitignore
├── package.json
├── Procfile
└── README.md
```
