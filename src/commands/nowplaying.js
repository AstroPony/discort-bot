const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { GuildQueue, formatDuration } = require('../music/GuildQueue');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the song that is playing'),
  async execute(interaction) {
    const queue = interaction.inGuild() ? GuildQueue.get(interaction.guild.id) : null;
    if (!queue?.current) {
      return interaction.reply({ content: 'Nothing is playing right now.', flags: MessageFlags.Ephemeral });
    }
    const t = queue.current;
    await interaction.reply({ allowedMentions: { parse: [] }, content: `${queue.paused ? '⏸️ Paused' : '🎶 Now playing'}: **${t.title}** (${formatDuration(t.duration)}), requested by ${t.requestedBy}\n<${t.url}>` });
  },
};
