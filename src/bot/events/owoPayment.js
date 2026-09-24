const { Events } = require('discord.js');
const config      = require('../../config');
const paymentsSvc = require('../../services/payments');
const usersSvc    = require('../../services/users');
const subsSvc     = require('../../services/subscriptions');
const slotsSvc    = require('../../services/slots');
const { embed }   = require('../../utils/embeds');
const logger      = require('../../utils/logger');

// Example: 💳 | <@123456> sent 25,000,000 cowoncy to <@789012>!
// Note: The spec uses "250,000,00" which appears to be 25,000,000 — store as integer.
const OWO_PAYMENT_REGEX = /💳\s*\|\s*<@!?(\d+)>\s+sent\s+([\d,]+)\s+cowoncy\s+to\s+<@!?(\d+)>!/i;

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    // Only process messages from the Owo bot in the master server
    if (message.guild?.id !== config.bot.masterServerId) return;
    if (message.author.id !== config.bot.owoBotId) return;

    const match = message.content.match(OWO_PAYMENT_REGEX);
    if (!match) return;

    const senderId   = match[1];
    const amountStr  = match[2].replace(/,/g, '');
    const receiverId = match[3];
    const amount     = parseInt(amountStr, 10);
    const messageId  = message.id;

    logger.info(`[PAYMENT] Owo message detected: sender=${senderId} receiver=${receiverId} amount=${amount}`);

    // ── Validation chain ──────────────────────────────────
    if (receiverId !== config.bot.ownerId) {
      logger.info('[PAYMENT] Rejected: receiver is not the bot owner');
      return;
    }

    if (amount !== config.subscription.amount) {
      logger.info(`[PAYMENT] Rejected: amount ${amount} !== required ${config.subscription.amount}`);
      return;
    }

    if (paymentsSvc.isDuplicate(messageId)) {
      logger.warn(`[PAYMENT] Duplicate payment ignored: messageId=${messageId}`);
      return;
    }

    // ── Payment valid ─────────────────────────────────────
    paymentsSvc.record({
      paymentMessageId: messageId,
      senderId,
      receiverId,
      amount,
      status: 'VALID',
    });

    logger.info(`[PAYMENT] Valid payment from ${senderId}`);

    // Fetch Discord user
    let discordUser;
    try {
      discordUser = await message.client.users.fetch(senderId);
    } catch (err) {
      logger.error(`[PAYMENT] Could not fetch Discord user ${senderId}: ${err.message}`);
      return;
    }

    // Upsert user and validate
    const user = usersSvc.upsert(senderId, discordUser.tag);
    usersSvc.validate(senderId);

    // Check if already has active subscription → renew; else create
    const existingSub = subsSvc.getActive(user.id);
    if (existingSub) {
      subsSvc.renew(user.id);
      logger.info(`[SUBSCRIPTION] Renewed for user_id=${user.id}`);
    } else {
      subsSvc.create(user.id);
      logger.info(`[SUBSCRIPTION] Created for user_id=${user.id}`);
    }

    // If they had no slot and one is now available, assign it proactively
    const existingAssignment = slotsSvc.getAssignmentByUser(user.id);

    // Send DM to user
    try {
      const availableSlot = slotsSvc.getAvailable();
      const oauthLink     = config.discord.oauthRedirectUri
        ? `[Click here to authorize the bot](${config.discord.oauthRedirectUri})`
        : '_Contact the bot owner for the authorization link._';

      const dmLines = [
        '✅ Your payment has been verified.',
        '',
        'Your Discord account is now **validated** and your subscription is active.',
        '',
        existingSub
          ? '♻️ Your subscription has been **renewed** for another 30 days.'
          : '🎉 Your **30-day subscription** has started.',
        '',
        existingAssignment
          ? `🎟️ Your slot **#${existingAssignment.slot_number}** remains active.`
          : `To get started:\n1️⃣ ${oauthLink}\n2️⃣ Add the bot to your Discord server\n3️⃣ Run \`/assign\` in that server`,
      ];

      await discordUser.send({
        embeds: [embed.success('💳 Payment Verified', dmLines.join('\n'))],
      });
      logger.info(`[USER] DM sent to ${discordUser.tag}`);
    } catch (err) {
      logger.warn(`[USER] Could not DM ${senderId}: ${err.message}`);
    }
  },
};
