require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');

async function deployCommands() {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = await fs.readdir(commandsPath);

    for (const file of commandFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(`Command at ${filePath} is missing required properties`);
      }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error('Error deploying commands:', error);
    throw error;
  }
}

deployCommands(); 