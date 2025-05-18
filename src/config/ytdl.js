const ytdl = require('ytdl-core');
const logger = require('../utils/logger');

const ytdlOptions = {
  quality: 'highestaudio',
  filter: 'audioonly',
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    // Disable SSL certificate verification
    rejectUnauthorized: false
  }
};

// Error handling wrapper
async function getInfo(url) {
  try {
    return await ytdl.getInfo(url);
  } catch (error) {
    logger.error('Error fetching video info:', error);
    throw new Error(`Failed to fetch video info: ${error.message}`);
  }
}

// Stream wrapper with error handling
function createStream(url) {
  try {
    return ytdl(url, ytdlOptions);
  } catch (error) {
    logger.error('Error creating stream:', error);
    throw new Error(`Failed to create stream: ${error.message}`);
  }
}

module.exports = {
  getInfo,
  createStream
}; 