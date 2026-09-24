const { Events } = require('discord.js');
const logger = require('../../utils/logger');
const { embed } = require('../../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`[BOT] Unknown command: ${interaction.commandName}`);
      return interaction.reply({
        embeds: [embed.error('❌ Unknown Command', 'This command is not registered.')],
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`[BOT] Error executing /${interaction.commandName}: ${err.message}`, err);
      const msg = {
        embeds: [embed.error('❌ Internal Error', 'Something went wrong. Please try again.')],
        ephemeral: true,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
