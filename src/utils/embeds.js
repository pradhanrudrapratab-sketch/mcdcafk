const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x2ecc71,
  error:   0xe74c3c,
  info:    0x3498db,
  warn:    0xf39c12,
  owner:   0x9b59b6,
};

function success(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description);
}

function error(title, description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description);
}

function info(title, description) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description);
}

function warn(title, description) {
  return new EmbedBuilder().setColor(COLORS.warn).setTitle(title).setDescription(description);
}

function owner(title, description) {
  return new EmbedBuilder().setColor(COLORS.owner).setTitle(title).setDescription(description);
}

module.exports = { embed: { success, error, info, warn, owner }, COLORS };
