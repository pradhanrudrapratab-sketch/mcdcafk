const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const usersSvc = require('../services/users');
const subsSvc = require('../services/subscriptions');
const slotsSvc = require('../services/slots');
const { embed } = require('../utils/embeds');

function isOwner(userId) {
  return userId === config.bot.ownerId;
}

/**
 * Returns { ok: true, slot, assignment } or { ok: false } after replying.
 * Runs the full permission → subscription → slot pipeline.
 */
async function requireMinecraftAccess(interaction) {
  // 1. Administrator permission
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      embeds: [embed.error('🔒 Restricted', 'Only server administrators can use this command.')],
      ephemeral: true,
    });
    return { ok: false };
  }

  // 2. Server has an active slot assignment
  const assignment = slotsSvc.getAssignmentByServer(interaction.guildId);
  if (!assignment) {
    await interaction.reply({
      embeds: [embed.error(
        '💳 Subscription Required',
        'This server does not have an active subscription.\n\nPlease subscribe through the **Master Discord Server**.'
      )],
      ephemeral: true,
    });
    return { ok: false };
  }

  // 3. Subscription active for the slot owner
  const dbUser = usersSvc.findByDiscordId(assignment.discord_user_id || '');
  const user = dbUser || { id: assignment.user_id };
  const sub = subsSvc.getActive(user.id || assignment.user_id);

  if (!sub) {
    await interaction.reply({
      embeds: [embed.error(
        '⏰ Subscription Expired',
        'The subscription for this server has expired.\n\nPlease renew in the **Master Discord Server**.'
      )],
      ephemeral: true,
    });
    return { ok: false };
  }

  // 4. Slot URL configured
  const slot = slotsSvc.getById(assignment.slot_id);
  if (!slot || !slot.url) {
    await interaction.reply({
      embeds: [embed.error('⚙️ Configuration Error', 'No valid API URL found for this slot. Contact the bot owner.')],
      ephemeral: true,
    });
    return { ok: false };
  }

  return { ok: true, slot, assignment };
}

module.exports = { isOwner, requireMinecraftAccess };
