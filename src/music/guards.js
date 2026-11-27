const { MessageFlags } = require('discord.js');
const { GuildQueue } = require('./GuildQueue');

// For control commands: there must be an active queue and the user must be in its voice channel.
// Returns the queue, or null after replying with the reason.
async function requireQueue(interaction, { needsTrack = true } = {}) {
  const queue = interaction.inGuild() ? GuildQueue.get(interaction.guild.id) : null;
  if (!queue || (needsTrack && !queue.current)) {
    await interaction.reply({ content: 'Nothing is playing right now.', flags: MessageFlags.Ephemeral });
    return null;
  }
  if (interaction.member.voice?.channelId !== queue.voiceChannelId) {
    await interaction.reply({ content: 'You need to be in my voice channel to do that.', flags: MessageFlags.Ephemeral });
    return null;
  }
  return queue;
}

module.exports = { requireQueue };
