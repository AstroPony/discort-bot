const { SlashCommandBuilder } = require('discord.js');
const { requireQueue } = require('../music/guards');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
  async execute(interaction) {
    const queue = await requireQueue(interaction);
    if (!queue) return;
    const title = queue.current.title;
    const next = queue.tracks[0];
    queue.skip();
    await interaction.reply(`⏭️ Skipped **${title}**.${next ? '' : ' The queue is empty now.'}`);
  },
};
