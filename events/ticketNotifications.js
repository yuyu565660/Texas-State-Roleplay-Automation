const { Events, EmbedBuilder } = require("discord.js");

const TICKET_PREFIX = "ticket-";

async function getTicketOwner(channel) {
    if (!channel) return null;

    if (channel.ticketOwner) {
        try {
            return await channel.client.users.fetch(channel.ticketOwner);
        } catch {}
    }

    if (!channel.permissionOverwrites?.cache) return null;

    const guildId = channel.guild?.id;
    const candidates = channel.permissionOverwrites.cache
        .filter(overwrite => overwrite.type === 1 && overwrite.id !== guildId)
        .map(overwrite => overwrite.id);

    for (const id of candidates) {
        try {
            const user = await channel.client.users.fetch(id);
            if (!user.bot) return user;
        } catch {}
    }

    return null;
}

async function sendTicketDM(user, title, description) {
    if (!user || user.bot) return;

    try {
        await user.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Texas State Roleplay | ${title}`)
                    .setDescription(description)
                    .setColor("#43E04E")
                    .setTimestamp()
            ]
        });
    } catch (error) {
        console.log(`Could not DM ticket user ${user.tag}: ${error.message}`);
    }
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.channel?.name?.startsWith(TICKET_PREFIX)) return;

        const owner = await getTicketOwner(interaction.channel);
        if (!owner) return;

        if (interaction.customId === "claim_ticket") {
            await sendTicketDM(
                owner,
                "Ticket Claimed",
                `Your ticket **${interaction.channel.name}** has been claimed by **${interaction.user.tag}**.\n\nYou can continue your conversation in the ticket channel.`
            );
            return;
        }

        if (interaction.customId === "unclaim_ticket") {
            await sendTicketDM(
                owner,
                "Ticket Unclaimed",
                `Your ticket **${interaction.channel.name}** has been unclaimed by **${interaction.user.tag}**.\n\nAnother staff member can now claim it.`
            );
        }
    }
};
