const { SlashCommandBuilder } = require('discord.js');
const { getTracks } = require('../config/ytdl');
const { GuildQueue, formatDuration } = require('../music/GuildQueue');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube, or add it to the queue')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('A YouTube video or playlist URL')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.inGuild() ? interaction.member.voice?.channel : null;
    if (!voiceChannel) {
      return interaction.editReply('You need to be in a voice channel to use this command!');
    }

    const existing = GuildQueue.get(interaction.guild.id);
    if (existing && existing.voiceChannelId !== voiceChannel.id) {
      return interaction.editReply("I'm already playing in another voice channel. Join that one to add songs.");
    }

    const url = interaction.options.getString('url');
    logger.info(`Attempting to play URL: ${url}`);

    let result;
    try {
      result = await getTracks(url);
    } catch (error) {
      logger.error(`Could not fetch info for ${url}: ${error.message}`);
      return interaction.editReply(`Couldn't load that link: ${error.message}`);
    }

    let queue;
    try {
      queue = await GuildQueue.getOrCreate(interaction);
    } catch (error) {
      logger.error(`Could not join voice: ${error.message}`);
      return interaction.editReply("I couldn't join your voice channel. Check that I have Connect and Speak permissions.");
    }

    const requestedBy = interaction.user.toString();
    // The reply covers the first song if it starts now; songs that start later get announced in the channel
    const wasPlaying = Boolean(queue.current);
    const positions = result.tracks.map((info, i) => queue.enqueue({
      ...info,
      requestedBy,
      announce: wasPlaying || i > 0,
    }));

    const first = result.tracks[0];
    const firstLine = positions[0] === 0
      ? `▶️ Now playing: **${first.title}** (${formatDuration(first.duration)})`
      : `starting at #${positions[0]} in the queue`;

    if (!result.playlist) {
      return interaction.editReply(positions[0] === 0
        ? firstLine
        : `➕ Added to the queue at #${positions[0]}: **${first.title}** (${formatDuration(first.duration)})`);
    }

    const count = result.tracks.length;
    await interaction.editReply(
      `📃 Added ${count} song${count === 1 ? '' : 's'} from **${result.playlist}**, ${positions[0] === 0 ? 'starting now.' : firstLine + '.'}`
      + (positions[0] === 0 ? `\n${firstLine}` : ''),
    );
  },
};
