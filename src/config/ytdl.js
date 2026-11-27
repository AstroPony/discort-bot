const { spawn } = require('child_process');
const logger = require('../utils/logger');

// yt-dlp must be installed on the host (see README / Dockerfile).
// YouTube extraction needs a JS runtime; Node is always present, so point yt-dlp at it.
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const BASE_ARGS = ['--no-playlist', '--no-warnings', '--js-runtimes', `node:${process.execPath}`];

function run(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, [...BASE_ARGS, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('error', e => reject(new Error(`Could not start yt-dlp (${YTDLP}): ${e.message}`)));
    proc.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(err.trim().split('\n').pop() || `yt-dlp exited with code ${code}`));
    });
  });
}

// Fetch basic video info (title, duration, page URL)
async function getInfo(url) {
  const json = await run(['--dump-single-json', url]);
  const info = JSON.parse(json);
  return { title: info.title, duration: info.duration, url: info.webpage_url || url };
}

// Stream audio as Ogg/Opus: yt-dlp -> ffmpeg -> Discord.
// Opus output means @discordjs/voice only demuxes; no native Opus encoder is needed.
function createStream(url) {
  const ytdlp = spawn(YTDLP, [...BASE_ARGS, '-f', 'bestaudio/best', '-o', '-', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ffmpeg = spawn(FFMPEG, [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-ar', '48000',
    '-ac', '2',
    '-f', 'ogg',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ytdlp.stdout.pipe(ffmpeg.stdin);
  // Ignore EPIPE when ffmpeg is killed before yt-dlp finishes
  ffmpeg.stdin.on('error', () => {});
  ytdlp.stderr.on('data', d => logger.debug(`yt-dlp: ${d}`.trim()));
  ffmpeg.stderr.on('data', d => logger.warn(`ffmpeg: ${d}`.trim()));
  ytdlp.on('error', e => logger.error(`yt-dlp failed to start: ${e.message}`));
  ffmpeg.on('error', e => logger.error(`ffmpeg failed to start: ${e.message}`));

  const kill = () => {
    ytdlp.kill('SIGKILL');
    ffmpeg.kill('SIGKILL');
  };
  ffmpeg.stdout.on('close', kill);

  return { stream: ffmpeg.stdout, kill };
}

module.exports = { getInfo, createStream };
