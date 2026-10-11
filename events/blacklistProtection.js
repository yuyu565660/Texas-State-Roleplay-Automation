const { Events } = require("discord.js");

const BLACKLIST_ROLES = [
    "1403586702844498082",
    "1527165715768021103",
    "1530786656905465876",
    "1528556977792352347",
    "1403586702844498081",
    "1535793077862535168"
];

global.approvedBlacklistRemovals = global.approvedBlacklistRemovals || new Set();
global.blacklistRestoreInProgress = global.blacklistRestoreInProgress || new Set();

module.exports = {
    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember) {
        try {
            const removedRoles = oldMember.roles.cache.filter(
                role => !newMember.roles.cache.has(role.id)
            );

            for (const role of removedRoles.values()) {
                if (!BLACKLIST_ROLES.includes(role.id)) continue;

                const removalKey = `${newMember.id}-${role.id}`;

                if (global.approvedBlacklistRemovals.has(removalKey)) {
                    global.approvedBlacklistRemovals.delete(removalKey);
                    console.log(
                        `Approved blacklist removal: ${newMember.user.tag} - ${role.name}`
                    );
                    continue;
                }

                global.blacklistRestoreInProgress.add(removalKey);

                try {
                    await newMember.roles.add(
                        role.id,
                        "Blacklist protection: unauthorized blacklist role removal"
                    );

                    console.log(
                        `Restored blacklist role for ${newMember.user.tag}: ${role.name}`
                    );
                } catch (error) {
                    global.blacklistRestoreInProgress.delete(removalKey);
                    console.error(
                        `Role restore failed for ${newMember.user.tag}:`,
                        error
                    );
                }
            }
        } catch (error) {
            console.error("Blacklist protection error:", error);
        }
    }
};
