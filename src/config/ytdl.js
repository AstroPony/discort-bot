const YtDlpWrap = require('yt-dlp-wrap').default;
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Initialize yt-dlp with auto-download
const ytDlpWrap = new YtDlpWrap();

// Download yt-dlp if needed
async function ensureYtDlp() {
  try {
    await YtDlpWrap.downloadFromGithub();
    logger.info('Successfully downloaded yt-dlp');
  } catch (error) {
    logger.error('Error downloading yt-dlp:', error);
    throw error;
  }
}

// Fetch video info using yt-dlp-wrap
async function getInfo(url) {
  try {
    await ensureYtDlp();
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
async function createStream(url) {
  try {
    await ensureYtDlp();
    // Use PCM format and let discord.js handle opus encoding
    return ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'wav', // Change to WAV format
      '--audio-quality', '0',
      '-o', '-',
      '--no-playlist',
      '--no-warnings',
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