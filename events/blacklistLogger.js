const { Events, EmbedBuilder } = require("discord.js");

const BLACKLIST_LOG_CHANNEL_ID = "1538189707874406562";

const BLACKLIST_ROLES = {
    "1403586702844498082": "Staff Blacklist",
    "1527165715768021103": "High Rank Blacklist",
    "1530786656905465876": "Ban Appeal Blacklist",
    "1528556977792352347": "Application Blacklist",
    "1403586702844498081": "Ticket Blacklist",
    "1535793077862535168": "Suggestion Blacklist"
};

global.blacklistRestoreInProgress = global.blacklistRestoreInProgress || new Set();

module.exports = {
    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember) {
        try {
            if (oldMember.guild.id !== newMember.guild.id) return;

            for (const roleId of Object.keys(BLACKLIST_ROLES)) {
                const hadRole = oldMember.roles.cache.has(roleId);
                const hasRole = newMember.roles.cache.has(roleId);

                if (hadRole === hasRole) continue;

                const restoreKey = `${newMember.id}-${roleId}`;

                if (hasRole && global.blacklistRestoreInProgress.has(restoreKey)) {
                    global.blacklistRestoreInProgress.delete(restoreKey);
                    continue;
                }

                const logChannel = newMember.guild.channels.cache.get(
                    BLACKLIST_LOG_CHANNEL_ID
                );

                if (!logChannel || !logChannel.isTextBased()) {
                    console.error(
                        `Blacklist log channel ${BLACKLIST_LOG_CHANNEL_ID} was not found or is not text-based.`
                    );
                    continue;
                }

                const added = hasRole;

                const embed = new EmbedBuilder()
                    .setTitle(added ? "Blacklist Role Added" : "Blacklist Role Removed")
                    .setColor(added ? "#E74C3C" : "#43E04E")
                    .addFields(
                        {
                            name: "User",
                            value: `${newMember.user} (${newMember.user.tag})`,
                            inline: false
                        },
                        {
                            name: "User ID",
                            value: newMember.id,
                            inline: true
                        },
                        {
                            name: "Action",
                            value: added ? "Added" : "Removed",
                            inline: true
                        },
                        {
                            name: "Blacklist",
                            value: BLACKLIST_ROLES[roleId],
                            inline: false
                        }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error("Blacklist role logging error:", error);
        }
    }
};
