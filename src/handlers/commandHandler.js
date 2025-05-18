const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

async function loadCommands(client) {
  try {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = await fs.readdir(commandsPath);
    
    for (const file of commandFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing required properties`);
      }
    }
    
    logger.info(`Successfully loaded ${client.commands.size} commands`);
  } catch (error) {
    logger.error('Error loading commands:', error);
    throw error;
  }
}

module.exports = { loadCommands }; 