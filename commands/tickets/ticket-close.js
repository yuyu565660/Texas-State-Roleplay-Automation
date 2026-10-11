const { SlashCommandBuilder } = require("discord.js");
const { closeTicket } = require("../../systems/ticketCloser");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-close")
        .setDescription("Close the current ticket")
        .addStringOption(option => option.setName("reason").setDescription("Reason for closing the ticket").setRequired(true)),

    async execute(interaction) {
        const reason = interaction.options.getString("reason")?.trim() || "No reason provided.";

        await interaction.reply({
            content: "Closing ticket...",
            flags: 64
        });

        const result = await closeTicket(interaction, reason);

        if (!result.ok) {
            await interaction.followUp({
                content: result.message,
                flags: 64
            }).catch(() => {});
        }
    }
};
