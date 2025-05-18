const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
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
      await interaction.deferReply();
      const url = interaction.options.getString('url');
      
      if (!interaction.member.voice.channel) {
        return interaction.editReply('You need to be in a voice channel to use this command!');
      }

      logger.info(`Attempting to play URL: ${url}`);
      const info = await getInfo(url);
      const title = info.title;

      // Create voice connection with debug logging
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      // Add connection state change logging
      connection.on(VoiceConnectionStatus.Ready, () => {
        logger.info('Voice Connection is ready!');
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        logger.warn('Voice Connection disconnected!');
      });

      connection.on('error', error => {
        logger.error('Voice Connection error:', error);
      });

      // Create audio player with debug logging
      const player = createAudioPlayer();
      
      logger.info('Creating audio stream...');
      const stream = await createStream(url);
      
      logger.info('Creating audio resource...');
      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      // Set initial volume
      resource.volume?.setVolume(0.5);

      // Add player state change logging
      player.on(AudioPlayerStatus.Playing, () => {
        logger.info('Audio player is playing');
      });

      player.on(AudioPlayerStatus.Idle, () => {
        logger.info('Audio player is idle');
        connection.destroy();
      });

      player.on(AudioPlayerStatus.Buffering, () => {
        logger.info('Audio player is buffering');
      });

      player.on('error', error => {
        logger.error('Audio player error:', error);
        interaction.editReply('An error occurred while playing the audio.').catch(err => 
          logger.error('Error sending error message:', err)
        );
        connection.destroy();
      });

      // Subscribe connection to player
      const subscription = connection.subscribe(player);
      if (subscription) {
        logger.info('Successfully subscribed connection to player');
      } else {
        logger.error('Failed to subscribe connection to player');
        return interaction.editReply('Failed to establish audio playback connection');
      }

      // Start playback
      player.play(resource);
      logger.info(`Starting playback of: ${title}`);
      
      await interaction.editReply(`Now playing: ${title}`);
    } catch (error) {
      logger.error('Error in play command:', error);
      await interaction.editReply(`An error occurred: ${error.message}`).catch(err => 
        logger.error('Error sending error message:', err)
      );
    }
  }
}; 