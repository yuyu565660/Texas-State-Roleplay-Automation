const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const config = require("../../config.json");
const { logToWebsite } = require("../../utils/websiteLogger");

const INFRACTION_PERMISSION_ROLE = "1403586703381237969";

const AUTOMATIC_INFRACTION = {
    suspensionTriggerRole: "1403586702773063727",
    suspensionRole: "1403586702773063729",
    tmRole: "1403586703146483801",
    tmSuspensionTriggerRole: "1403586702773063728",
    twoStrikesTerminationRole: "1403586702773063726",
    clearRoles: ["1403586703716777992","1403586703716777991","1403586703716777988","1537319246453801051","1403586703716777985","1539777937363177472","1403586703612186672","1543400351925796954","1543402907381145740","1526415142408163430","1547052300575572048","1536618144204853248","1403586703612186670","1537318283252863026","1534335606337831093","1403586703515582481","1548307017569935544","1546224633085427784","1403586703515582477","1403586703612186667","1536162096960770120","1403586703515582480","1403586703515582479","1536559873708400661","1522707386916409354","1538544885995675678","1403586703515582476","1403586703612186665","1403586703612186664","1403586703612186667","1403586703515582484","1403586703515582483","1526411632136159373","1403586703515582475","1403586703243083922","1403586703381237969","1526411586850263070","1526411531040985128","1536161991452795001","1403586703381237971","1526411315432652981","1524812476074561771","1541675793267040316","1538946269047693462","1535885935915442287","1534294797521649734","1523055595027169433","1403586703381237968","1403586703243083919","1522880716197859388","1403586703243083921","1522880704793284759","1403586703243083920","1522880646714757211","1403586703243083918","1403586703146483800","1403586703243083917","1403586703146483801","1403586703045693500","1403586703146483792","1539353256604729364","1539094189218734101","1531147797838168244","1523696980126072882","1531383641589157940","1534328751578546398","1403586702546571402","1529920867545518100","1548856071345541120","1555292635587936357"],
};

const { saveSuspension } = require("../../utils/staffSuspensions");
const { saveAutomaticInfraction } = require("../../utils/automaticInfractionStore");

function getHighestRoleBeforeInfraction(member) {
    const clear = new Set(AUTOMATIC_INFRACTION.clearRoles);
    return member.roles.cache
        .filter(role => clear.has(role.id))
        .sort((a, b) => b.position - a.position)
        .first() || null;
}

function getAutomaticInfraction(member) {
    if (!member) return null;
    const has = id => member.roles.cache.has(id);

    if (has(AUTOMATIC_INFRACTION.twoStrikesTerminationRole)) {
        return {
            type: "termination",
            punishment: "Termanation",
            reason: "2 Strikes",
            notes: "Can only appeal the strikes",
            appealable: "Unappealable"
        };
    }

    if (has(AUTOMATIC_INFRACTION.tmRole) && has(AUTOMATIC_INFRACTION.tmSuspensionTriggerRole)) {
        return {
            type: "termination",
            punishment: "Termanation",
            reason: "Strike as a TM",
            notes: "Can only appeal the strikes",
            appealable: "Unappealable"
        };
    }

    if (has(AUTOMATIC_INFRACTION.suspensionTriggerRole)) {
        return {
            type: "suspension",
            punishment: "Suspension",
            reason: "2 Strikes",
            notes: "3 day suspension.",
            appealable: "Unappealable"
        };
    }

    return null;
}

async function removeRolesSafely(member, roleIds) {
    const removed = [];
    const failed = [];

    for (const roleId of [...new Set(roleIds)]) {
        if (!member.roles.cache.has(roleId)) continue;

        try {
            await member.roles.remove(roleId, "Automatic staff infraction role action.");
            removed.push(roleId);
        } catch (error) {
            failed.push(roleId);
            console.error(`[AUTOMATIC INFRACTION] Failed to remove role ${roleId} from ${member.id}:`, error);
        }
    }

    return { removed, failed };
}

async function applyAutomaticInfraction(member, action) {
    const highestRole = getHighestRoleBeforeInfraction(member);

    // Remove each role individually so one unmanageable role does not
    // prevent the rest of the required roles from being removed.
    const automaticTriggerRoles = [
        AUTOMATIC_INFRACTION.suspensionTriggerRole,
        AUTOMATIC_INFRACTION.tmSuspensionTriggerRole,
        AUTOMATIC_INFRACTION.twoStrikesTerminationRole
    ];

    const rolesToRemove = [...new Set([...AUTOMATIC_INFRACTION.clearRoles, ...automaticTriggerRoles])].filter(id =>
        member.roles.cache.has(id)
    );
    const roleResult = await removeRolesSafely(member, rolesToRemove);

    if (action.type === "suspension") {
        try {
            await member.roles.add(
                AUTOMATIC_INFRACTION.suspensionRole,
                "3-day staff suspension."
            );
        } catch (error) {
            console.error(
                `[AUTOMATIC INFRACTION] Failed to add suspension role to ${member.id}:`,
                error
            );
            throw new Error("The suspension role could not be added. Check the bot's role hierarchy.");
        }

        if (highestRole) {
            saveSuspension(
                member.id,
                member.guild.id,
                highestRole.id,
                Date.now() + 3 * 24 * 60 * 60 * 1000
            );
        }
    }

    return { highestRole, roleResult };
}

function generateRandomID() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 6; i++) id += characters.charAt(Math.floor(Math.random() * characters.length));
    return id;
}

async function generateUniqueInfractionID(channel) {
    let id;
    let exists = true;
    while (exists) {
        id = generateRandomID();
        exists = false;
        try {
            let before;
            while (true) {
                const messages = await channel.messages.fetch({ limit: 100, before });
                if (!messages.size) break;
                for (const message of messages.values()) {
                    const description = message.embeds?.[0]?.description || "";
                    if (description.includes(`\`${id}\``)) {
                        exists = true;
                        break;
                    }
                }
                if (exists || messages.size < 100) break;
                before = messages.last().id;
            }
        } catch (error) {
            console.error("Error checking existing infraction IDs:", error);
        }
    }
    return id;
}

function getInfractionChannel(guild) {
    return guild.channels.cache.get(config.channels.infractionLogs);
}

function hasInfractionPermission(interaction) {
    return interaction.member?.roles?.cache?.has(INFRACTION_PERMISSION_ROLE);
}

async function getAllMessages(channel) {
    const allMessages = [];
    let before;
    while (true) {
        const messages = await channel.messages.fetch({ limit: 100, before });
        if (!messages.size) break;
        allMessages.push(...messages.values());
        if (messages.size < 100) break;
        before = messages.last().id;
    }
    return allMessages;
}

function getInfractionID(embed) {
    const match = (embed?.description || "").match(/\*\*Infraction ID:\*\*\s*\`([^\`]+)\`/);
    return match ? match[1] : null;
}

function isInfractionEmbed(embed) {
    return Boolean(embed && getInfractionID(embed));
}

function messageBelongsToUser(message, userId) {
    return message.content?.includes(`<@${userId}>`) || message.content?.includes(`<@!${userId}>`);
}

function getDescriptionValue(description, field) {
    const escaped = field.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
        `\\*\\*${escaped}:\\*\\*\\s*([\\s\\S]*?)(?=\\s+\\*\\*(?:Punishment|Reason|Notes|Appeal Status|Issued by|Infraction ID):\\*\\*|\\n━━━━━━━━━━━━━━━━━━|$)`,
        "i"
    );
    const match = description.match(regex);
    return match ? match[1].trim() : "Not provided";
}

function createInfractionViewEmbed(user, infractions) {
    const embed = new EmbedBuilder()
        .setTitle(`Infractions — ${user.tag}`)
        .setColor("#43E04E")
        .setDescription(`All recorded staff infractions for ${user}.\n\n**Total Infractions:** ${infractions.length}`)
        .setTimestamp();

    infractions.forEach((infraction, index) => {
        const message = infraction.message;
        const oldEmbed = message.embeds[0];
        const description = oldEmbed.description || "";
        const id = getInfractionID(oldEmbed) || "Unknown";
        const punishment = getDescriptionValue(description, "Punishment");
        const reason = getDescriptionValue(description, "Reason");
        const notes = getDescriptionValue(description, "Notes");
        const appealable = getDescriptionValue(description, "Appeal Status");
        const issuedBy = getDescriptionValue(description, "Issued by");
        const timestamp = message.createdAt ? `<t:${Math.floor(message.createdAt.getTime() / 1000)}:F>` : "Unknown";
        const isVoided = Boolean(oldEmbed.footer?.text?.startsWith("Voided by:") || oldEmbed.title?.includes("VOIDED"));

        embed.addFields({
            name: `${isVoided ? " VOIDED" : ""} Infraction ${index + 1} — ${id}`,
            value:
                `**Punishment:** ${punishment}\n` +
                `**Reason:** ${reason}\n` +
                `**Notes:** ${notes}\n` +
                `**Appeal Status:** ${appealable}\n` +
                `**Issued By:** ${issuedBy}\n` +
                `**Date:** ${timestamp}\n` +
                `**[Jump to Infraction](${message.url})**`
        });
    });

    return embed;
}

function voidRow(infractionId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`void_infraction_${infractionId}`)
            .setLabel("Void Infraction")
            .setStyle(ButtonStyle.Danger)
    );
}

async function issueStaffInfraction({ guild, user, issuerId, punishment, reason, notes, appealable }) {
    const channel = getInfractionChannel(guild);
    if (!channel) return { success: false, error: "Infraction log channel not found." };

    const issuer = await guild.client.users.fetch(issuerId).catch(() => null);
    if (!issuer) return { success: false, error: "Issuing user could not be found." };

    const member = await guild.members.fetch(user.id).catch(() => null);
    const automaticAction = getAutomaticInfraction(member);
    const roleBeforeSuspension = automaticAction?.type === "suspension"
        ? getHighestRoleBeforeInfraction(member)
        : null;

    let automaticResult = null;

    if (automaticAction && member) {
        punishment = automaticAction.punishment;
        reason = automaticAction.reason;
        notes = automaticAction.notes;
        appealable = automaticAction.appealable;
        automaticResult = await applyAutomaticInfraction(member, automaticAction);
    }

    const id = await generateUniqueInfractionID(channel);

    const descriptionLines = [
        "The high-ranking team has decided to take disciplinary action against you.",
        "",
        "**Punishment:** " + punishment,
        "**Reason:** " + reason,
        "**Notes:** " + notes,
        "**Appeal Status:** " + appealable
    ];

    if (roleBeforeSuspension) {
        descriptionLines.push(
            "**Role Before Suspension:** <@&" + roleBeforeSuspension.id + ">"
        );
    }

    descriptionLines.push("");
    descriptionLines.push("**Issued by:** **<@" + issuer.id + ">**");

    if (automaticAction) {
        descriptionLines.push("**Infracted by:** **the bot**");
    }

    descriptionLines.push("**Infraction ID:** \`" + id + "\`");

    const embed = new EmbedBuilder()
        .setTitle("Staff Infraction")
        .setColor("#43E04E")
        .setDescription(descriptionLines.join("\n"))
        .setTimestamp();

    if (automaticAction && automaticResult) {
        // Persist the removed roles immediately after the automatic role action.
        // This survives bot restarts and ensures a later void can restore the member.
        saveAutomaticInfraction(id, {
            userId: user.id,
            guildId: guild.id,
            removedRoleIds: automaticResult.roleResult?.removed || [],
            failedRoleIds: automaticResult.roleResult?.failed || [],
            suspensionRoleId: automaticAction.type === "suspension" ? AUTOMATIC_INFRACTION.suspensionRole : null,
            automaticType: automaticAction.type,
            roleBeforeSuspension: roleBeforeSuspension?.id || null,
            savedAt: Date.now()
        });
    }

    console.log(
        "[INFRACTION] Sending infraction panel for " +
        user.tag +
        " to #" +
        channel.name +
        " (" +
        channel.id +
        ") — ID " +
        id
    );

    const message = await channel.send({
        content: `<@${user.id}>`,
        allowedMentions: {
            users: [user.id]
        },
        embeds: [embed],
        components: [voidRow(id)]
    });

    console.log("[INFRACTION] Infraction panel sent successfully: " + message.url);

    try {
        const thread = await message.startThread({
            name: `Proofs - ${id}`,
            autoArchiveDuration: 1440,
            reason: "Infraction proof discussion"
        });
        await thread.send({
            content: `${user}\n\nThis is the official thread for discussing the infraction and providing proofs.\n\n**Infraction ID:**\n\`${id}\`\n\n**Issued by:**\n<@${issuer.id}>`
        });
    } catch (error) {
        console.error("Infraction proof thread error:", error);
    }

    await user.send({ embeds: [embed] }).catch(() => {
        console.log(`Could not DM ${user.tag}. Their DMs may be closed.`);
    });

    await logToWebsite({
        type: "infraction",
        id,
        discordUser: user,
        payload: {
            infractionId: id,
            userId: user.id,
            username: user.username,
            userDisplay: user.tag,
            punishment,
            reason,
            notes,
            appealable,
            appealStatus: appealable,
            issuerId: issuer.id,
            issuedBy: issuer.tag,
            issuedByDisplay: issuer.tag,
            discordGuildId: guild.id,
            discordChannelId: channel.id,
            discordMessageId: message.id,
            messageUrl: message.url,
            source: "discord-management-bot",
            automaticAction: automaticAction?.type || null,
            roleBeforeSuspension: roleBeforeSuspension?.id || null,
            removedRoles: automaticResult?.roleResult?.removed || [],
            failedRoleRemovals: automaticResult?.roleResult?.failed || []
        }
    });

    return { success: true, id, message };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("infraction")
        .setDescription("Manage staff infractions")
        .addSubcommand(subcommand => subcommand
            .setName("issue")
            .setDescription("Issue a staff infraction")
            .addUserOption(option => option
                .setName("user")
                .setDescription("User receiving the infraction")
                .setRequired(true))
            .addStringOption(option => option
                .setName("punishment")
                .setDescription("Punishment given")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for infraction")
                .setRequired(true))
            .addStringOption(option => option
                .setName("notes")
                .setDescription("Additional notes")
                .setRequired(true))
            .addStringOption(option => option
                .setName("appealable")
                .setDescription("Appeal Status")
                .setRequired(true)
                .addChoices(
                    { name: "Appealable", value: "Appealable" },
                    { name: "Unappealable", value: "Unappealable" }
                ))
        )
        .addSubcommand(subcommand => subcommand
            .setName("view")
            .setDescription("View all infractions for a staff member")
            .addUserOption(option => option
                .setName("user")
                .setDescription("User whose infractions you want to view")
                .setRequired(true)
            )
        ),

    issueStaffInfraction,

    async execute(interaction) {
        if (!hasInfractionPermission(interaction)) {
            return interaction.reply({
                content: "You do not have permission to manage staff infractions.",
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "view") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const user = interaction.options.getUser("user");
            const channel = getInfractionChannel(interaction.guild);
            if (!channel) return interaction.editReply({ content: "Infraction log channel not found." });

            try {
                const messages = await getAllMessages(channel);
                const infractions = messages
                    .filter(message => message.embeds?.length && isInfractionEmbed(message.embeds[0]))
                    .filter(message => messageBelongsToUser(message, user.id))
                    .map(message => ({ message }))
                    .sort((a, b) => b.message.createdTimestamp - a.message.createdTimestamp);

                if (!infractions.length) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`Infractions — ${user.tag}`)
                                .setColor("#43E04E")
                                .setDescription(`${user} has no recorded infractions.`)
                                .setTimestamp()
                        ]
                    });
                }

                const embeds = [];
                for (let i = 0; i < infractions.length; i += 20) {
                    const embed = createInfractionViewEmbed(user, infractions.slice(i, i + 20));
                    if (Math.ceil(infractions.length / 20) > 1) {
                        embed.setFooter({ text: `Page ${Math.floor(i / 20) + 1} of ${Math.ceil(infractions.length / 20)}` });
                    }
                    embeds.push(embed);
                }

                return interaction.editReply({ embeds: embeds.slice(0, 10) });
            } catch (error) {
                console.error("Infraction view error:", error);
                return interaction.editReply({ content: "I could not retrieve the user's infractions." });
            }
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const user = interaction.options.getUser("user");
        const punishment = interaction.options.getString("punishment");
        const reason = interaction.options.getString("reason");
        const notes = interaction.options.getString("notes");
        const appealable = interaction.options.getString("appealable");

        try {
            const result = await issueStaffInfraction({
                guild: interaction.guild,
                user,
                issuerId: interaction.user.id,
                punishment,
                reason,
                notes,
                appealable
            });

            if (!result.success) return interaction.editReply({ content: result.error });
            return interaction.editReply({ content: `Infraction has been issued.\n\n**Infraction ID:** \`${result.id}\`` });
        } catch (error) {
            console.error("Infraction issue error:", error);
            return interaction.editReply({ content: "I could not issue the infraction." });
        }
    }
};
