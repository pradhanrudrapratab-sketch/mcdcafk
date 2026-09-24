const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { isOwner } = require('../../middleware/checks');
const configSvc = require('../../services/configuration');
const slotsSvc  = require('../../services/slots');
const apiSvc    = require('../../services/api');
const usersSvc  = require('../../services/users');
const subsSvc   = require('../../services/subscriptions');
const { embed } = require('../../utils/embeds');
const logger    = require('../../utils/logger');

function ownerOnly(interaction) {
  if (!isOwner(interaction.user.id)) {
    interaction.reply({
      embeds: [embed.error('🔒 Owner Only', 'This command is restricted to the bot owner.')],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

/* ─── /setkey ────────────────────────────────────────────── */
const setKeyCmd = {
  data: new SlashCommandBuilder()
    .setName('setkey')
    .setDescription('[Owner] Set the global API key for all slots')
    .addStringOption(o =>
      o.setName('key').setDescription('The new API key').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const key = interaction.options.getString('key');
    configSvc.setGlobalApiKey(key);
    logger.info(`[OWNER] Global API key updated by ${interaction.user.tag}`);
    return interaction.reply({
      embeds: [embed.owner('🔐 API Key Updated', 'The global API key has been updated successfully.')],
      ephemeral: true,
    });
  },
};

/* ─── /addslot ───────────────────────────────────────────── */
const addSlotCmd = {
  data: new SlashCommandBuilder()
    .setName('addslot')
    .setDescription('[Owner] Add a new Minecraft API slot')
    .addStringOption(o =>
      o.setName('url').setDescription('Base URL of the slot API (e.g. https://slot1.example.com)').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const url = interaction.options.getString('url');

    // Basic URL validation
    try { new URL(url); } catch {
      return interaction.reply({
        embeds: [embed.error('❌ Invalid URL', 'Please provide a valid URL including the protocol (https://).')],
        ephemeral: true,
      });
    }

    const slotNum = slotsSvc.add(url);
    logger.info(`[OWNER] Slot #${slotNum} added: ${url}`);

    return interaction.reply({
      embeds: [embed.owner(
        '✅ Slot Added',
        `**Slot #${slotNum}** has been created.\n\`${url}\``
      )],
      ephemeral: true,
    });
  },
};

/* ─── /editslot ──────────────────────────────────────────── */
const editSlotCmd = {
  data: new SlashCommandBuilder()
    .setName('editslot')
    .setDescription('[Owner] Update the URL of an existing slot')
    .addIntegerOption(o =>
      o.setName('slot').setDescription('Slot number').setRequired(true).setMinValue(1)
    )
    .addStringOption(o =>
      o.setName('url').setDescription('New base URL').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const slotNum = interaction.options.getInteger('slot');
    const newUrl  = interaction.options.getString('url');

    try { new URL(newUrl); } catch {
      return interaction.reply({
        embeds: [embed.error('❌ Invalid URL', 'Please provide a valid URL.')],
        ephemeral: true,
      });
    }

    const slot = slotsSvc.getByNumber(slotNum);
    if (!slot) {
      return interaction.reply({
        embeds: [embed.error('❌ Slot Not Found', `Slot #${slotNum} does not exist.`)],
        ephemeral: true,
      });
    }

    slotsSvc.updateUrl(slotNum, newUrl);
    logger.info(`[OWNER] Slot #${slotNum} URL updated to ${newUrl}`);

    return interaction.reply({
      embeds: [embed.owner(
        '✅ Slot Updated',
        `**Slot #${slotNum}** URL updated to:\n\`${newUrl}\``
      )],
      ephemeral: true,
    });
  },
};

/* ─── /deleteslot ────────────────────────────────────────── */
const deleteSlotCmd = {
  data: new SlashCommandBuilder()
    .setName('deleteslot')
    .setDescription('[Owner] Delete a slot')
    .addIntegerOption(o =>
      o.setName('slot').setDescription('Slot number to delete').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const slotNum = interaction.options.getInteger('slot');
    const slot = slotsSvc.getByNumber(slotNum);

    if (!slot) {
      return interaction.reply({
        embeds: [embed.error('❌ Slot Not Found', `Slot #${slotNum} does not exist.`)],
        ephemeral: true,
      });
    }

    const assignment = slotsSvc.getActiveAssignment(slot.id);

    if (assignment) {
      // Ask for confirmation
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_delete').setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_delete').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({
        embeds: [embed.warn(
          '⚠️ Slot Currently Assigned',
          `Slot #${slotNum} is assigned to:\n**Server:** ${assignment.server_name || assignment.server_id}\n**User:** <@${assignment.discord_user_id}>\n\nAre you sure you want to delete it?`
        )],
        components: [row],
        ephemeral: true,
      });

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
        max: 1,
      });

      collector.on('collect', async i => {
        if (i.customId === 'confirm_delete') {
          slotsSvc.release(slot.id);
          slotsSvc.remove(slotNum);
          await i.update({
            embeds: [embed.owner('🗑️ Slot Deleted', `Slot #${slotNum} has been deleted and its assignment released.`)],
            components: [],
          });
          logger.info(`[OWNER] Slot #${slotNum} force-deleted (was assigned)`);
        } else {
          await i.update({ embeds: [embed.info('Cancelled', 'Slot deletion cancelled.')], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          interaction.editReply({ embeds: [embed.info('Timed Out', 'Deletion cancelled.')], components: [] })
            .catch(() => {});
        }
      });

      return;
    }

    slotsSvc.remove(slotNum);
    return interaction.reply({
      embeds: [embed.owner('🗑️ Slot Deleted', `Slot #${slotNum} deleted successfully.`)],
      ephemeral: true,
    });
  },
};

/* ─── /state ─────────────────────────────────────────────── */
const stateCmd = {
  data: new SlashCommandBuilder()
    .setName('state')
    .setDescription('[Owner] Show slot inventory'),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const stats = slotsSvc.getStats();
    const allSlots = slotsSvc.getAll();

    const slotLines = allSlots.map(s => {
      const icon = s.status === 'ASSIGNED' ? '🟢' : s.status === 'AVAILABLE' ? '🔵' : '🔴';
      return `${icon} **Slot ${s.slot_number}** — ${s.status}`;
    }).join('\n') || '_No slots configured._';

    return interaction.reply({
      embeds: [embed.owner(
        '📊 Slot State',
        [
          `**Total:** ${stats.total} | **Available:** ${stats.available} | **Assigned:** ${stats.assigned} | **Inactive:** ${stats.inactive}`,
          '',
          slotLines,
        ].join('\n')
      )],
      ephemeral: true,
    });
  },
};

/* ─── /health ────────────────────────────────────────────── */
const healthCmd = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('[Owner] Run health check on a slot')
    .addIntegerOption(o =>
      o.setName('slot').setDescription('Slot number').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });

    const slotNum = interaction.options.getInteger('slot');
    const slot = slotsSvc.getByNumber(slotNum);

    if (!slot) {
      return interaction.editReply({
        embeds: [embed.error('❌ Slot Not Found', `Slot #${slotNum} does not exist.`)],
      });
    }

    const result = await apiSvc.healthCheck(slot.url);

    if (result.ok) {
      slotsSvc.updateStatus(slotNum, slot.status === 'ASSIGNED' ? 'ASSIGNED' : 'AVAILABLE');
      return interaction.editReply({
        embeds: [embed.success(`🟢 Slot ${slotNum} Active`, 'Health endpoint responded successfully.')],
      });
    } else {
      slotsSvc.updateStatus(slotNum, 'INACTIVE');
      return interaction.editReply({
        embeds: [embed.error(`🔴 Slot ${slotNum} Inactive`, `Health check failed.\n\`${result.error}\``)],
      });
    }
  },
};

/* ─── /userinfo ──────────────────────────────────────────── */
const userInfoCmd = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('[Owner] View info about a user')
    .addUserOption(o =>
      o.setName('user').setDescription('Discord user').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const target = interaction.options.getUser('user');
    const user   = usersSvc.findByDiscordId(target.id);

    if (!user) {
      return interaction.reply({
        embeds: [embed.info('👤 User Not Found', `${target.tag} has no record in the database.`)],
        ephemeral: true,
      });
    }

    const sub = subsSvc.getAny(user.id);
    const assignment = slotsSvc.getAssignmentByUser(user.id);

    const lines = [
      `**User:** ${target.tag} (<@${target.id}>)`,
      `**Validated:** ${user.validated ? '✅ Yes' : '❌ No'}`,
      `**Validated At:** ${user.validated_at || 'N/A'}`,
      sub
        ? `**Subscription:** ${sub.status} — expires ${sub.expires_at}`
        : '**Subscription:** None',
      assignment
        ? `**Slot:** #${assignment.slot_number} → Server ${assignment.server_id}`
        : '**Slot:** Not assigned',
    ];

    return interaction.reply({
      embeds: [embed.owner('👤 User Info', lines.join('\n'))],
      ephemeral: true,
    });
  },
};

/* ─── /revoke ────────────────────────────────────────────── */
const revokeCmd = {
  data: new SlashCommandBuilder()
    .setName('revoke')
    .setDescription('[Owner] Revoke a user\'s subscription and release their slot')
    .addUserOption(o =>
      o.setName('user').setDescription('Discord user').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const target = interaction.options.getUser('user');
    const user   = usersSvc.findByDiscordId(target.id);

    if (!user) {
      return interaction.reply({
        embeds: [embed.error('❌ User Not Found', `${target.tag} has no record.`)],
        ephemeral: true,
      });
    }

    subsSvc.revoke(user.id);
    slotsSvc.releaseByUser(user.id);
    logger.info(`[OWNER] Revoked subscription for user=${target.id}`);

    return interaction.reply({
      embeds: [embed.owner('🚫 Subscription Revoked', `${target.tag}'s subscription has been revoked and their slot released.`)],
      ephemeral: true,
    });
  },
};

/* ─── /unassign ──────────────────────────────────────────── */
const unassignCmd = {
  data: new SlashCommandBuilder()
    .setName('unassign')
    .setDescription('[Owner] Force-release a slot from a Discord server')
    .addStringOption(o =>
      o.setName('serverid').setDescription('Discord Server ID').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const serverId   = interaction.options.getString('serverid');
    const assignment = slotsSvc.getAssignmentByServer(serverId);

    if (!assignment) {
      return interaction.reply({
        embeds: [embed.error('❌ Not Found', `No active slot assignment found for server \`${serverId}\`.`)],
        ephemeral: true,
      });
    }

    slotsSvc.release(assignment.slot_id);
    logger.info(`[OWNER] Force-released slot #${assignment.slot_number} from server=${serverId}`);

    return interaction.reply({
      embeds: [embed.owner(
        '✅ Slot Released',
        `Slot **#${assignment.slot_number}** has been released from server \`${serverId}\`.`
      )],
      ephemeral: true,
    });
  },
};

/* ─── /renew (owner-forced renewal) ─────────────────────── */
const renewCmd = {
  data: new SlashCommandBuilder()
    .setName('renew')
    .setDescription('[Owner] Manually renew a user\'s subscription')
    .addUserOption(o =>
      o.setName('user').setDescription('Discord user').setRequired(true)
    ),

  async execute(interaction) {
    if (!ownerOnly(interaction)) return;
    const target = interaction.options.getUser('user');
    const user   = usersSvc.findByDiscordId(target.id);

    if (!user) {
      return interaction.reply({
        embeds: [embed.error('❌ User Not Found', `${target.tag} has no record.`)],
        ephemeral: true,
      });
    }

    subsSvc.renew(user.id);
    logger.info(`[OWNER] Manually renewed subscription for user=${target.id}`);

    return interaction.reply({
      embeds: [embed.owner('✅ Subscription Renewed', `${target.tag}'s subscription has been renewed for ${configSvc?.subscription?.days || 30} days.`)],
      ephemeral: true,
    });
  },
};

module.exports = {
  commands: [
    setKeyCmd, addSlotCmd, editSlotCmd, deleteSlotCmd,
    stateCmd, healthCmd, userInfoCmd, revokeCmd, unassignCmd, renewCmd,
  ],
};
