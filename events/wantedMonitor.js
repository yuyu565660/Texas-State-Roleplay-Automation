const axios = require("axios");
const { EmbedBuilder } = require("discord.js");

require("dotenv").config();

const WANTED_CHANNEL =
    "1526677182317989938";

async function checkWanted(client) {
    try {
        const serverKey =
            process.env.ERLC_SERVER_KEY;

        if (!serverKey) {
            console.error(
                "Wanted Monitor: ERLC_SERVER_KEY is missing from .env"
            );
            return;
        }

        const response = await axios.get(
            "https://api.erlc.gg/v2/server?Players=true",
            {
                headers: {
                    "server-key": serverKey
                },
                timeout: 10000
            }
        );

        const players =
            response.data?.Players;

        if (!Array.isArray(players)) {
            return;
        }

        const channel =
            client.channels.cache.get(
                WANTED_CHANNEL
            );

        if (!channel) {
            console.error(
                `Wanted Monitor: Channel ${WANTED_CHANNEL} was not found.`
            );
            return;
        }

        for (const player of players) {
            if (
                !player.WantedStars ||
                player.WantedStars <= 0
            ) {
                continue;
            }

            const embed =
                new EmbedBuilder()
                    .setTitle(
                        "Wanted Player"
                    )
                    .setColor("Red")
                    .addFields(
                        {
                            name: "Player",
                            value:
                                player.Player ||
                                "Unknown",
                            inline: true
                        },
                        {
                            name: "Department",
                            value:
                                player.Team ||
                                "Unknown",
                            inline: true
                        },
                        {
                            name: "Wanted Stars",
                            value:
                                String(
                                    player.WantedStars
                                )
                        },
                        {
                            name: "Location",
                            value:
                                `${player.Location?.StreetName || "Unknown"}\nPostal: ${player.Location?.PostalCode || "N/A"}`
                        }
                    )
                    .setFooter({
                        text:
                            "Texas State Roleplay"
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error(
            "Wanted Monitor Error:"
        );

        console.error(
            error.response?.data ||
            error.message ||
            error
        );
    }
}

module.exports = {
    name: "clientReady",
    once: true,

    execute(client) {
        console.log(
            "Wanted Monitor Started"
        );

        checkWanted(client);

        setInterval(() => {
            checkWanted(client);
        }, 30000);
    }
};
