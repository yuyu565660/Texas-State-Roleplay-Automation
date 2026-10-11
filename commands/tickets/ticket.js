const {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const { createTranscript, ticketConfig } = require("../../systems/ticketSystem");

const PURGE_ALLOWED_ROLE_ID = "1403586703612186670";
const MOVE_ALLOWED_ROLE_ID = "1403586703381237969";

function isTicketChannel(channel) {
    return Boolean(
        channel &&
        channel.type === 0 &&
        channel.name?.toLowerCase().startsWith("ticket-")
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Ticket management commands")
        .addSubcommand(subcommand => subcommand
            .setName("close")
            .setDescription("Save the ticket transcript and close this ticket"))
        .addSubcommand(subcommand => subcommand
            .setName("purge")
            .setDescription("Close and save transcripts for every ticket in a category")
            .addStringOption(option => option
                .setName("category")
                .setDescription("Ticket category to purge")
                .setRequired(true)
                .addChoices(
                    ...Object.entries(ticketConfig.categories).map(([value, data]) => ({
                        name: data.name,
                        value
                    }))
                )))
        .addSubcommand(subcommand => subcommand
            .setName("move")
            .setDescription("Move this ticket to another category")
            .addStringOption(option => option
                .setName("category")
                .setDescription("New ticket category")
                .setRequired(true)
                .addChoices(
                    ...Object.entries(ticketConfig.categories).map(([value, data]) => ({
                        name: data.name,
                        value
                    }))
                ))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Reason for moving the ticket")
                .setRequired(true)
                .setMaxLength(1000))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "close") {
            if (!interaction.guild || !isTicketChannel(interaction.channel)) {
                return interaction.reply({
                    content: "This command can only be used inside a ticket channel.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                await createTranscript(
                    interaction.channel,
                    interaction.user.tag,
                    "Ticket closed",
                    interaction.user
                );

                await interaction.channel.delete(
                    `Ticket closed by ${interaction.user.tag}`
                );
            } catch (error) {
                console.error("Ticket close error:", error);

                return interaction.editReply(
                    "I could not save the transcript or close this ticket. Check the bot permissions and transcript channel."
                );
            }

            return interaction.editReply("Ticket transcript saved and ticket closed.");
        }

        if (subcommand === "move") {
            if (!interaction.member?.roles?.cache?.has(MOVE_ALLOWED_ROLE_ID)) {
                return interaction.reply({
                    content: "You do not have permission to use this command.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!interaction.guild || !isTicketChannel(interaction.channel)) {
                return interaction.reply({
                    content: "This command can only be used inside a ticket channel.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const categoryKey = interaction.options.getString("category", true);
            const reason = interaction.options.getString("reason", true).trim();
            const newCategory = ticketConfig.categories[categoryKey];

            if (!newCategory) {
                return interaction.reply({
                    content: "That ticket category is invalid.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const newParent = interaction.guild.channels.cache.get(newCategory.category);

            if (!newParent || newParent.type !== 4) {
                return interaction.reply({
                    content: "The selected ticket category could not be found.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.channel.parentId === newCategory.category) {
                return interaction.reply({
                    content: "This ticket is already in that category. Please select a different category.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const originalParentId = interaction.channel.parentId;
                const originalCategory = Object.values(ticketConfig.categories).find(
                    data => data.category === originalParentId
                );
                const originalCategoryName = originalCategory?.name || "Unknown";

                const claimedBy = interaction.channel.claimedBy || null;
                const claimedUser = claimedBy
                    ? await interaction.guild.members.fetch(claimedBy).catch(() => null)
                    : null;

                interaction.channel.claimedBy = null;

                for (const data of Object.values(ticketConfig.categories)) {
                    await interaction.channel.permissionOverwrites.edit(data.role, {
                        ViewChannel: false,
                        SendMessages: false,
                        ReadMessageHistory: false
                    });
                }

                await interaction.channel.permissionOverwrites.edit(newCategory.role, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.channel.setParent(newCategory.category, {
                    lockPermissions: false,
                    reason: `Ticket moved by ${interaction.user.tag}: ${reason}`
                });

                interaction.channel.ticketCategory = categoryKey;

                await interaction.channel.send({
                    content:
                        `<@&${newCategory.role}>\n` +
                        `Please handle this ticket as soon as possible.\n\n` +
                        `**Ticket Moved**\n\n` +
                        `This ticket has been moved to **${newCategory.name}**.\n\n` +
                        `**Originally In:** ${originalCategoryName}\n` +
                        `**Originally Claimed By:** ${claimedUser ? claimedUser.user : "No one"}\n` +
                        `**Moved By:** ${interaction.user}\n` +
                        `**Reason:** ${reason}`,
                    allowedMentions: {
                        roles: [newCategory.role]
                    }
                });

                await interaction.channel.send({
                    content: "This ticket is now unclaimed.",
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("claim_ticket")
                                .setLabel("Claim Ticket")
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId("unclaim_ticket")
                                .setLabel("Unclaim Ticket")
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId("close_ticket")
                                .setLabel("Close Ticket")
                                .setStyle(ButtonStyle.Danger)
                        )
                    ]
                });

                return interaction.editReply(
                    `Ticket moved to **${newCategory.name}** successfully.`
                );
            } catch (error) {
                console.error("Ticket move error:", error);

                return interaction.editReply(
                    "I could not move this ticket. Make sure the bot has Manage Channels and Manage Permissions, and that its role is above the ticket-team roles."
                );
            }
        }

        if (subcommand !== "purge") return;

        if (!interaction.member?.roles?.cache?.has(PURGE_ALLOWED_ROLE_ID)) {
            return interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.guild) {
            return interaction.reply({
                content: "This command can only be used inside a server.",
                flags: MessageFlags.Ephemeral
            });
        }

        const categoryKey = interaction.options.getString("category", true);
        const category = ticketConfig.categories[categoryKey];

        if (!category) {
            return interaction.reply({
                content: "That ticket category is invalid.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const tickets = interaction.guild.channels.cache.filter(channel =>
            isTicketChannel(channel) && channel.parentId === category.category
        );

        if (!tickets.size) {
            return interaction.editReply(
                `There are no open **${category.name}** tickets to purge.`
            );
        }

        let closed = 0;
        let transcriptFailed = 0;
        let deleteFailed = 0;

        for (const channel of tickets.values()) {
            try {
                await createTranscript(
                    channel,
                    interaction.user.tag,
                    `Category purge: ${category.name}`,
                    interaction.user
                );
            } catch (error) {
                transcriptFailed++;
                console.error(`Ticket purge transcript failed for ${channel.name}:`, error);
            }

            try {
                await channel.delete(`Ticket purge by ${interaction.user.tag}: ${category.name}`);
                closed++;
            } catch (error) {
                deleteFailed++;
                console.error(`Ticket purge deletion failed for ${channel.name}:`, error);
            }
        }

        return interaction.editReply(
            `**Ticket Purge Complete**\n\n` +
            `**Category:** ${category.name}\n` +
            `**Tickets Found:** ${tickets.size}\n` +
            `**Tickets Closed:** ${closed}\n` +
            `**Transcript Failures:** ${transcriptFailed}\n` +
            `**Close Failures:** ${deleteFailed}`
        );
    }
};
