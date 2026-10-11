const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { createTranscript } = require("../systems/ticketSystem");

const INACTIVITY_TIME = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL = 10 * 60 * 1000;
const DELETE_DELAY = 10 * 1000;
const closingTickets = new Set();

async function findTicketCreator(ticket) {
    // New tickets store the owner directly in the channel topic.
    if (ticket.topic?.startsWith("ticket-owner:")) {
        const userId = ticket.topic.slice("ticket-owner:".length);
        const user = await ticket.client.users.fetch(userId).catch(() => null);
        if (user) return user;
    }

    // Backwards compatibility for older tickets.
    if (ticket.topic) {
        const match = ticket.topic.match(/\d{17,20}/);
        if (match) {
            const user = await ticket.client.users.fetch(match[0]).catch(() => null);
            if (user) return user;
        }
    }

    const nameMatch = ticket.name.match(/\d{17,20}/);
    if (nameMatch) {
        const user = await ticket.client.users.fetch(nameMatch[0]).catch(() => null);
        if (user) return user;
    }

    try {
        for (const overwrite of ticket.permissionOverwrites.cache.values()) {
            if (overwrite.type !== 1) continue;

            const member = await ticket.guild.members.fetch(overwrite.id).catch(() => null);
            if (!member || member.user.bot) continue;

            const permissions = overwrite.allow.bitfield;
            const isAdministrator = (permissions & PermissionsBitField.Flags.Administrator) !== 0;
            if (isAdministrator) continue;

            return member.user;
        }
    } catch (error) {
        console.log("Could not determine ticket creator:", error.message);
    }

    return null;
}

async function dmTicketCreator(user, ticket) {
    if (!user) return;

    const dmEmbed = new EmbedBuilder()
        .setTitle("Ticket Closed")
        .setColor("#43E04E")
        .setDescription(
            `Your ticket **${ticket.name}** in **Texas State Roleplay** has been closed due to **24 hours of inactivity**.\n\nIf you still need assistance, please create a new ticket.`
        )
        .setFooter({ text: "Texas State Roleplay • Automatic Inactivity Closure" })
        .setTimestamp();

    try {
        await user.send({ embeds: [dmEmbed] });
        console.log(`Sent 24-hour inactivity closure DM to ${user.tag}.`);
    } catch (error) {
        console.log(`Could not DM ${user.tag}:`, error.message);
    }
}

async function closeInactiveTicket(ticket, client) {
    if (closingTickets.has(ticket.id)) return;
    closingTickets.add(ticket.id);

    try {
        const ticketCreator = await findTicketCreator(ticket);

        // This DM is ONLY sent by the 24-hour inactivity system.
        await dmTicketCreator(ticketCreator, ticket);

        try {
            await createTranscript(
                ticket,
                "Automatic Inactivity System",
                "Automatically closed due to 24 hours of inactivity",
                null
            );
        } catch (error) {
            console.error(`Transcript error for ${ticket.name}:`, error);
        }

        setTimeout(async () => {
            try {
                if (ticket.deletable) {
                    await ticket.delete("Automatically closed after 24 hours of inactivity");
                }
            } catch (error) {
                console.log(`Could not delete ${ticket.name}:`, error.message);
            } finally {
                closingTickets.delete(ticket.id);
            }
        }, DELETE_DELAY);
    } catch (error) {
        console.error(`Ticket inactivity error for ${ticket.name}:`, error);
        closingTickets.delete(ticket.id);
    }
}

module.exports = {
    name: "clientReady",
    async execute(client) {
        console.log("Texas State Roleplay Ticket Inactivity Monitor Started");
        console.log("Tickets will automatically close after 24 hours of inactivity.");

        const checkTickets = async () => {
            try {
                for (const guild of client.guilds.cache.values()) {
                    const tickets = guild.channels.cache.filter(channel =>
                        channel.name?.toLowerCase().startsWith("ticket-")
                    );

                    for (const ticket of tickets.values()) {
                        if (closingTickets.has(ticket.id)) continue;

                        try {
                            const messages = await ticket.messages.fetch({ limit: 1 });
                            const lastMessage = messages.first();
                            if (!lastMessage) continue;

                            const inactiveTime = Date.now() - lastMessage.createdTimestamp;
                            if (inactiveTime >= INACTIVITY_TIME) {
                                await closeInactiveTicket(ticket, client);
                            }
                        } catch (error) {
                            console.log(`Ticket check error for ${ticket.name}:`, error.message);
                        }
                    }
                }
            } catch (error) {
                console.error("Ticket inactivity monitor error:", error);
            }
        };

        await checkTickets();
        setInterval(checkTickets, CHECK_INTERVAL);
    }
};
