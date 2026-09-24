const { Events } = require('discord.js');
const { requireMinecraftAccess } = require('../../middleware/checks');
const apiSvc  = require('../../services/api');
const { embed } = require('../../utils/embeds');
const logger  = require('../../utils/logger');

const BUTTON_MAP = {
  mc_start: { endpoint: 'start', label: '▶ Start',     title: '🟢 Bot Started',       desc: 'The AFK bot is now **running**.'     },
  mc_stop:  { endpoint: 'stop',  label: '⏹ Stop',      title: '⏹ Bot Stopped',         desc: 'The AFK bot has been **stopped**.'   },
  mc_jump:  { endpoint: 'jump',  label: '🦘 Auto-Jump', title: '🦘 Auto-Jump Toggled',  desc: 'Auto-jump has been toggled.'         },
  mc_move:  { endpoint: 'move',  label: '🚶 Auto-Move', title: '🚶 Auto-Move Toggled',  desc: 'Auto-move has been toggled.'         },
  mc_sneak: { endpoint: 'sneak', label: '🥷 Auto-Sneak', title: '🥷 Auto-Sneak Toggled', desc: 'Auto-sneak has been toggled.'       },
};

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isButton()) return;

    const id = interaction.customId;

    // ── /ping button ─────────────────────────────────────
    if (id === 'mc_ping') {
      await interaction.deferUpdate();
      const access = await requireMinecraftAccess(interaction);
      if (!access.ok) return;

      const result = await apiSvc.callSlot(access.slot.url, 'ping');
      if (result.ok) {
        const data    = result.data;
        const online  = data?.online ?? true;
        const players = data?.players;
        const current = players?.online ?? players?.current ?? '?';
        const max     = players?.max ?? '?';
        const statusLine = online ? '🟢 **Server Online**' : '🔴 **Server Offline**';
        const playersLine = online ? `\n👥 **Players:** ${current}/${max}` : '';

        return interaction.editReply({
          embeds: [embed.info('📡 Server Status', `${statusLine}${playersLine}\n\n**Slot:** #${access.slot.slot_number}`)],
        });
      } else {
        return interaction.editReply({ embeds: [embed.error('❌ Ping Failed', result.error)] });
      }
    }

    // ── Minecraft action buttons ──────────────────────────
    const action = BUTTON_MAP[id];
    if (!action) return;

    await interaction.deferUpdate();
    const access = await requireMinecraftAccess(interaction);
    if (!access.ok) return;

    logger.info(`[API] Button ${id} triggered by ${interaction.user.tag} in guild=${interaction.guildId}`);

    const result = await apiSvc.callSlot(access.slot.url, action.endpoint);

    if (result.ok) {
      await interaction.editReply({
        embeds: [embed.success(action.title, `${action.desc}\n\n**Slot:** #${access.slot.slot_number}`)],
      });
    } else {
      await interaction.editReply({
        embeds: [embed.error('❌ API Request Failed', result.error)],
      });
    }
  },
};
