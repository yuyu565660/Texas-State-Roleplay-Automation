const { issueStaffInfraction } = require("../commands/moderation/infract");

const TRIGGERS = {
    suspension: "1403586702773063727",
    tmSuspension: "1403586702773063728",
    twoStrikesTermination: "1403586702773063726"
};

const TM_ROLE = "1403586703146483801";

// Prevent duplicate infractions when Discord sends multiple role updates
// for the same member at nearly the same time.
const processing = new Set();

module.exports = {
    name: "guildMemberUpdate",

    async execute(oldMember, newMember, client) {
        if (!oldMember || !newMember || newMember.user?.bot) return;

        if (client._restoringInfractionUsers?.has(newMember.id)) return;

        const addedRoleIds = [...newMember.roles.cache.keys()].filter(
            roleId => !oldMember.roles.cache.has(roleId)
        );

        if (!addedRoleIds.length) return;

        let trigger = null;

        if (addedRoleIds.includes(TRIGGERS.twoStrikesTermination)) {
            trigger = "twoStrikesTermination";
        } else if (addedRoleIds.includes(TRIGGERS.tmSuspension) &&
                   newMember.roles.cache.has(TM_ROLE)) {
            trigger = "tmSuspension";
        } else if (addedRoleIds.includes(TRIGGERS.suspension)) {
            trigger = "suspension";
        }

        if (!trigger) return;

        const lockKey = newMember.guild.id + ":" + newMember.id;

        if (processing.has(lockKey)) return;
        processing.add(lockKey);

        try {
            // Give Discord a moment to finish applying all related roles.
            await new Promise(resolve => setTimeout(resolve, 750));

            const freshMember = await newMember.guild.members
                .fetch(newMember.id, { force: true })
                .catch(() => newMember);

            // Make sure the triggering role is still present before acting.
            if (!freshMember.roles.cache.has(TRIGGERS[trigger])) return;

            // If the TM trigger was added, it must still be paired with the TM role.
            if (
                trigger === "tmSuspension" &&
                !freshMember.roles.cache.has(TM_ROLE)
            ) {
                return;
            }

            const botUser = client.user;
            if (!botUser) return;

            console.log(
                "[AUTOMATIC INFRACTION] Trigger detected: " +
                trigger +
                " for " +
                freshMember.user.tag +
                " (" +
                freshMember.id +
                ")"
            );

            const result = await issueStaffInfraction({
                guild: freshMember.guild,
                user: freshMember.user,
                issuerId: botUser.id,
                punishment: "Automatic Infraction",
                reason: "Automatic staff role trigger",
                notes: "Issued automatically by the staff infraction system.",
                appealable: "Unappealable"
            });

            if (!result.success) {
                console.error(
                    "[AUTOMATIC INFRACTION] Failed for " +
                    freshMember.id +
                    ": " +
                    result.error
                );
                return;
            }

            console.log(
                "[AUTOMATIC INFRACTION] Issued " +
                result.id +
                " for " +
                freshMember.user.tag
            );
        } catch (error) {
            console.error(
                "[AUTOMATIC INFRACTION] Error processing " +
                newMember.id +
                ":",
                error
            );
        } finally {
            setTimeout(() => processing.delete(lockKey), 5000);
        }
    }
};
