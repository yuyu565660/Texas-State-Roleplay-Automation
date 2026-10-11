const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
require("dotenv").config();

const loggedPlayers = new Set();
const CHANNEL_ID = process.env.JOIN_LOG_CHANNEL_ID || "1526670675811631104";
let missingChannelWarned = false;

async function checkJoins(client) {
    try {
        const serverKey = process.env.ERLC_SERVER_KEY;
        if (!serverKey) return;

        const response = await axios.get("https://api.erlc.gg/v2/server?JoinLogs=true", {
            headers: { "server-key": serverKey },
            timeout: 10000
        });

        const logs = response.data?.JoinLogs;
        if (!Array.isArray(logs)) return;

        let channel;
        try {
            channel = await client.channels.fetch(CHANNEL_ID);
        } catch (error) {
            if (!missingChannelWarned) {
                console.error(`Join Logger: channel ${CHANNEL_ID} is unavailable.`);
                missingChannelWarned = true;
            }
            return;
        }

        if (!channel?.isTextBased?.()) return;
        missingChannelWarned = false;

        for (const log of logs) {
            const id = `${log.Player}-${log.Timestamp}-${log.Join}`;
            if (loggedPlayers.has(id)) continue;
            loggedPlayers.add(id);

            const [username = "Unknown", robloxID = null] = String(log.Player || "").split(":");
            const action = log.Join ? "joined" : "left";
            const profile = robloxID ? `https://www.roblox.com/users/${robloxID}/profile` : null;

            const embed = new EmbedBuilder()
                .setTitle(log.Join ? "Join Log" : "Leave Log")
                .setColor(log.Join ? "Green" : "Red")
                .setDescription(`${profile ? `[${username}](${profile})` : username} ${action} the server at <t:${Number(log.Timestamp) || Math.floor(Date.now() / 1000)}:T>`)
                .setFooter({ text: "Texas State Roleplay" })
                .setTimestamp();

            if (robloxID) {
                embed.setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxID}&width=420&height=420&format=png`);
            }

            await channel.send({ embeds: [embed] });
        }

        if (loggedPlayers.size > 2000) {
            const entries = [...loggedPlayers].slice(-1000);
            loggedPlayers.clear();
            for (const entry of entries) loggedPlayers.add(entry);
        }
    } catch (error) {
        console.error("Join Logger Error:", error.response?.data || error.message || error);
    }
}

module.exports = function startJoinLogger(client) {
    console.log("Join/Leave Logger Started");
    checkJoins(client);
    setInterval(() => checkJoins(client), 10000);
};
