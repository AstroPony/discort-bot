const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { getInfo, createStream } = require('../config/ytdl');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('The YouTube URL to play')
        .setRequired(true)),

  async execute(interaction) {
    try {
      // Defer the reply immediately to prevent timeout
      await interaction.deferReply();

      const url = interaction.options.getString('url');
      
      // Check if user is in a voice channel
      if (!interaction.member.voice.channel) {
        return interaction.editReply('You need to be in a voice channel to use this command!');
      }

      // Get video info
      const info = await getInfo(url);
      const title = info.title;

      // Create voice connection
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // Create audio player and resource
      const player = createAudioPlayer();
      const resource = createAudioResource(createStream(url), {
        inlineVolume: true
      });

      // Set volume
      resource.volume.setVolume(0.5);

      // Handle player state changes
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on('error', error => {
        logger.error('Audio player error:', error);
        interaction.editReply('An error occurred while playing the audio.').catch(err => 
          logger.error('Error sending error message:', err)
        );
        connection.destroy();
      });

      // Play the audio
      connection.subscribe(player);
      player.play(resource);

      await interaction.editReply(`Now playing: ${title}`);
    } catch (error) {
      logger.error('Error in play command:', error);
      // Use editReply instead of followUp since we deferred
      await interaction.editReply(`An error occurred: ${error.message}`).catch(err => 
        logger.error('Error sending error message:', err)
      );
    }
  },
}; 