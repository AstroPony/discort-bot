const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
} = require('@discordjs/voice');
const { createStream } = require('../config/ytdl');
const logger = require('../utils/logger');

// How long the bot waits in voice after the queue runs out before leaving.
const IDLE_TIMEOUT_MS = 60_000;

const queues = new Map();

class GuildQueue {
  constructor(guild, voiceChannel, textChannel) {
    this.guildId = guild.id;
    this.voiceChannelId = voiceChannel.id;
    this.textChannel = textChannel;
    this.tracks = [];
    this.current = null;
    this.kill = null;
    this.idleTimer = null;
    this.destroyed = false;

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.player = createAudioPlayer();
    this.connection.subscribe(this.player);

    this.connection.on('error', e => logger.error(`[${this.guildId}] voice connection error: ${e.message}`));
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Brief disconnects (region moves) recover on their own
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        logger.warn(`[${this.guildId}] voice disconnected, destroying queue`);
        this.destroy();
      }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.stopProcesses();
      this.current = null;
      this.playNext();
    });
    this.player.on('error', e => {
      logger.error(`[${this.guildId}] audio player error: ${e.message}`);
      this.announce(`⚠️ Playback error on **${e.resource?.metadata?.title ?? 'track'}**, skipping.`);
      // Idle fires after an error, which moves on to the next track
    });
  }

  static get(guildId) {
    return queues.get(guildId);
  }

  // Get the existing queue, or join the user's channel and create one.
  static async getOrCreate(interaction) {
    let queue = queues.get(interaction.guild.id);
    if (queue && !queue.destroyed) return queue;

    queue = new GuildQueue(interaction.guild, interaction.member.voice.channel, interaction.channel);
    queues.set(interaction.guild.id, queue);
    try {
      await entersState(queue.connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (error) {
      queue.destroy();
      throw error;
    }
    return queue;
  }

  // Add a track; starts playback if nothing is playing. Returns the queue position (0 = now playing).
  enqueue(track) {
    this.tracks.push(track);
    if (!this.current) {
      this.playNext();
      return 0;
    }
    return this.tracks.length;
  }

  playNext() {
    if (this.destroyed) return;
    const track = this.tracks.shift();
    if (!track) {
      this.scheduleLeave();
      return;
    }
    clearTimeout(this.idleTimer);
    this.idleTimer = null;

    const { stream, kill } = createStream(track.url);
    this.kill = kill;
    this.current = track;
    const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, metadata: track });
    this.player.play(resource);
    logger.info(`[${this.guildId}] now playing: ${track.title}`);
    if (track.announce) this.announce(`🎶 Now playing: **${track.title}** (requested by ${track.requestedBy})`);
  }

  skip() {
    // Stopping the player triggers Idle, which plays the next track
    return this.player.stop(true);
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  get paused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  scheduleLeave() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      logger.info(`[${this.guildId}] queue empty, leaving voice`);
      this.destroy();
    }, IDLE_TIMEOUT_MS);
  }

  stopProcesses() {
    this.kill?.();
    this.kill = null;
  }

  announce(content) {
    this.textChannel?.send({ content, allowedMentions: { parse: [] } }).catch(e => logger.warn(`[${this.guildId}] could not send message: ${e.message}`));
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.idleTimer);
    this.tracks = [];
    this.current = null;
    this.player.removeAllListeners(AudioPlayerStatus.Idle);
    this.player.stop(true);
    this.stopProcesses();
    if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy();
    queues.delete(this.guildId);
  }
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return 'live';
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return h ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

module.exports = { GuildQueue, formatDuration };
