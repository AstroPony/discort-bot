const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { GuildQueue, formatDuration } = require('../music/GuildQueue');

const SHOW = 10;

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the song queue'),
  async execute(interaction) {
    const queue = interaction.inGuild() ? GuildQueue.get(interaction.guild.id) : null;
    if (!queue?.current) {
      return interaction.reply({ content: 'The queue is empty.', flags: MessageFlags.Ephemeral });
    }
    const lines = [`${queue.paused ? '⏸️' : '🎶'} **${queue.current.title}** (${formatDuration(queue.current.duration)})`];
    if (queue.tracks.length === 0) {
      lines.push('', 'Nothing queued after this.');
    } else {
      lines.push('', '**Up next:**');
      queue.tracks.slice(0, SHOW).forEach((t, i) =>
        lines.push(`${i + 1}. ${t.title} (${formatDuration(t.duration)}), ${t.requestedBy}`));
      if (queue.tracks.length > SHOW) lines.push(`…and ${queue.tracks.length - SHOW} more`);
    }
    // allowedMentions: list requesters without pinging them
    await interaction.reply({ content: lines.join('\n'), allowedMentions: { parse: [] } });
  },
};
