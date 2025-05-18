const YtDlpWrap = require('yt-dlp-wrap').default;
const logger = require('../utils/logger');
const path = require('path');

// Use the bundled binary
const ytDlpWrap = new YtDlpWrap(path.join(__dirname, '../../node_modules/yt-dlp-wrap/binaries/yt-dlp'));
const { Readable } = require('stream');

// Fetch video info using yt-dlp-wrap
async function getInfo(url) {
  try {
    const infoArr = [];
    await ytDlpWrap.execPromise([
      url,
      '--dump-single-json',
      '--no-warnings',
      '--no-check-certificates',
      '--prefer-free-formats',
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]).then(json => {
      infoArr.push(JSON.parse(json));
    });
    return infoArr[0];
  } catch (error) {
    logger.error('Error fetching video info:', error);
    throw new Error(`Failed to fetch video info: ${error.stderr || error.message}`);
  }
}

// Create an audio stream using yt-dlp-wrap
function createStream(url) {
  try {
    // yt-dlp outputs best audio
    return ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
      '-o', '-',
      '--no-playlist',
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]);
  } catch (error) {
    logger.error('Error creating stream:', error);
    throw new Error(`Failed to create stream: ${error.message}`);
  }
}

module.exports = {
  getInfo,
  createStream
}; 