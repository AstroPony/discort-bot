const { SlashCommandBuilder } = require('discord.js');
const { requireQueue } = require('../music/guards');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current song'),
  async execute(interaction) {
    const queue = await requireQueue(interaction);
    if (!queue) return;
    if (queue.paused) return interaction.reply('Already paused. Use `/resume` to continue.');
    queue.pause();
    await interaction.reply(`⏸️ Paused **${queue.current.title}**.`);
  },
};
