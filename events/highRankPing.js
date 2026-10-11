const {
    Events
} = require("discord.js");

module.exports = {

    name: Events.MessageCreate,

    async execute(message) {

        // ==========================================================
        // IGNORE BOTS / DMS
        // ==========================================================

        if (message.author.bot) return;

        if (!message.guild) return;

        // ==========================================================
        // ROLE IDS
        // ==========================================================

        const highRankRole =
            "1403586703716777988";

        const allowedRoles = [
            "1403586702492303379",
            "1526415142408163430",
            "1403586703146483793"
        ];

        // ==========================================================
        // PING TRACKER
        // ==========================================================

        if (!global.highRankPingTracker) {
            global.highRankPingTracker = new Map();
        }

        const pingTracker =
            global.highRankPingTracker;

        // ==========================================================
        // CHECK FOR HIGH RANK PING
        // ==========================================================

        if (
            !message.mentions.roles.has(
                highRankRole
            )
        ) {
            return;
        }

        // ==========================================================
        // ALLOWED USERS
        // ==========================================================

        if (
            message.member.roles.cache.has(
                highRankRole
            )
        ) {
            return;
        }

        if (message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return;
        }

        // ==========================================================
        // GET CURRENT PING COUNT
        // ==========================================================

        let count =
            pingTracker.get(
                message.author.id
            ) || 0;

        count++;

        pingTracker.set(
            message.author.id,
            count
        );

        console.log(
            `[HIGH RANK PING] ${message.author.tag} (${message.author.id}) ping count: ${count}`
        );

        // ==========================================================
        // DELETE UNAUTHORIZED PING
        // ==========================================================

        await message.delete().catch(() => {});

        // ==========================================================
        // 15 PINGS = KICK
        // ==========================================================

        if (count >= 15) {

            pingTracker.delete(
                message.author.id
            );

            try {

                await message.member.kick(
                    "Repeated unauthorized High Rank Staff pings - 15 pings"
                );

                await message.channel.send({

                    content:
                        `${message.author} has been kicked for repeatedly pinging High Rank Staff 15 times.`

                }).then(msg => {

                    setTimeout(() => {

                        msg.delete().catch(() => {});

                    }, 10000);

                }).catch(() => {});

            } catch (error) {

                console.error(
                    "15-ping kick error:",
                    error
                );

                await message.channel.send({

                    content:
                        `${message.author} reached 15 unauthorized High Rank pings, but I could not kick them. Check the bot's Kick Members permission and role hierarchy.`

                }).catch(() => {});

            }

            return;
        }

        // ==========================================================
        // 10 PINGS = KICK
        // ==========================================================

        if (count >= 10) {

            pingTracker.delete(
                message.author.id
            );

            try {

                await message.member.kick(
                    "Repeated unauthorized High Rank Staff pings - 10 pings"
                );

                await message.channel.send({

                    content:
                        `${message.author} has been kicked for repeatedly pinging High Rank Staff 10 times.`

                }).then(msg => {

                    setTimeout(() => {

                        msg.delete().catch(() => {});

                    }, 10000);

                }).catch(() => {});

            } catch (error) {

                console.error(
                    "10-ping kick error:",
                    error
                );

                await message.channel.send({

                    content:
                        `${message.author} reached 10 unauthorized High Rank pings, but I could not kick them. Check the bot's Kick Members permission and role hierarchy.`

                }).catch(() => {});

            }

            return;
        }

        // ==========================================================
        // 5 PINGS = 10 MINUTE MUTE
        // ==========================================================

        if (count >= 5) {

            pingTracker.delete(
                message.author.id
            );

            try {

                await message.member.timeout(

                    10 * 60 * 1000,

                    "Repeated unauthorized High Rank Staff pings - 5 pings"

                );

                await message.channel.send({

                    content:
                        `${message.author} has been muted for 10 minutes for repeatedly pinging High Rank Staff.`

                }).then(msg => {

                    setTimeout(() => {

                        msg.delete().catch(() => {});

                    }, 10000);

                }).catch(() => {});

            } catch (error) {

                console.error(
                    "10-minute timeout error:",
                    error
                );

                await message.channel.send({

                    content:
                        `${message.author} reached 5 unauthorized High Rank pings, but I could not mute them. Check the bot's Moderate Members permission and role hierarchy.`

                }).catch(() => {});

            }

            return;
        }

        // ==========================================================
        // 2 PINGS = 1 MINUTE MUTE
        // ==========================================================

        if (count >= 2) {

            pingTracker.delete(
                message.author.id
            );

            try {

                await message.member.timeout(

                    60 * 1000,

                    "Repeated unauthorized High Rank Staff pings - 2 pings"

                );

                await message.channel.send({

                    content:
                        `${message.author} has been muted for 1 minute for repeatedly pinging High Rank Staff.`

                }).then(msg => {

                    setTimeout(() => {

                        msg.delete().catch(() => {});

                    }, 10000);

                }).catch(() => {});

            } catch (error) {

                console.error(
                    "1-minute timeout error:",
                    error
                );

                await message.channel.send({

                    content:
                        `${message.author} reached 2 unauthorized High Rank pings, but I could not mute them. Check the bot's Moderate Members permission and role hierarchy.`

                }).catch(() => {});

            }

            return;
        }

        // ==========================================================
        // FIRST PING WARNING
        // ==========================================================

        await message.channel.send({

            content:
                `${message.author}, please do not ping High Rank Staff. Unauthorized pings: 1/2.`

        }).then(msg => {

            setTimeout(() => {

                msg.delete().catch(() => {});

            }, 10000);

        }).catch(() => {});

    }

};
