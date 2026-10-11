const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    createTicket,
    createTranscript
} = require("../systems/ticketSystem");

const applicationButtons = require("./applicationButtons");
const { withTrustedBypass } = require("../utils/trustedOperator");
const regulations = require("./regulations");
const applicationReview = require("./applicationReview");
const suggestions = require("./suggestions");
const banAppeal = require("./banAppeal");
const mediaApplication = require("./mediaApplication");

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const config = require("../config.json");
const { getAutomaticInfraction, removeAutomaticInfraction } = require("../utils/automaticInfractionStore");
const { closeTicket, canCloseTicket, isTicketChannel } = require("../systems/ticketCloser");

const verifyDB = path.join(
    __dirname,
    "../database/verification.json"
);

const VERIFIED_ROLE = "1403586702546571397";
const UNVERIFIED_ROLE = "1403586702546571398";

const MELONLY_API_KEY =
    config.melonlyApiKey ||
    config.melonly?.apiKey ||
    null;

const MELONLY_BASE_URL =
    "https://api.melonly.xyz";

async function getMelonlyRoblox(discordId) {
    if (!MELONLY_API_KEY) {
        console.log("Melonly API key is missing from config.json");
        return null;
    }

    try {
        const response = await axios.get(
            `${MELONLY_BASE_URL}/api/v1/verification/discord/${discordId}/roblox`,
            {
                headers: {
                    Authorization: `Bearer ${MELONLY_API_KEY}`,
                    Accept: "application/json"
                },
                timeout: 10000
            }
        );

        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;

        console.log(
            "Melonly Discord -> Roblox Error:",
            error.response?.data || error.message
        );

        return null;
    }
}

async function getMelonlyDiscord(robloxId) {
    if (!MELONLY_API_KEY) {
        console.log("Melonly API key is missing from config.json");
        return null;
    }

    try {
        const response = await axios.get(
            `${MELONLY_BASE_URL}/api/v1/verification/roblox/${robloxId}/discord`,
            {
                headers: {
                    Authorization: `Bearer ${MELONLY_API_KEY}`,
                    Accept: "application/json"
                },
                timeout: 10000
            }
        );

        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;

        console.log(
            "Melonly Roblox -> Discord Error:",
            error.response?.data || error.message
        );

        return null;
    }
}

function loadVerificationData() {
    try {
        if (!fs.existsSync(verifyDB)) {
            fs.mkdirSync(path.dirname(verifyDB), { recursive: true });
            fs.writeFileSync(verifyDB, "{}");
            return {};
        }

        const raw = fs.readFileSync(verifyDB, "utf8");
        if (!raw.trim()) return {};

        return JSON.parse(raw);
    } catch (error) {
        console.log("Verification database error:", error);
        return {};
    }
}

function saveVerificationData(data) {
    try {
        fs.mkdirSync(path.dirname(verifyDB), { recursive: true });
        fs.writeFileSync(verifyDB, JSON.stringify(data, null, 4));
    } catch (error) {
        console.log("Verification database save error:", error);
    }
}

async function verifyMelonlyUser(interaction) {
    const melonly = await getMelonlyRoblox(interaction.user.id);
    if (!melonly) return null;

    const robloxName =
        melonly.name ||
        melonly.preferredUsername ||
        melonly.nickname ||
        "Unknown";

    const robloxId =
        melonly.robloxId ||
        melonly.userId ||
        melonly.id;

    if (!robloxId) return null;

    const member = interaction.member;

    await member.roles.add(VERIFIED_ROLE).catch(error => {
        console.log("Failed to add verified role:", error);
    });

    await member.roles.remove(UNVERIFIED_ROLE).catch(error => {
        console.log("Failed to remove unverified role:", error);
    });

    await member.setNickname(robloxName).catch(() => {});

    const data = loadVerificationData();

    data[interaction.user.id] = {
        username: robloxName,
        verified: true,
        robloxId: String(robloxId),
        melonly: true,
        lastUpdated: Date.now()
    };

    saveVerificationData(data);

    return {
        name: robloxName,
        robloxId: String(robloxId)
    };
}

async function safeErrorReply(interaction, message) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: message, flags: 64 }).catch(() => {});
        } else {
            await interaction.reply({ content: message, flags: 64 }).catch(() => {});
        }
    } catch {
        // Interaction already handled
    }
}

const PROMOTION_RANKS = [
    "1403586703243083916",
    "1522708224300683274",
    "1522708285466349618",
    "1403586703612186665",
    "1522880646714757211",
    "1403586703243083920",
    "1403586703243083921",
    "1522880704793284759",
    "1522880716197859388",
    "1524812476074561771",
    "1526411315432652981",
    "1403586703381237971",
    "1526411531040985128",
    "1526411586850263070",
    "1403586703515582475",
    "1526411632136159373",
    "1522707386916409354",
    "1403586703515582478",
    "1403586703515582479",
    "1403586703515582480",
    "1403586703515582481",
    "1534335606337831093",
    "1403586703612186672",
    "1403586703716777984",
    "1403586703716777985",
    "1403586703716777991"
];

function canVoidPromotion(member) {
    const recognized = member.roles.cache.some(role => PROMOTION_RANKS.includes(role.id));
    if (!recognized) return false;

    const highRankRoles = [
        config.roles?.highRankStaff,
        config.roles?.management,
        config.roles?.boardOfDirectors,
        "1403586703612186670"
    ].filter(Boolean);

    if (member.roles.cache.some(role => highRankRoles.includes(role.id))) return true;

    const leadInternalAffairs = PROMOTION_RANKS.indexOf("1526411586850263070");
    let highestRank = -1;

    for (let i = 0; i < PROMOTION_RANKS.length; i++) {
        if (member.roles.cache.has(PROMOTION_RANKS[i])) {
            highestRank = Math.max(highestRank, i);
        }
    }

    return highestRank >= leadInternalAffairs;
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            // Ticket closing is handled here only, avoiding a second event handler
            // racing to acknowledge the same button or modal.
            if (interaction.isButton() && interaction.customId === "close_ticket") {
                if (!isTicketChannel(interaction.channel)) {
                    return interaction.reply({ content: "This button can only be used inside a ticket channel.", flags: 64 });
                }
                if (!canCloseTicket(interaction)) {
                    return interaction.reply({ content: "You do not have permission to close this ticket.", flags: 64 });
                }
                const modal = new ModalBuilder().setCustomId("close_reason").setTitle("Close Ticket");
                const reason = new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("Reason for closing")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Enter the reason this ticket is being closed.")
                    .setRequired(true)
                    .setMaxLength(1000);
                modal.addComponents(new ActionRowBuilder().addComponents(reason));
                return interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === "close_reason") {
                if (!isTicketChannel(interaction.channel)) {
                    return interaction.reply({ content: "This ticket no longer exists or is no longer a ticket channel.", flags: 64 });
                }
                if (!canCloseTicket(interaction)) {
                    return interaction.reply({ content: "You do not have permission to close this ticket.", flags: 64 });
                }
                const reason = interaction.fields.getTextInputValue("reason").trim();
                await interaction.reply({ content: "Ticket closing...", flags: 64 });
                const result = await closeTicket(interaction, reason || "No reason provided.");
                if (!result.ok && interaction.channel) {
                    await interaction.followUp({ content: result.message, flags: 64 }).catch(() => {});
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);

                if (!command) {
                    return safeErrorReply(interaction, "That command isn't loaded.");
                }

                try {
                    await withTrustedBypass(interaction, () => command.execute(interaction, client));

                    if (typeof client.logCommandUsage === "function") {
                        const args = (interaction.options?.data || []).map(option => {
                            let value = option.value;
                            if (value && typeof value === "object" && value.id) value = value.id;
                            return `${option.name}=${String(value ?? "").slice(0, 200)}`;
                        });

                        await client.logCommandUsage({
                            client,
                            user: interaction.user,
                            guild: interaction.guild,
                            commandName: interaction.commandName,
                            type: "slash",
                            args,
                            success: true
                        });
                    }
                } catch (error) {
                    console.error(`Command Error [${interaction.commandName}]:`, error);
                    await safeErrorReply(interaction, "There was an error executing the command.");
                }

                return;
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "ticket_category") {
                    const category = interaction.values[0];

                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_reason_${category}`)
                        .setTitle("Ticket Reason");

                    const reason = new TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Why are you making this ticket?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1000);

                    modal.addComponents(new ActionRowBuilder().addComponents(reason));
                    return interaction.showModal(modal);
                }

                return;
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId === "mrpoll_suggestion_submit") {
                    return require("./mrPollSuggestion").execute(interaction, client);
                }

                console.log("Modal Submitted:", interaction.customId);

                if (interaction.customId.startsWith("partnership_message_")) {
                    const parts = interaction.customId.split("_");
                    const creatorId = parts[2];
                    const rep1Id = parts[3];
                    const rep2Id = parts[4];
                    const partnershipChannel = "1403586706543874152";

                    if (interaction.user.id !== creatorId) {
                        return interaction.reply({
                            content: "Only the person who started this partnership request can submit the message.",
                            flags: 64
                        });
                    }

                    const message = interaction.fields.getTextInputValue("partnership_text").trim();

                    if (!message) {
                        return interaction.reply({
                            content: "Please enter a partnership message.",
                            flags: 64
                        });
                    }

                    const channel = await interaction.guild.channels.fetch(partnershipChannel).catch(() => null);

                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({
                            content: "The partnership channel could not be found.",
                            flags: 64
                        });
                    }

                    await channel.send({
                        content: `${message}\n\n${interaction.guild.members.cache.get(rep1Id) || `<@${rep1Id}>`} ${interaction.guild.members.cache.get(rep2Id) || `<@${rep2Id}>`}`,
                        allowedMentions: {
                            users: [rep1Id, rep2Id]
                        }
                    });

                    return interaction.reply({
                        content: "Partnership message sent successfully.",
                        flags: 64
                    });
                }

                if (interaction.customId.startsWith("void_promotion_reason_")) {
                    const parts = interaction.customId.split("_");
                    const targetUserId = parts[3];
                    const roleId = parts[4];

                    if (!canVoidPromotion(interaction.member)) {
                        return interaction.reply({
                            content: "You do not have permission to void this promotion.",
                            flags: 64
                        });
                    }

                    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                    if (!targetMember) {
                        return interaction.reply({
                            content: "The promoted user could not be found.",
                            flags: 64
                        });
                    }

                    const voidReason = interaction.fields.getTextInputValue("void_reason");
                    const promotionRole = interaction.guild.roles.cache.get(roleId);

                    if (!promotionRole) {
                        return interaction.reply({
                            content: "The promotion role could not be found.",
                            flags: 64
                        });
                    }

                    try {
                        if (targetMember.roles.cache.has(roleId)) {
                            await targetMember.roles.remove(roleId);
                        }
                    } catch (error) {
                        console.error("Void promotion role removal error:", error);
                        return interaction.reply({
                            content: "I could not remove the promotion role. Check Manage Roles and role hierarchy.",
                            flags: 64
                        });
                    }

                    const originalMessage = interaction.message;
                    const oldEmbed = originalMessage?.embeds?.[0];

                    if (oldEmbed) {
                        const oldDescription = oldEmbed.description || "";
                        const voidedEmbed = EmbedBuilder.from(oldEmbed)
                            .setTitle(oldEmbed.title || "Staff Promotion")
                            .setColor("#43E04E")
                            .setDescription(`${oldDescription}\n\nVoided By: ${interaction.user} • <t:${Math.floor(Date.now() / 1000)}:F>\n\nVoid Reason:\n\n${voidReason}`)
                            .setTimestamp();

                        await originalMessage.edit({
                            embeds: [voidedEmbed],
                            components: []
                        }).catch(error => {
                            console.error("Promotion message update error:", error);
                        });
                    }

                    await targetMember.user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Staff Promotion Voided")
                                .setColor("#43E04E")
                                .setDescription(`Your recent staff promotion has been voided.\n\nVoided By: ${interaction.user} • <t:${Math.floor(Date.now() / 1000)}:F>\n\nReason:\n\n${voidReason}\n\nRole Removed:\n\n${promotionRole.name}`)
                                .setTimestamp()
                        ]
                    }).catch(() => {});

                    return interaction.reply({
                        content: `Promotion for ${targetMember} has been voided and the role has been removed.`,
                        flags: 64
                    });
                }

                if (interaction.customId === "marketplace_ticket_reason") {
                    const reason = interaction.fields.getTextInputValue("marketplace_reason");
                    await createTicket(interaction, "marketplace", reason);
                    return;
                }

                if (interaction.customId.startsWith("ticket_reason_")) {
                    const category = interaction.customId.replace("ticket_reason_", "");
                    const reason = interaction.fields.getTextInputValue("reason");
                    await createTicket(interaction, category, reason);
                    return;
                }

                if (
                    interaction.customId === "ban_appeal_modal" ||
                    interaction.customId.startsWith("accept_ban_reason_") ||
                    interaction.customId.startsWith("deny_ban_reason_")
                ) {
                    return await banAppeal.execute(interaction);
                }

                await applicationReview.execute(interaction);
                return;
            }

            if (interaction.isButton()) {
                if (interaction.customId?.startsWith("mrpoll_vote_")) {
                    return require("./mrPoll").execute(interaction, client);
                }
                if (interaction.customId === "mrpoll_suggestion_open") {
                    return require("./mrPollSuggestion").execute(interaction, client);
                }

                // Mr Poll-style poll voting is routed here so the main interaction
                // dispatcher does not swallow these buttons before their handler runs.
                if (interaction.customId?.startsWith("mrpoll_vote_")) {
                    return require("./mrPoll").execute(interaction, client);
                }

                const customId = interaction.customId;

                if (customId.startsWith("partnership_message_")) {
                    const parts = customId.split("_");
                    const creatorId = parts[2];
                    const rep1Id = parts[3];
                    const rep2Id = parts[4];

                    if (interaction.user.id !== creatorId) {
                        return interaction.reply({
                            content: "Only the person who started this partnership request can use this button.",
                            flags: 64
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`partnership_message_${creatorId}_${rep1Id}_${rep2Id}`)
                        .setTitle("Partnership Message");

                    const message = new TextInputBuilder()
                        .setCustomId("partnership_text")
                        .setLabel("Partnership Message")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Paste the full partnership message here...")
                        .setRequired(true)
                        .setMaxLength(4000);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(message)
                    );

                    return interaction.showModal(modal);
                }

                if (customId === "marketplace_ticket") {
                    const modal = new ModalBuilder()
                        .setCustomId("marketplace_ticket_reason")
                        .setTitle("Server Marketplace Ticket");

                    const reason = new TextInputBuilder()
                        .setCustomId("marketplace_reason")
                        .setLabel("Why are you making this ticket?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Explain what you need help with or what you want to purchase.")
                        .setRequired(true)
                        .setMaxLength(1000);

                    modal.addComponents(new ActionRowBuilder().addComponents(reason));
                    return interaction.showModal(modal);
                }

                if (customId.startsWith("void_promotion_")) {
                    console.log("=================================");
                    console.log("PROMOTION VOID BUTTON CLICKED");
                    console.log("Custom ID:", customId);
                    console.log("Clicking User:", interaction.user.id);
                    console.log("Clicking User Roles:", interaction.member.roles.cache.map(role => role.id).join(", "));
                    console.log("=================================");

                    const parts = customId.split("_");
                    const type = parts[2];
                    const targetUserId = parts[3];
                    const roleId = parts[4];

                    if (!canVoidPromotion(interaction.member)) {
                        return interaction.reply({
                            content: "You do not have permission to void this promotion.",
                            flags: 64
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`void_promotion_reason_${targetUserId}_${roleId}`)
                        .setTitle("Void Promotion");

                    const reason = new TextInputBuilder()
                        .setCustomId("void_reason")
                        .setLabel("Why are you voiding this promotion?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1000);

                    modal.addComponents(new ActionRowBuilder().addComponents(reason));
                    return interaction.showModal(modal);
                }

                if (customId.startsWith("accept_training_")) {
                    const userId = customId.replace("accept_training_", "");

                    await interaction.channel.send({
                        content: `<@${userId}>, you have been chosen to be trained by ${interaction.user}.\n\nPlease join the Sheriff team with your call sign TM-XXX, put on the Trial Moderator uniform, and meet them in the briefing room.`
                    });

                    return interaction.update({ components: [] });
                }

                if (customId.startsWith("deny_training_")) {
                    const allowedRole = "1403586703612186672";

                    if (!interaction.member.roles.cache.has(allowedRole)) {
                        return interaction.reply({
                            content: "You do not have permission to deny training requests.",
                            flags: 64
                        });
                    }

                    const userId = customId.replace("deny_training_", "");

                    await interaction.channel.send({
                        content: `<@${userId}>, unfortunately your training request has been denied by ${interaction.user}.`
                    });

                    return interaction.update({ components: [] });
                }

                if (customId.startsWith("void_infraction_")) {
                    console.log("=================================");
                    console.log("VOID INFRACTION BUTTON CLICKED");
                    console.log("Custom ID:", customId);
                    console.log("User:", interaction.user.tag);
                    console.log("User ID:", interaction.user.id);
                    console.log("User Roles:", interaction.member.roles.cache.map(role => role.id).join(", "));
                    console.log("REQUIRED ROLE:", "1403586703381237969");
                    console.log("HAS REQUIRED ROLE:", interaction.member.roles.cache.has("1403586703381237969"));
                    console.log("=================================");

                    const allowedRole = "1403586703381237969";

                    if (!interaction.member.roles.cache.has(allowedRole)) {
                        return interaction.reply({
                            content: "You do not have permission to void infractions.",
                            flags: 64
                        });
                    }

                    const oldEmbed = interaction.message.embeds?.[0];
                    if (!oldEmbed) {
                        return interaction.reply({
                            content: "Infraction embed could not be found.",
                            flags: 64
                        });
                    }

                    const infractionId = customId.replace("void_infraction_", "");

                    // Prevent repeated/mass clicks while the first void is processing.
                    if (!client._voidingInfractions) client._voidingInfractions = new Set();
                    if (client._voidingInfractions.has(infractionId)) {
                        return interaction.reply({
                            content: "This infraction is already being voided.",
                            flags: 64
                        });
                    }
                    client._voidingInfractions.add(infractionId);

                    try {
                        // Acknowledge immediately and disable the button so it cannot be spam-clicked.
                        await interaction.update({
                            components: [
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("void_infraction_disabled_" + infractionId)
                                        .setLabel("Voiding...")
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                )
                            ]
                        });

                        const automaticData = getAutomaticInfraction(infractionId);

                        if (automaticData) {
                            const targetMember = await interaction.guild.members.fetch(automaticData.userId).catch(() => null);

                            if (targetMember) {
                                if (!client._restoringInfractionUsers) client._restoringInfractionUsers = new Set();
                                client._restoringInfractionUsers.add(targetMember.id);

                                try {
                                    if (automaticData.suspensionRoleId && targetMember.roles.cache.has(automaticData.suspensionRoleId)) {
                                        await targetMember.roles.remove(
                                            automaticData.suspensionRoleId,
                                            "Automatic infraction voided."
                                        );
                                    }

                                    for (const roleId of automaticData.removedRoleIds || []) {
                                        if (targetMember.roles.cache.has(roleId)) continue;
                                        if (!interaction.guild.roles.cache.has(roleId)) continue;

                                        await targetMember.roles.add(
                                            roleId,
                                            "Automatic infraction voided - restoring previous role."
                                        ).catch(error => {
                                            console.error(
                                                "[AUTOMATIC INFRACTION] Failed to restore role " + roleId + ":",
                                                error
                                            );
                                        });
                                    }
                                } finally {
                                    setTimeout(() => client._restoringInfractionUsers.delete(targetMember.id), 5000);
                                }
                            }

                            removeAutomaticInfraction(infractionId);
                        }

                        const oldDescription = oldEmbed.description || "";
                        const updatedEmbed = EmbedBuilder.from(oldEmbed)
                            .setTitle("Staff Infraction - VOIDED")
                            .setDescription(
                                oldDescription +
                                "\n\nVoided by: " +
                                interaction.user +
                                " • <t:" +
                                Math.floor(Date.now() / 1000) +
                                ":F>"
                            )
                            .setColor("#43E04E");

                        await interaction.message.edit({
                            embeds: [updatedEmbed],
                            components: []
                        });

                        await interaction.followUp({
                            content: automaticData
                                ? "The automatic infraction has been voided and the member's previous roles have been restored."
                                : "The infraction has been voided successfully.",
                            flags: 64
                        });
                    } catch (error) {
                        console.error("[INFRACTION VOID] Error:", error);
                        await interaction.message.edit({
                            components: [
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("void_infraction_retry_" + infractionId)
                                        .setLabel("Void Infraction")
                                        .setStyle(ButtonStyle.Danger)
                                )
                            ]
                        }).catch(() => {});
                        await interaction.followUp({
                            content: "The infraction could not be voided. You can try again.",
                            flags: 64
                        }).catch(() => {});
                    } finally {
                        client._voidingInfractions.delete(infractionId);
                    }

                    return;
                }

                if (customId === "claim_ticket") {
                    interaction.channel.claimedBy = interaction.user.id;
                    const components = interaction.message.components;

                    if (!components?.[0]) {
                        return interaction.reply({
                            content: "Ticket buttons could not be found.",
                            flags: 64
                        });
                    }

                    const row = ActionRowBuilder.from(components[0]);

                    if (row.components[0]) {
                        row.components[0] = ButtonBuilder.from(row.components[0])
                            .setLabel(`Claimed by ${interaction.user.username}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true);
                    }

                    if (row.components[1]) {
                        row.components[1] = ButtonBuilder.from(row.components[1]).setDisabled(false);
                    }

                    await interaction.update({ components: [row] });
                    await interaction.channel.send({ content: `This ticket is now claimed by ${interaction.user}.` });
                    return;
                }

                if (customId === "unclaim_ticket") {
                    if (interaction.channel.claimedBy !== interaction.user.id) {
                        return interaction.reply({
                            content: "You can only unclaim a ticket that you claimed.",
                            flags: 64
                        });
                    }

                    interaction.channel.claimedBy = null;
                    const components = interaction.message.components;

                    if (!components?.[0]) {
                        return interaction.reply({
                            content: "Ticket buttons could not be found.",
                            flags: 64
                        });
                    }

                    const row = ActionRowBuilder.from(components[0]);

                    if (row.components[0]) {
                        row.components[0] = ButtonBuilder.from(row.components[0])
                            .setLabel("Claim Ticket")
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(false);
                    }

                    if (row.components[1]) {
                        row.components[1] = ButtonBuilder.from(row.components[1])
                            .setLabel("Unclaim Ticket")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true);
                    }

                    await interaction.update({ components: [row] });
                    await interaction.channel.send({
                        content: `This ticket has been unclaimed by ${interaction.user} and is now available for anyone to claim.`
                    });
                    return;
                }

                if (
                    customId === "start_ban_appeal" ||
                    customId.startsWith("accept_ban_") ||
                    customId.startsWith("deny_ban_")
                ) {
                    await banAppeal.execute(interaction);
                    return;
                }

                if (customId === "start_verify") {
                    await interaction.deferReply({ flags: 64 });
                    const verified = await verifyMelonlyUser(interaction);

                    if (!verified) {
                        return interaction.editReply({
                            content: "Your Discord account is not connected to a Roblox account through Melonly.\n\nPlease connect your Roblox and Discord accounts through Melonly first, then click Verify again."
                        });
                    }

                    return interaction.editReply({
                        content: `Verification successful.\n\nRoblox Account: ${verified.name}\n\nRoblox ID: ${verified.robloxId}\n\nYour verified role has been added.`
                    });
                }

                try {
                    await applicationButtons.execute(interaction);
                    if (interaction.replied || interaction.deferred) return;
                } catch (error) {
                    console.error("Application Buttons Error:", error);
                    if (interaction.replied || interaction.deferred) return;
                }

                try {
                    await regulations.execute(interaction);
                    if (interaction.replied || interaction.deferred) return;
                } catch (error) {
                    console.error("Regulations Button Error:", error);
                    if (interaction.replied || interaction.deferred) return;
                }

                try {
                    await applicationReview.execute(interaction);
                    if (interaction.replied || interaction.deferred) return;
                } catch (error) {
                    console.error("Application Review Button Error:", error);
                    if (interaction.replied || interaction.deferred) return;
                }

                try {
                    const handled = await mediaApplication.execute(interaction);
                    if (handled || interaction.replied || interaction.deferred) return;
                } catch (error) {
                    console.error("Media Application Button Error:", error);
                    if (interaction.replied || interaction.deferred) return;
                }

                try {
                    await suggestions.execute(interaction);
                    if (interaction.replied || interaction.deferred) return;
                } catch (error) {
                    console.error("Suggestions Button Error:", error);
                }

                return;
            }
        } catch (error) {
            console.error("Interaction Error:", error);
            await safeErrorReply(
                interaction,
                "Something went wrong while handling that interaction."
            );
        }
    }
};

module.exports.getMelonlyRoblox = getMelonlyRoblox;
module.exports.getMelonlyDiscord = getMelonlyDiscord;
