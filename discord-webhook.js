const axios = require('axios');

/**
 * Send a Discord webhook with an embed
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} embed - Discord embed object
 */
async function sendWebhook(webhookUrl, embed) {
    if (!webhookUrl || webhookUrl.trim() === '') {
        return; // Silently skip if no webhook configured
    }

    try {
        await axios.post(webhookUrl, {
            embeds: [embed]
        });
    } catch (error) {
        console.error('Failed to send Discord webhook:', error.message);
    }
}

/**
 * Notify that a server has started
 */
async function notifyServerStart(serverName, webhookUrl) {
    const embed = {
        title: '🟢 Server Started',
        description: `**${serverName}** is now online!`,
        color: 0x00ff00, // Green
        timestamp: new Date().toISOString(),
        footer: {
            text: 'McManager'
        }
    };

    await sendWebhook(webhookUrl, embed);
}

/**
 * Notify that a server has stopped
 */
async function notifyServerStop(serverName, webhookUrl, exitCode = 0) {
    const isCrash = exitCode !== 0;

    const embed = {
        title: isCrash ? '🔴 Server Crashed' : '🟡 Server Stopped',
        description: isCrash
            ? `**${serverName}** has crashed! (Exit code: ${exitCode})`
            : `**${serverName}** has stopped gracefully.`,
        color: isCrash ? 0xff0000 : 0xffaa00, // Red for crash, Orange for stop
        timestamp: new Date().toISOString(),
        footer: {
            text: 'McManager'
        }
    };

    await sendWebhook(webhookUrl, embed);
}

/**
 * Notify that a player joined
 */
async function notifyPlayerJoin(serverName, webhookUrl, playerName) {
    const embed = {
        title: '👋 Player Joined',
        description: `**${playerName}** joined **${serverName}**`,
        color: 0x00aaff, // Blue
        timestamp: new Date().toISOString(),
        footer: {
            text: 'McManager'
        }
    };

    await sendWebhook(webhookUrl, embed);
}

/**
 * Notify that a player left
 */
async function notifyPlayerLeave(serverName, webhookUrl, playerName) {
    const embed = {
        title: '👋 Player Left',
        description: `**${playerName}** left **${serverName}**`,
        color: 0xaaaaaa, // Gray
        timestamp: new Date().toISOString(),
        footer: {
            text: 'McManager'
        }
    };

    await sendWebhook(webhookUrl, embed);
}

/**
 * Send a test notification
 */
async function sendTestNotification(serverName, webhookUrl) {
    const embed = {
        title: '✅ Test Notification',
        description: `Discord webhook is configured correctly for **${serverName}**!`,
        color: 0x9b59b6, // Purple
        timestamp: new Date().toISOString(),
        footer: {
            text: 'McManager'
        }
    };

    await sendWebhook(webhookUrl, embed);
}

module.exports = {
    sendWebhook,
    notifyServerStart,
    notifyServerStop,
    notifyPlayerJoin,
    notifyPlayerLeave,
    sendTestNotification
};
