const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

async function loadEvents(client) {
  try {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = await fs.readdir(eventsPath);
    
    for (const file of eventFiles) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      logger.debug(`Loaded event: ${event.name}`);
    }
    
    logger.info('Successfully loaded all events');
  } catch (error) {
    logger.error('Error loading events:', error);
    throw error;
  }
}

module.exports = { loadEvents }; 