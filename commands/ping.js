const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency"),

    async execute(interaction, client) {
        await interaction.reply({
            content: ` You really think we are you hire is free server thats gonna reply with "pong" 💀 Pong! ${client.ws.ping}ms`
        });
    }
};
