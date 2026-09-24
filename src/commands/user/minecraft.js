const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { requireMinecraftAccess } = require('../../middleware/checks');
const apiSvc = require('../../services/api');
const { embed } = require('../../utils/embeds');

/* ─── Helper ─────────────────────────────────────────────── */
function statusButtons(includeStop = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mc_start')
      .setLabel('▶ Start')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mc_stop')
      .setLabel('⏹ Stop')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('mc_jump')
      .setLabel('🦘 Jump')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mc_move')
      .setLabel('🚶 Move')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mc_sneak')
      .setLabel('🥷 Sneak')
      .setStyle(ButtonStyle.Secondary),
  );
  return row;
}

async function handleApiResult(interaction, result, successTitle, successDesc) {
  if (result.ok) {
    await interaction.editReply({
      embeds: [embed.success(successTitle, successDesc)],
      components: [statusButtons()],
    });
  } else {
    await interaction.editReply({
      embeds: [embed.error('❌ API Request Failed', result.error)],
    });
  }
}

/* ─── /start ─────────────────────────────────────────────── */
const startCmd = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start the Minecraft AFK bot'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'start');
    await handleApiResult(
      interaction, result,
      '🟢 Minecraft Bot Started',
      `The AFK bot is now **running**.\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /stop ──────────────────────────────────────────────── */
const stopCmd = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the Minecraft AFK bot'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'stop');
    await handleApiResult(
      interaction, result,
      '⏹ Minecraft Bot Stopped',
      `The AFK bot has been **stopped**.\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /ip ────────────────────────────────────────────────── */
const ipCmd = {
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Set the Minecraft server IP')
    .addStringOption(o =>
      o.setName('address').setDescription('Server IP address').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const address = interaction.options.getString('address');
    const result = await apiSvc.callSlot(access.slot.url, 'ip', { value: address });
    await handleApiResult(
      interaction, result,
      '🌐 Server IP Updated',
      `Server IP set to \`${address}\`\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /port ──────────────────────────────────────────────── */
const portCmd = {
  data: new SlashCommandBuilder()
    .setName('port')
    .setDescription('Set the Minecraft server port')
    .addIntegerOption(o =>
      o.setName('port').setDescription('Port number (default: 25565)').setRequired(true)
        .setMinValue(1).setMaxValue(65535)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const port = interaction.options.getInteger('port');
    const result = await apiSvc.callSlot(access.slot.url, 'port', { value: port });
    await handleApiResult(
      interaction, result,
      '🔌 Server Port Updated',
      `Server port set to \`${port}\`\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /rename ────────────────────────────────────────────── */
const renameCmd = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the AFK bot\'s Minecraft username')
    .addStringOption(o =>
      o.setName('username').setDescription('New bot username').setRequired(true).setMaxLength(16)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const username = interaction.options.getString('username');
    const result = await apiSvc.callSlot(access.slot.url, 'rename', { value: username });
    await handleApiResult(
      interaction, result,
      '✏️ Bot Renamed',
      `Bot username changed to \`${username}\`\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /jump ──────────────────────────────────────────────── */
const jumpCmd = {
  data: new SlashCommandBuilder()
    .setName('jump')
    .setDescription('Toggle auto-jump on the AFK bot'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'jump');
    await handleApiResult(
      interaction, result,
      '🦘 Auto-Jump Toggled',
      `Auto-jump has been toggled.\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /move ──────────────────────────────────────────────── */
const moveCmd = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Toggle auto-move on the AFK bot'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'move');
    await handleApiResult(
      interaction, result,
      '🚶 Auto-Move Toggled',
      `Auto-move has been toggled.\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /sneak ─────────────────────────────────────────────── */
const sneakCmd = {
  data: new SlashCommandBuilder()
    .setName('sneak')
    .setDescription('Toggle auto-sneak on the AFK bot'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'sneak');
    await handleApiResult(
      interaction, result,
      '🥷 Auto-Sneak Toggled',
      `Auto-sneak has been toggled.\n\n**Slot:** #${access.slot.slot_number}`
    );
  },
};

/* ─── /ping ──────────────────────────────────────────────── */
const pingCmd = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the Minecraft server status'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const result = await apiSvc.callSlot(access.slot.url, 'ping');

    if (result.ok) {
      const data = result.data;
      const online  = data?.online ?? true;
      const players = data?.players;
      const current = players?.online ?? players?.current ?? '?';
      const max     = players?.max ?? '?';

      const statusLine = online
        ? `🟢 **Server Online**`
        : `🔴 **Server Offline**`;

      const playersLine = online ? `\n👥 **Players:** ${current}/${max}` : '';

      await interaction.editReply({
        embeds: [embed.info(
          '📡 Server Status',
          `${statusLine}${playersLine}\n\n**Slot:** #${access.slot.slot_number}`
        )],
        components: [statusButtons()],
      });
    } else {
      await interaction.editReply({
        embeds: [embed.error('❌ Ping Failed', result.error)],
      });
    }
  },
};

/* ─── /status ────────────────────────────────────────────── */
const statusCmd = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show current slot status with quick-action buttons'),

  async execute(interaction) {
    await interaction.deferReply();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    const slot = access.slot;

    const statusEmbed = embed.info(
      '📊 Bot Status',
      [
        `**Slot:** #${slot.slot_number}`,
        `**Status:** ${slot.status === 'ASSIGNED' ? '🟢 Assigned' : '🔴 ' + slot.status}`,
        `**Server:** ${access.assignment?.server_name || interaction.guild?.name || 'This Server'}`,
        '',
        '_Use the buttons below to control the AFK bot._',
      ].join('\n')
    );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mc_start').setLabel('▶ Start').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('mc_stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('mc_ping').setLabel('📡 Ping').setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mc_jump').setLabel('🦘 Auto-Jump').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('mc_move').setLabel('🚶 Auto-Move').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('mc_sneak').setLabel('🥷 Auto-Sneak').setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      embeds: [statusEmbed],
      components: [row1, row2],
    });
  },
};

module.exports = {
  commands: [startCmd, stopCmd, ipCmd, portCmd, renameCmd, jumpCmd, moveCmd, sneakCmd, pingCmd, statusCmd],
};
