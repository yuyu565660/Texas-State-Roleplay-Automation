const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const config = require("../config.json");

// ==========================================================
// AUTO-INFRACTION CONFIG
// ==========================================================

// Role that triggers the automatic infraction
const WARNING_TRIGGER_ROLE = "1403586702773063725";

// Strike roles
const STRIKE_1_ROLE = "1403586702773063728";
const STRIKE_2_ROLE = "1403586702773063727";
const STRIKE_3_ROLE = "1403586702773063726";

// Roles removed after the automatic infraction
const WARNING_ROLE_1 = "1403586702773063723";
const WARNING_ROLE_2 = "1403586702773063724";
const WARNING_ROLE_3 = "1403586702773063725";

// Infraction embed color
const INFRACTION_COLOR = "#43E04E";

// ==========================================================
// RANDOM INFRACTION ID
// ==========================================================

function generateRandomID() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let id = "";

    for (let i = 0; i < 6; i++) {

        id += characters.charAt(
            Math.floor(
                Math.random() * characters.length
            )
        );

    }

    return id;
}

// ==========================================================
// CHECK IF INFRACTION ID EXISTS
// ==========================================================

async function generateUniqueInfractionID(channel) {

    let id;
    let exists = true;

    while (exists) {

        id = generateRandomID();

        exists = false;

        try {

            let before = undefined;

            while (true) {

                const messages =
                    await channel.messages.fetch({
                        limit: 100,
                        before
                    });

                if (messages.size === 0) {
                    break;
                }

                for (const message of messages.values()) {

                    if (
                        !message.embeds ||
                        message.embeds.length === 0
                    ) {
                        continue;
                    }

                    const embed =
                        message.embeds[0];

                    const description =
                        embed.description || "";

                    if (
                        description.includes(
                            `\`${id}\``
                        )
                    ) {

                        exists = true;
                        break;

                    }

                }

                if (exists) {
                    break;
                }

                if (messages.size < 100) {
                    break;
                }

                before =
                    messages.last().id;
            }

        } catch (error) {

            console.error(
                "Auto Infraction ID Check Error:",
                error
            );

        }

    }

    return id;
}

// ==========================================================
// MODULE
// ==========================================================

module.exports = {

    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember) {

        try {

            // ==================================================
            // ONLY RUN WHEN THE TRIGGER ROLE IS ADDED
            // ==================================================

            const hadTriggerRole =
                oldMember.roles.cache.has(
                    WARNING_TRIGGER_ROLE
                );

            const hasTriggerRole =
                newMember.roles.cache.has(
                    WARNING_TRIGGER_ROLE
                );

            // Role wasn't newly added
            if (
                hadTriggerRole ||
                !hasTriggerRole
            ) {
                return;
            }

            // ==================================================
            // DETERMINE STRIKE
            // ==================================================

            let strikeName;
            let strikeRole;

            if (
                newMember.roles.cache.has(
                    STRIKE_1_ROLE
                )
            ) {

                strikeName =
                    "Strike 2";

                strikeRole =
                    STRIKE_2_ROLE;

            } else if (
                newMember.roles.cache.has(
                    STRIKE_2_ROLE
                )
            ) {

                strikeName =
                    "Strike 3";

                strikeRole =
                    STRIKE_3_ROLE;

            } else {

                strikeName =
                    "Strike 1";

                strikeRole =
                    STRIKE_1_ROLE;

            }

            // ==================================================
            // FIND INFRACTION LOG CHANNEL
            // ==================================================

            const channel =
                newMember.guild.channels.cache.get(
                    config.channels?.infractionLogs
                );

            if (!channel) {

                console.error(
                    "Auto Infraction Error: Infraction log channel not found."
                );

                return;
            }

            // ==================================================
            // GENERATE INFRACTION ID
            // ==================================================

            const infractionID =
                await generateUniqueInfractionID(
                    channel
                );

            // ==================================================
            // BOT USER
            // ==================================================

            const botUser =
                newMember.client.user;

            // ==================================================
            // SERVER LOGO
            // ==================================================

            const serverIcon =
                newMember.guild.iconURL({
                    extension: "png",
                    size: 256
                });

            // ==================================================
            // CREATE INFRACTION EMBED
            // ==================================================

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "Staff Infraction"
                    )

                    .setColor(
                        INFRACTION_COLOR
                    )

                    .setThumbnail(
                        serverIcon
                    )

                    .setDescription(
                        `The high-ranking team has decided to take disciplinary action against you.\n\n` +

                        `**Punishment:**\n` +
                        `${strikeName}\n\n` +

                        `**Reason:**\n` +
                        `Having 3 warnings\n\n` +

                        `**Notes:**\n` +
                        `Only the warnings are appealable.\n\n` +

                        `**Appeal Status:**\n` +
                        `Unappealable\n\n` +

                        `━━━━━━━━━━━━━━━━━━\n\n` +

                        `**Issued by:**\n` +
                        `${botUser}\n\n` +

                        `**Infraction ID:**\n` +
                        `\`${infractionID}\``
                    )

                    .setTimestamp();

            // ==================================================
            // VOID BUTTON
            // ==================================================

            const button =
                new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                `void_infraction_${infractionID}`
                            )

                            .setLabel(
                                "Void Infraction"
                            )

                            .setStyle(
                                ButtonStyle.Danger
                            )

                    );

            // ==================================================
            // SEND INFRACTION
            // ==================================================

            const message =
                await channel.send({

                    content:
                        `${newMember}`,

                    embeds: [
                        embed
                    ],

                    components: [
                        button
                    ]

                });

            // ==================================================
            // CREATE PROOF THREAD
            // ==================================================

            try {

                const thread =
                    await message.startThread({

                        name:
                            `Proofs - ${infractionID}`,

                        autoArchiveDuration:
                            1440,

                        reason:
                            "Automatic infraction proof discussion"

                    });

                await thread.send({

                    content:
                        `${newMember}\n\n` +

                        `This is the official thread for discussing the infraction and providing proofs.\n\n` +

                        `**Infraction ID:**\n` +
                        `\`${infractionID}\`\n\n` +

                        `**Issued by:**\n` +
                        `${botUser}`

                });

            } catch (error) {

                console.error(
                    "Auto Infraction Proof Thread Error:",
                    error
                );

            }

            // ==================================================
            // ADD STRIKE ROLE
            // ==================================================

            try {

                if (
                    !newMember.roles.cache.has(
                        strikeRole
                    )
                ) {

                    await newMember.roles.add(
                        strikeRole,
                        `Automatic ${strikeName} for receiving three warnings`
                    );

                }

            } catch (error) {

                console.error(
                    "Auto Infraction Strike Role Error:",
                    error
                );

            }

            // ==================================================
            // REMOVE WARNING ROLES
            // ==================================================

            const rolesToRemove = [
                WARNING_ROLE_1,
                WARNING_ROLE_2,
                WARNING_ROLE_3
            ];

            for (
                const roleId of rolesToRemove
            ) {

                if (
                    newMember.roles.cache.has(
                        roleId
                    )
                ) {

                    try {

                        await newMember.roles.remove(
                            roleId,
                            "Warnings converted into automatic infraction"
                        );

                    } catch (error) {

                        console.error(
                            `Could not remove warning role ${roleId}:`,
                            error
                        );

                    }

                }

            }

            // ==================================================
            // DM USER
            // ==================================================

            try {

                await newMember.user.send({

                    embeds: [
                        embed
                    ]

                });

            } catch (error) {

                console.log(
                    `Could not DM ${newMember.user.tag} about ${strikeName}.`
                );

            }

            // ==================================================
            // LOG
            // ==================================================

            console.log(
                `Automatic ${strikeName} issued to ${newMember.user.tag} (${newMember.id}). Infraction ID: ${infractionID}`
            );

        } catch (error) {

            console.error(
                "Guild Member Update Auto Infraction Error:",
                error
            );

        }

    }

};
