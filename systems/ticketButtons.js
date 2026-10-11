const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

function ticketButtons() {

    return new ActionRowBuilder()
        .addComponents(

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

        );

}

module.exports = {
    ticketButtons
};
