const { spawn } = require('child_process');
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
    if (error.code === 'ETXTBSY') {
      logger.warn('yt-dlp is busy, retrying in 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return ensureYtDlp();
    }
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
    if (error.code === 'ETXTBSY') {
      logger.warn('yt-dlp is busy, retrying in 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getInfo(url);
    }
    logger.error('Error fetching video info:', error);
    throw new Error(`Failed to fetch video info: ${error.stderr || error.message}`);
  }
}

// Create an audio stream using yt-dlp and ffmpeg for PCM output
async function createStream(url) {
  await ensureYtDlp();
  // yt-dlp outputs bestaudio to stdout, ffmpeg reads from stdin and outputs PCM
  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-', // output to stdout
    '--no-playlist',
    '--no-warnings',
    '--add-header', 'referer:youtube.com',
    '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    url
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ], { stdio: ['pipe', 'pipe', 'ignore'] });

  ytdlp.stdout.pipe(ffmpeg.stdin);

  return ffmpeg.stdout;
}

module.exports = {
  getInfo,
  createStream
}; 