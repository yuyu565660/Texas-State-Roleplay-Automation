const { Events, EmbedBuilder } = require("discord.js");

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

module.exports = {
    name: Events.ChannelDelete,

    async execute(channel) {
        if (!channel?.name?.startsWith("ticket-")) return;

        const owner = await getTicketOwner(channel);
        if (!owner || owner.bot) return;

        try {
            await owner.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Texas State Roleplay | Ticket Closed")
                        .setDescription(`Your ticket **${channel.name}** has been closed.\n\nIf you still need assistance, you can open a new ticket.`)
                        .setColor("#43E04E")
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.log(`Could not DM ticket owner ${owner.tag} after close: ${error.message}`);
        }
    }
};
