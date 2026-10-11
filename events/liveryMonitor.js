const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const ERLC_SERVER_KEY = process.env.ERLC_SERVER_KEY;
const ERLC_GLOBAL_KEY = process.env.ERLC_GLOBAL_KEY;

const LIVERY_CHANNEL = "1526647779617935604";

const MONITORED_TEAMS = [
    "Police",
    "Sheriff",
    "Fire Department",
    "DOT"
];

const databaseDirectory = path.join(
    __dirname,
    "../database"
);

const file = path.join(
    databaseDirectory,
    "liveryLogs.json"
);

if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, {
        recursive: true
    });
}

if (!fs.existsSync(file)) {
    fs.writeFileSync(
        file,
        "[]",
        "utf8"
    );
}

let warnedPlayers;

try {
    warnedPlayers = new Set(
        JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        )
    );
} catch (error) {
    console.error(
        "Could not read liveryLogs.json:"
    );

    console.error(error);

    warnedPlayers = new Set();
}

let commandQueue = [];
let processing = false;
let intervalStarted = false;

async function sendERLCCommand(command) {
    commandQueue.push(command);

    if (processing) {
        return;
    }

    processing = true;

    while (commandQueue.length > 0) {
        const cmd = commandQueue.shift();

        try {
            await axios.post(
                "https://api.erlc.gg/v2/server/command",
                {
                    command: cmd
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "server-key": ERLC_SERVER_KEY,
                        "Authorization": ERLC_GLOBAL_KEY
                    }
                }
            );

            console.log(
                `ERLC command sent: ${cmd}`
            );

        } catch (error) {
            console.error(
                "ERLC Command Error:",
                error.response?.data ||
                error.message
            );
        }

        await new Promise(
            resolve => setTimeout(resolve, 5000)
        );
    }

    processing = false;
}

async function checkLiveries(client) {
    try {
        if (!ERLC_SERVER_KEY) {
            console.error(
                "Livery Monitor Error: ERLC_SERVER_KEY is missing."
            );

            return;
        }

        if (!ERLC_GLOBAL_KEY) {
            console.error(
                "Livery Monitor Error: ERLC_GLOBAL_KEY is missing."
            );

            return;
        }

        const response = await axios.get(
            "https://api.erlc.gg/v2/server?Vehicles=true&Players=true",
            {
                headers: {
                    "server-key": ERLC_SERVER_KEY
                }
            }
        );

        const vehicles =
            response.data?.Vehicles;

        const players =
            response.data?.Players;

        if (!Array.isArray(vehicles)) {
            console.log(
                "Livery Monitor: No vehicle data received."
            );

            return;
        }

        if (!Array.isArray(players)) {
            console.log(
                "Livery Monitor: No player data received."
            );

            return;
        }

        for (const vehicle of vehicles) {
            if (!vehicle) {
                continue;
            }

            const owner =
                vehicle.Owner;

            if (!owner) {
                continue;
            }

            const player =
                players.find(
                    p =>
                        p &&
                        typeof p.Player === "string" &&
                        p.Player.startsWith(owner)
                );

            if (!player) {
                continue;
            }

            if (
                !MONITORED_TEAMS.includes(
                    player.Team
                )
            ) {
                continue;
            }

            const texture =
                String(
                    vehicle.Texture || ""
                ).toLowerCase();

            if (
                !texture ||
                !texture.includes("standard")
            ) {
                continue;
            }

            const username =
                owner.split(":")[0];

            if (!username) {
                continue;
            }

            if (
                warnedPlayers.has(username)
            ) {
                continue;
            }

            warnedPlayers.add(username);

            try {
                fs.writeFileSync(
                    file,
                    JSON.stringify(
                        [...warnedPlayers],
                        null,
                        4
                    ),
                    "utf8"
                );
            } catch (error) {
                console.error(
                    "Could not save livery database:",
                    error
                );
            }

            const warnings = [
                "Please change your vehicle livery to an approved department livery.",
                "Your livery is still not approved. Change it immediately.",
                "Final warning. Change your livery now or you will be removed.",
                "You have been removed for failing to change your livery."
            ];

            for (
                let i = 0;
                i < warnings.length;
                i++
            ) {
                await sendERLCCommand(
                    `:pm ${username} ${warnings[i]}`
                );

                if (
                    i !== warnings.length - 1
                ) {
                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                30000
                            )
                    );
                }
            }

            await sendERLCCommand(
                `:kick ${username} Invalid department livery`
            );

            const channel =
                client.channels.cache.get(
                    LIVERY_CHANNEL
                );

            if (channel) {
                const embed =
                    new EmbedBuilder()
                        .setTitle(
                            "Livery Violation"
                        )
                        .setColor("Red")
                        .addFields(
                            {
                                name: "Player",
                                value:
                                    username,
                                inline: true
                            },
                            {
                                name: "Team",
                                value:
                                    String(
                                        player.Team ||
                                        "Unknown"
                                    ),
                                inline: true
                            },
                            {
                                name: "Vehicle",
                                value:
                                    String(
                                        vehicle.Name ||
                                        "Unknown"
                                    ),
                                inline: true
                            },
                            {
                                name: "Plate",
                                value:
                                    String(
                                        vehicle.Plate ||
                                        "None"
                                    ),
                                inline: true
                            },
                            {
                                name: "Livery",
                                value:
                                    String(
                                        vehicle.Texture ||
                                        "Unknown"
                                    ),
                                inline: false
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
        }

    } catch (error) {
        console.error(
            "Livery Monitor Error:",
            error.response?.data ||
            error.message
        );
    }
}

function startLiveryMonitor(client) {
    if (intervalStarted) {
        console.log(
            "Livery Monitor is already running."
        );

        return;
    }

    intervalStarted = true;

    console.log(
        "Livery Monitor Started"
    );

    checkLiveries(client);

    setInterval(
        () => {
            checkLiveries(client);
        },
        30000
    );
}

module.exports = startLiveryMonitor;
