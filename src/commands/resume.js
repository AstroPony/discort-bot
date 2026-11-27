const { SlashCommandBuilder } = require('discord.js');
const { requireQueue } = require('../music/guards');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the paused song'),
  async execute(interaction) {
    const queue = await requireQueue(interaction);
    if (!queue) return;
    if (!queue.paused) return interaction.reply("It's not paused.");
    queue.resume();
    await interaction.reply(`▶️ Resumed **${queue.current.title}**.`);
  },
};
