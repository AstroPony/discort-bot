const { spawn } = require('child_process');
const logger = require('../utils/logger');

// yt-dlp must be installed on the host (see README / Dockerfile).
// YouTube extraction needs a JS runtime; Node is always present, so point yt-dlp at it.
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const BASE_ARGS = ['--no-warnings', '--js-runtimes', `node:${process.execPath}`];

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

// Most songs a single /play can add from one playlist.
const MAX_PLAYLIST_TRACKS = 100;

// Fetch basic video info (title, duration, page URL)
async function getInfo(url) {
  const json = await run(['--no-playlist', '--dump-single-json', url]);
  const info = JSON.parse(json);
  return { title: info.title, duration: info.duration, url: info.webpage_url || url };
}

// A URL counts as a playlist when it has a list= parameter. YouTube's auto-generated
// mixes (list=RD...) get attached to ordinary video links, so those stay a single video.
function playlistParams(url) {
  try {
    const params = new URL(url).searchParams;
    const list = params.get('list');
    if (!list) return null;
    const videoId = params.get('v');
    if (videoId && list.startsWith('RD')) return null;
    return { videoId };
  } catch {
    return null;
  }
}

const UNAVAILABLE = new Set(['[Private video]', '[Deleted video]']);

// Resolve a URL to the tracks it stands for: one video, or the songs of a playlist.
// Returns { playlist: title or null, tracks: [{ title, duration, url }] }.
async function getTracks(url) {
  const params = playlistParams(url);
  if (!params) return { playlist: null, tracks: [await getInfo(url)] };

  // --flat-playlist lists the entries without resolving every video, so big playlists stay fast
  const json = await run([
    '--yes-playlist', '--flat-playlist', '--dump-single-json',
    '--playlist-end', String(MAX_PLAYLIST_TRACKS), url,
  ]);
  const info = JSON.parse(json);
  let entries = (info.entries || []).filter(e => e && e.id && !UNAVAILABLE.has(e.title));

  // A watch?v=X&list=Y link starts the playlist at video X
  if (params.videoId) {
    const start = entries.findIndex(e => e.id === params.videoId);
    if (start > 0) entries = entries.slice(start);
  }
  if (!entries.length) throw new Error('That playlist has no playable videos.');

  return {
    playlist: info.title || 'playlist',
    tracks: entries.map(e => ({
      title: e.title || e.id,
      duration: e.duration,
      url: e.ie_key === 'Youtube' || !e.url ? `https://www.youtube.com/watch?v=${e.id}` : e.url,
    })),
  };
}

// Stream audio as Ogg/Opus: yt-dlp -> ffmpeg -> Discord.
// Opus output means @discordjs/voice only demuxes; no native Opus encoder is needed.
function createStream(url) {
  const ytdlp = spawn(YTDLP, [...BASE_ARGS, '--no-playlist', '-f', 'bestaudio/best', '-o', '-', url], {
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

module.exports = { getInfo, getTracks, createStream };
