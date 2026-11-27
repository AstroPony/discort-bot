const { SlashCommandBuilder } = require('discord.js');
const { requireQueue } = require('../music/guards');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback, clear the queue and leave the voice channel'),
  async execute(interaction) {
    const queue = await requireQueue(interaction, { needsTrack: false });
    if (!queue) return;
    queue.destroy();
    await interaction.reply('⏹️ Stopped and cleared the queue. Bye!');
  },
};
