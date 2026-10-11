const { PermissionFlagsBits } = require("discord.js");
const ticketSystem = require("./ticketSystem");

const CLOSE_ROLE = "1529920867545518100";
const closingChannels = new Set();

function getTicketCategory(channel) {
    const categoryKey = channel?.ticketCategory;
    if (categoryKey && ticketSystem.ticketConfig.categories[categoryKey]) {
        return ticketSystem.ticketConfig.categories[categoryKey];
    }

    const categoryId = channel?.parentId;
    if (!categoryId) return null;

    return Object.values(ticketSystem.ticketConfig.categories).find(
        category => category.category === categoryId
    ) || null;
}

function isTicketChannel(channel) {
    return Boolean(
        channel &&
        channel.isTextBased?.() &&
        channel.type === 0 &&
        (
            channel.name?.toLowerCase().startsWith("ticket-") ||
            channel.topic?.startsWith("ticket-owner:")
        )
    );
}

function canCloseTicket(interaction) {
    if (!interaction?.member) return false;
    if (interaction.member.permissions?.has?.(PermissionFlagsBits.ManageChannels)) return true;
    if (interaction.member.roles?.cache?.has(CLOSE_ROLE)) return true;

    const category = getTicketCategory(interaction.channel);
    return Boolean(category?.role && interaction.member.roles.cache.has(category.role));
}

async function closeTicket(interaction, reason = "No reason provided.") {
    const channel = interaction.channel;

    if (!isTicketChannel(channel)) {
        return { ok: false, message: "This can only be used inside a ticket channel." };
    }

    if (!canCloseTicket(interaction)) {
        return { ok: false, message: "You do not have permission to close this ticket." };
    }

    if (closingChannels.has(channel.id)) {
        return { ok: false, message: "This ticket is already being closed." };
    }

    closingChannels.add(channel.id);

    try {
        try {
            await ticketSystem.createTranscript(
                channel,
                interaction.user.tag,
                reason,
                interaction.user
            );
        } catch (error) {
            console.error("Ticket transcript failed during close:", error);
        }

        try {
            await channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`);
            return { ok: true };
        } catch (error) {
            console.error("Ticket channel deletion failed:", error);
            return {
                ok: false,
                message: "I could not delete this ticket channel. Check the bot's Manage Channels permission and role hierarchy."
            };
        }
    } finally {
        closingChannels.delete(channel.id);
    }
}

module.exports = {
    CLOSE_ROLE,
    isTicketChannel,
    canCloseTicket,
    closeTicket
};
