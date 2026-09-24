const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const usersSvc = require('../../services/users');
const subsSvc  = require('../../services/subscriptions');
const slotsSvc = require('../../services/slots');
const { embed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign')
    .setDescription('Assign your subscription slot to this Discord server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordUserId = interaction.user.id;
    const serverId      = interaction.guildId;
    const serverName    = interaction.guild?.name || '';

    // 1. User must be validated
    const user = usersSvc.findByDiscordId(discordUserId);
    if (!user || !user.validated) {
      return interaction.editReply({
        embeds: [embed.error(
          '❌ Not Validated',
          'You do not have an active subscription.\n\nPlease make the required Owo payment in the **Master Discord Server**.'
        )],
      });
    }

    // 2. Subscription must be active
    const sub = subsSvc.getActive(user.id);
    if (!sub) {
      return interaction.editReply({
        embeds: [embed.error(
          '⏰ Subscription Expired',
          'Your subscription has expired.\n\nPlease renew in the **Master Discord Server**.'
        )],
      });
    }

    // 3. Check if user already has an assignment
    const existingByUser = slotsSvc.getAssignmentByUser(user.id);
    if (existingByUser) {
      // Check if it's already bound to this server
      if (existingByUser.server_id === serverId) {
        return interaction.editReply({
          embeds: [embed.info(
            '✅ Already Assigned',
            `Slot **#${existingByUser.slot_number}** is already assigned to this server.`
          )],
        });
      }
      // Bound to a different server
      return interaction.editReply({
        embeds: [embed.error(
          '❌ Slot Already Assigned',
          `Your slot **#${existingByUser.slot_number}** is currently assigned to another server.\n\nContact the bot owner to reassign or release it.`
        )],
      });
    }

    // 4. Check if server already has a slot
    const existingByServer = slotsSvc.getAssignmentByServer(serverId);
    if (existingByServer) {
      return interaction.editReply({
        embeds: [embed.error(
          '❌ Server Already Has a Slot',
          'This server already has an active slot assignment.'
        )],
      });
    }

    // 5. Find available slot
    const availableSlot = slotsSvc.getAvailable();
    if (!availableSlot) {
      return interaction.editReply({
        embeds: [embed.error(
          '❌ Slots Not Available',
          'There are currently no available slots.\n\nPlease DM the administrator to add more slots.'
        )],
      });
    }

    // 6. Assign
    slotsSvc.assign(availableSlot.id, user.id, serverId, serverName);

    logger.info(`[SERVER] Assigned slot #${availableSlot.slot_number} to server=${serverId} (${serverName})`);

    return interaction.editReply({
      embeds: [embed.success(
        '🎟️ Slot Assigned',
        `**Slot:** #${availableSlot.slot_number}\n**Server:** ${serverName}\n\nServer administrators can now control the Minecraft AFK bot using \`/start\`, \`/stop\`, and other commands.\n\nUse \`/status\` to see quick-action buttons.`
      )],
    });
  },
};
