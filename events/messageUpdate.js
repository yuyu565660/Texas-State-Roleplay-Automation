const {
    Events,
    EmbedBuilder
} = require("discord.js");

// PRIVATE STAFF ONLY CHANNEL
const LOG_CHANNEL_ID = "1529614403639709696";

module.exports = {

    name: Events.MessageUpdate,

    async execute(oldMessage, newMessage) {

        try {

            // Ignore bots
            if (newMessage.author?.bot) {
                return;
            }

            // Ignore if nothing changed
            if (
                oldMessage.content ===
                newMessage.content
            ) {
                return;
            }

            const logChannel =
                newMessage.client.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!logChannel) {
                return;
            }

            const author =
                newMessage.author;

            const oldContent =
                oldMessage.content?.trim() ||
                "No content";

            const newContent =
                newMessage.content?.trim() ||
                "No content";

            const embed =
                new EmbedBuilder()

                    .setTitle("Message Edited")

                    .setDescription(
                        `A message was edited in <#${newMessage.channel.id}>.`
                    )

                    .addFields(
                        {
                            name: "User",
                            value: `${author.tag}\n\`${author.id}\``,
                            inline: true
                        },
                        {
                            name: "Channel",
                            value: `<#${newMessage.channel.id}>`,
                            inline: true
                        },
                        {
                            name: "Message ID",
                            value: `\`${newMessage.id}\``,
                            inline: true
                        },
                        {
                            name: "Before Edited",
                            value:
                                oldContent.length > 1024
                                    ? oldContent.substring(0, 1021) + "..."
                                    : oldContent
                        },
                        {
                            name: "After Edited",
                            value:
                                newContent.length > 1024
                                    ? newContent.substring(0, 1021) + "..."
                                    : newContent
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

            console.log(
                "EDIT LOGGER ERROR:",
                error
            );

        }
    }
};
