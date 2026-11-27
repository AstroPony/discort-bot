const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
} = require('@discordjs/voice');
const { getInfo, createStream } = require('../config/ytdl');
const logger = require('../utils/logger');

// One player per guild, so a new /play replaces the current song instead of
// spawning a second player and leaking the old connection.
const players = new Map();

function getPlayer(guildId) {
  let entry = players.get(guildId);
  if (entry) return entry;

  const player = createAudioPlayer();
  entry = { player, kill: null };

  player.on(AudioPlayerStatus.Playing, () => logger.info(`[${guildId}] playing`));
  player.on(AudioPlayerStatus.Idle, () => {
    logger.info(`[${guildId}] idle, leaving voice`);
    entry.kill?.();
    getVoiceConnection(guildId)?.destroy();
    players.delete(guildId);
  });
  player.on('error', error => logger.error(`[${guildId}] audio player error: ${error.message}`));

  players.set(guildId, entry);
  return entry;
}

async function connect(interaction) {
  const channel = interaction.member.voice.channel;
  const guildId = interaction.guild.id;

  let connection = getVoiceConnection(guildId);
  if (!connection || connection.joinConfig.channelId !== channel.id) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    connection.on('error', error => logger.error(`[${guildId}] voice connection error: ${error.message}`));

    // Try to recover from brief disconnects (e.g. region moves); otherwise clean up.
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        logger.warn(`[${guildId}] voice disconnected, cleaning up`);
        players.get(guildId)?.kill?.();
        players.delete(guildId);
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
      }
    });
  }

  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return connection;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The YouTube URL to play')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.inGuild() || !interaction.member.voice?.channel) {
      return interaction.editReply('You need to be in a voice channel to use this command!');
    }

    const url = interaction.options.getString('url');
    logger.info(`Attempting to play URL: ${url}`);

    let info;
    try {
      info = await getInfo(url);
    } catch (error) {
      logger.error(`Could not fetch info for ${url}: ${error.message}`);
      return interaction.editReply(`Couldn't load that video: ${error.message}`);
    }

    let connection;
    try {
      connection = await connect(interaction);
    } catch (error) {
      logger.error(`Could not join voice: ${error.message}`);
      getVoiceConnection(interaction.guild.id)?.destroy();
      return interaction.editReply("I couldn't join your voice channel. Check that I have Connect and Speak permissions.");
    }

    const entry = getPlayer(interaction.guild.id);
    const previousKill = entry.kill;
    const { stream, kill } = createStream(info.url);
    entry.kill = kill;

    const resource = createAudioResource(stream, { inputType: StreamType.OggOpus });
    connection.subscribe(entry.player);
    entry.player.play(resource);
    // Kill the old song's processes only after the new one has taken over,
    // so its stream ending doesn't trip the Idle handler.
    previousKill?.();

    logger.info(`Starting playback of: ${info.title}`);
    await interaction.editReply(`Now playing: **${info.title}**`);
  },
};
