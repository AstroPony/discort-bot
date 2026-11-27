const { Events } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    logger.debug(generateDependencyReport());
  },
}; 