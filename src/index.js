require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const logger = require('./utils/logger');
const validateEnv = require('./config/env');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// Validate environment variables
validateEnv();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Optionally, you might want to gracefully shutdown here
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize collections
client.commands = new Collection();

// Load commands and events
(async () => {
  try {
    await loadCommands(client);
    await loadEvents(client);
    
    // Start Express server
    app.listen(port, () => {
      logger.info(`Express server running on port ${port}`);
    });

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logger.error('Error during initialization:', error);
    process.exit(1);
  }
})(); 