const ytdlp = require('yt-dlp-exec');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

// Fetch video info using yt-dlp
async function getInfo(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });
    return info;
  } catch (error) {
    logger.error('Error fetching video info:', error);
    throw new Error(`Failed to fetch video info: ${error.stderr || error.message}`);
  }
}

// Create an audio stream using yt-dlp and ffmpeg
function createStream(url) {
  try {
    // yt-dlp outputs best audio, piped to ffmpeg to get opus for Discord
    const ytdlpProcess = spawn('yt-dlp', [
      '-f', 'bestaudio',
      '-o', '-',
      '--no-playlist',
      url
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    return ytdlpProcess.stdout;
  } catch (error) {
    logger.error('Error creating stream:', error);
    throw new Error(`Failed to create stream: ${error.message}`);
  }
}

module.exports = {
  getInfo,
  createStream
}; 