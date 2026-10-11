const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const CHANNEL_ID = "1526679069528162304";

const file = path.join(
    __dirname,
    "../database/vehicleLogs.json"
);

if (!fs.existsSync(path.dirname(file))) {
    fs.mkdirSync(path.dirname(file), {
        recursive: true
    });
}

if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
}

let loggedVehicles = new Set();

try {
    const saved = JSON.parse(
        fs.readFileSync(file, "utf8")
    );

    if (Array.isArray(saved)) {
        loggedVehicles = new Set(saved);
    }
} catch (error) {
    console.error("Could not load vehicle logs:");
    console.error(error);
    loggedVehicles = new Set();
}

function robloxInfo(player) {
    if (!player) {
        return {
            username: "Unknown",
            id: null
        };
    }

    const data = String(player).split(":");

    return {
        username: data[0] || "Unknown",
        id: data[1] || null
    };
}

async function checkVehicles(client) {
    try {
        const serverKey =
            process.env.ERLC_SERVER_KEY;

        if (!serverKey) {
            console.error(
                "Vehicle Logger: ERLC_SERVER_KEY is missing from .env"
            );
            return;
        }

        const response = await axios.get(
            "https://api.erlc.gg/v2/server?Vehicles=true",
            {
                headers: {
                    "server-key": serverKey
                },
                timeout: 10000
            }
        );

        const vehicles =
            response.data?.Vehicles;

        if (!Array.isArray(vehicles)) {
            return;
        }

        const channel =
            client.channels.cache.get(
                CHANNEL_ID
            );

        if (!channel) {
            console.error(
                `Vehicle Logger: Channel ${CHANNEL_ID} was not found.`
            );
            return;
        }

        for (const vehicle of vehicles) {
            const vehicleID =
                `${vehicle.Owner || "unknown"}-${vehicle.Name || "unknown"}-${vehicle.Plate || "none"}-${vehicle.Texture || "none"}`;

            if (loggedVehicles.has(vehicleID)) {
                continue;
            }

            loggedVehicles.add(vehicleID);

            const savedLogs = [
                ...loggedVehicles
            ].slice(-1000);

            fs.writeFileSync(
                file,
                JSON.stringify(
                    savedLogs,
                    null,
                    4
                )
            );

            const owner =
                robloxInfo(vehicle.Owner);

            const embed =
                new EmbedBuilder()
                    .setTitle("Vehicle Logged")
                    .setColor("Blue")
                    .setDescription(
                        `**Owner**

[${owner.username}](https://www.roblox.com/users/${owner.id || 1}/profile)

**Vehicle**

${vehicle.Name || "Unknown"}

**Plate**

${vehicle.Plate || "None"}

**Color**

${vehicle.ColorName || "Unknown"} ${vehicle.ColorHex || ""}

━━━━━━━━━━━━━━━━━━

Texas State Roleplay`
                    )
                    .setTimestamp();

            if (owner.id) {
                embed.setThumbnail(
                    `https://www.roblox.com/headshot-thumbnail/image?userId=${owner.id}&width=420&height=420&format=png`
                );
            }

            await channel.send({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error(
            "Vehicle Logger Error:"
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
            "Vehicle Logger Started"
        );

        checkVehicles(client);

        setInterval(() => {
            checkVehicles(client);
        }, 30000);
    }
};
