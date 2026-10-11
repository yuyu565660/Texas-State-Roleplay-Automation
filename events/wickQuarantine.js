const { Events } = require("discord.js");
const s = require("../utils/wickSecurity");
const store = require("../utils/wickQuarantine");

async function processStoredQuarantine(member, client) {
    const stored = store.get(member.guild.id, member.id);
    if (!stored) return;

    if (member.roles.cache.has(s.QUARANTINE_ROLE_ID)) {
        if (stored.expiresAt) s.scheduleQuarantineExpiry(member, stored.expiresAt);
        return;
    }

    await s.restoreQuarantineRoles(member, "Quarantine role was removed while the bot was offline");
}

module.exports = {
    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember, client) {
        if (!newMember?.guild || newMember.user?.bot) return;

        const key = newMember.guild.id + ":" + newMember.id;
        if (client._wickRoleOperations?.has(key)) return;

        const oldHas = oldMember.roles.cache.has(s.QUARANTINE_ROLE_ID);
        const newHas = newMember.roles.cache.has(s.QUARANTINE_ROLE_ID);

        if (!oldHas && newHas) {
            // An administrator, trusted user, or trusted role is never automatically stripped.
            if (s.hasSecurityBypass(newMember)) return;

            await s.quarantineMember(
                newMember,
                "Wick quarantine role detected"
            );
            return;
        }

        if (oldHas && !newHas) {
            await s.restoreQuarantineRoles(
                newMember,
                "Quarantine role removed"
            );
        }
    }
};

module.exports.restoreStoredQuarantines = async function(client) {
    for (const guild of client.guilds.cache.values()) {
        const entries = store.all();

        for (const value of Object.values(entries)) {
            if (value.guildId !== guild.id) continue;

            const member = await guild.members.fetch(value.userId).catch(() => null);
            if (!member) continue;

            await processStoredQuarantine(member, client);
        }
    }
};
