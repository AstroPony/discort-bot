const { PermissionsBitField } = require('discord.js');
const logger = require('./logger');

class PermissionChecker {
  static async checkPermissions(interaction, requiredPermissions = {}) {
    const {
      roles = [],
      channels = [],
      permissions = []
    } = requiredPermissions;

    try {
      // Check role permissions
      if (roles.length > 0) {
        const memberRoles = interaction.member.roles.cache;
        const hasRequiredRole = roles.some(roleId => memberRoles.has(roleId));
        
        if (!hasRequiredRole) {
          await interaction.reply({
            content: 'You do not have the required role to use this command.',
            ephemeral: true
          });
          return false;
        }
      }

      // Check channel permissions
      if (channels.length > 0) {
        const currentChannel = interaction.channelId;
        if (!channels.includes(currentChannel)) {
          await interaction.reply({
            content: 'This command cannot be used in this channel.',
            ephemeral: true
          });
          return false;
        }
      }

      // Check Discord permissions
      if (permissions.length > 0) {
        const memberPermissions = interaction.member.permissions;
        const missingPermissions = permissions.filter(
          permission => !memberPermissions.has(permission)
        );

        if (missingPermissions.length > 0) {
          await interaction.reply({
            content: `You are missing the following permissions: ${missingPermissions.join(', ')}`,
            ephemeral: true
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking permissions:', error);
      await interaction.reply({
        content: 'An error occurred while checking permissions.',
        ephemeral: true
      });
      return false;
    }
  }
}

module.exports = PermissionChecker; 