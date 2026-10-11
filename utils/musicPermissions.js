const { MessageFlags, PermissionFlagsBits } = require("discord.js");

// Server staff roles used by the main bot.
const CONTROL_ROLE_ID = "1403586703716777988"; // High Rank
const FULL_ROLE_IDS = ["1523086104193142945", "1403586703612186670"]; // Management and Board
const FULL_ROLE_ID = FULL_ROLE_IDS[0];

function hasRole(member, roleId) {
    if (!member || !roleId) return false;
    if (member.roles?.cache?.has?.(roleId)) return true;
    if (Array.isArray(member.roles) && member.roles.includes(roleId)) return true;
    return false;
}

function hasAnyRole(member, roleIds) {
    return roleIds.some(roleId => hasRole(member, roleId));
}

function canControl(member) {
    return Boolean(
        member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
        hasRole(member, CONTROL_ROLE_ID) ||
        hasAnyRole(member, FULL_ROLE_IDS)
    );
}

function canManage(member) {
    return Boolean(
        member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
        hasRole(member, CONTROL_ROLE_ID) ||
        hasAnyRole(member, FULL_ROLE_IDS)
    );
}

function deny(interaction, message = "You do not have permission to use this music command.") {
    return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}

module.exports = { CONTROL_ROLE_ID, FULL_ROLE_ID, FULL_ROLE_IDS, hasRole, canControl, canManage, deny };
