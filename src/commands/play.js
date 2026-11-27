const { SlashCommandBuilder } = require('discord.js');
const { getInfo } = require('../config/ytdl');
const { GuildQueue, formatDuration } = require('../music/GuildQueue');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube, or add it to the queue')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The YouTube URL to play')
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

    let info;
    try {
      info = await getInfo(url);
    } catch (error) {
      logger.error(`Could not fetch info for ${url}: ${error.message}`);
      return interaction.editReply(`Couldn't load that video: ${error.message}`);
    }

    let queue;
    try {
      queue = await GuildQueue.getOrCreate(interaction);
    } catch (error) {
      logger.error(`Could not join voice: ${error.message}`);
      return interaction.editReply("I couldn't join your voice channel. Check that I have Connect and Speak permissions.");
    }

    const track = {
      ...info,
      requestedBy: interaction.user.toString(),
      // The reply covers the first song; songs that start later get announced in the channel
      announce: Boolean(queue.current),
    };
    const position = queue.enqueue(track);
    const length = formatDuration(track.duration);

    await interaction.editReply(position === 0
      ? `▶️ Now playing: **${track.title}** (${length})`
      : `➕ Added to the queue at #${position}: **${track.title}** (${length})`);
  },
};
