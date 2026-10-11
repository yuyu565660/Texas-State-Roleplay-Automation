const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const VOID_PERMISSION_ROLES = new Set([
    "1526415142408163430",
    "1403586703612186672",
    "1403586703716777984",
    "1403586703716777985",
    "1403586703716777988"
]);

function hasVoidPermission(interaction) {
    return interaction.member?.roles?.cache?.some(role =>
        VOID_PERMISSION_ROLES.has(role.id)
    );
}

function confirmationRow(type, payload) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm_void_${type}_${payload}`)
            .setLabel("Confirm Void")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`cancel_void_${type}_${payload}`)
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
    );
}

function disabledRow(label) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("void_completed")
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}

function buildVoidedEmbed(oldEmbed, title, user) {
    const data = oldEmbed.toJSON();
    data.title = title;
    data.color = 0xE04B4B;

    const original = data.description || "";
    data.description = `${original}\n\n━━━━━━━━━━━━━━━━━━\n\n**VOIDED BY:**\n${user}`;

    // Preserve the original image/thumbnail fields. Do not rebuild the embed
    // from scratch and do not replace attachments, which keeps bottomembed.png.
    return new EmbedBuilder(data);
}

async function fetchOriginalMessage(interaction, channelId, messageId) {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.messages?.fetch) return null;
    return channel.messages.fetch(messageId).catch(() => null);
}

async function voidPromotion(interaction, targetId, roleId, highRank, channelId, messageId) {
    const message = await fetchOriginalMessage(interaction, channelId, messageId);

    if (!message) {
        return interaction.update({
            content: "The original promotion log could not be found.",
            components: []
        });
    }

    const oldEmbed = message.embeds?.[0];
    if (!oldEmbed) {
        return interaction.update({
            content: "The promotion embed could not be found.",
            components: []
        });
    }

    if (oldEmbed.title?.includes("VOIDED")) {
        return interaction.update({
            content: "This promotion has already been voided.",
            components: []
        });
    }

    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) {
        return interaction.update({
            content: "The promoted user is no longer in the server.",
            components: []
        });
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (role && member.roles.cache.has(roleId)) {
        const bot = interaction.guild.members.me;

        if (!bot || role.position >= bot.roles.highest.position) {
            return interaction.update({
                content: "I cannot remove the promotion role because of the bot's role hierarchy.",
                components: []
            });
        }

        try {
            await member.roles.remove(
                role,
                `Promotion voided by ${interaction.user.tag}`
            );
        } catch (error) {
            console.error("Failed to remove promotion role:", error);
            return interaction.update({
                content: "I could not remove the promotion role. Check the bot's role hierarchy.",
                components: []
            });
        }
    }

    const title = highRank
        ? "High Rank Staff Promotion - VOIDED"
        : "Staff Promotion - VOIDED";

    const embed = buildVoidedEmbed(oldEmbed, title, interaction.user);

    await message.edit({
        embeds: [embed],
        components: [disabledRow("Promotion Voided")]
    });

    return interaction.update({
        content: "Promotion successfully voided.",
        components: []
    });
}

async function voidInfraction(interaction, infractionId, channelId, messageId) {
    const message = await fetchOriginalMessage(interaction, channelId, messageId);

    if (!message) {
        return interaction.update({
            content: "The original infraction log could not be found.",
            components: []
        });
    }

    const oldEmbed = message.embeds?.[0];
    if (!oldEmbed) {
        return interaction.update({
            content: "The infraction embed could not be found.",
            components: []
        });
    }

    if (oldEmbed.title === "Staff Infraction - VOIDED") {
        return interaction.update({
            content: "This infraction has already been voided.",
            components: []
        });
    }

    const currentId = oldEmbed.description?.match(
        /\*\*Infraction ID:\*\*\s*`([^`]+)`/
    )?.[1];

    if (currentId && currentId !== infractionId) {
        return interaction.update({
            content: "The infraction ID does not match the original log.",
            components: []
        });
    }

    const embed = buildVoidedEmbed(
        oldEmbed,
        "Staff Infraction - VOIDED",
        interaction.user
    );

    // Only edit the embed/components. Attachments are untouched, so the
    // attachment://bottomembed.png image remains inside the embed.
    await message.edit({
        embeds: [embed],
        components: [disabledRow("Infraction Voided")]
    });

    return interaction.update({
        content: "Infraction successfully voided.",
        components: []
    });
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const id = interaction.customId;
        const relevant =
            id.startsWith("void_promotion_") ||
            id.startsWith("void_infraction_") ||
            id.startsWith("confirm_void_") ||
            id.startsWith("cancel_void_");

        if (!relevant) return;

        if (!hasVoidPermission(interaction)) {
            return interaction.reply({
                content: "You do not have permission to void promotions or infractions.",
                flags: MessageFlags.Ephemeral
            });
        }

        // First click: ask for confirmation. The original channel/message IDs
        // are stored in the ephemeral confirmation button so the original log
        // can be edited after the user confirms.
        if (id.startsWith("void_promotion_")) {
            const parts = id.split("_");
            const highRank = parts[2] === "high";
            const targetId = highRank ? parts[3] : parts[2];
            const roleId = highRank ? parts[4] : parts[3];
            const payload = `${targetId}_${roleId}_${interaction.channelId}_${interaction.message.id}`;

            return interaction.reply({
                content: `Are you sure you want to void this ${highRank ? "high-rank " : ""}promotion? This will remove the promoted role from the user.`,
                components: [confirmationRow(
                    highRank ? "promotion_high" : "promotion",
                    payload
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        if (id.startsWith("void_infraction_")) {
            const infractionId = id.slice("void_infraction_".length);
            const payload = `${infractionId}_${interaction.channelId}_${interaction.message.id}`;

            return interaction.reply({
                content: `Are you sure you want to void infraction **${infractionId}**? This will mark the original infraction as VOIDED.`,
                components: [confirmationRow("infraction", payload)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (id.startsWith("cancel_void_")) {
            return interaction.update({
                content: "Void cancelled.",
                components: []
            });
        }

        if (id.startsWith("confirm_void_promotion_high_")) {
            const parts = id.slice("confirm_void_promotion_high_".length).split("_");
            return voidPromotion(
                interaction,
                parts[0],
                parts[1],
                true,
                parts[2],
                parts[3]
            );
        }

        if (id.startsWith("confirm_void_promotion_")) {
            const parts = id.slice("confirm_void_promotion_".length).split("_");
            return voidPromotion(
                interaction,
                parts[0],
                parts[1],
                false,
                parts[2],
                parts[3]
            );
        }

        if (id.startsWith("confirm_void_infraction_")) {
            const parts = id.slice("confirm_void_infraction_".length).split("_");
            return voidInfraction(
                interaction,
                parts[0],
                parts[1],
                parts[2]
            );
        }
    }
};
