const {
    Events,
    EmbedBuilder
} = require("discord.js");

// PRIVATE STAFF ONLY CHANNEL
const LOG_CHANNEL_ID = "1529614403639709696";

module.exports = {

    name: Events.MessageDelete,

    async execute(message) {

        try {
            if (message.author?.bot) {
                return;
            }

            const logChannel = message.client.channels.cache.get(LOG_CHANNEL_ID);

            if (!logChannel) {
                return;
            }

            const content = message.content?.trim() || "No content";

            const embed = new EmbedBuilder()
                .setTitle("Message Deleted")
                .setDescription(
                    `A message was deleted in <#${message.channel.id}>.`
                )
                .addFields(
                    {
                        name: "User",
                        value: `${message.author?.tag || "Unknown User"}\n\`${message.author?.id || "Unknown"}\``,
                        inline: true
                    },
                    {
                        name: "Channel",
                        value: `<#${message.channel.id}>`,
                        inline: true
                    },
                    {
                        name: "Message ID",
                        value: `\`${message.id}\``,
                        inline: true
                    },
                    {
                        name: "Deleted Content",
                        value: content.length > 1024
                            ? content.substring(0, 1021) + "..."
                            : content
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: "Texas State Roleplay | Message Logs"
                });

            await logChannel.send({
                embeds: [embed],
                allowedMentions: {
                    parse: []
                }
            });

        } catch (error) {
            console.log("DELETE LOGGER ERROR:", error);
        }
    }
};
