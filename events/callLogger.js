const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
require("dotenv").config();

const loggedCalls = new Set();
const CHANNEL_ID = process.env.EMERGENCY_CALL_LOG_CHANNEL_ID || "1526668685853331537";
let missingChannelWarned = false;

async function checkCalls(client) {
    try {
        const serverKey = process.env.ERLC_SERVER_KEY;
        if (!serverKey) return;

        const response = await axios.get("https://api.erlc.gg/v2/server?EmergencyCalls=true", {
            headers: { "server-key": serverKey },
            timeout: 10000
        });

        const calls = response.data?.EmergencyCalls;
        if (!Array.isArray(calls)) return;

        let channel;
        try {
            channel = await client.channels.fetch(CHANNEL_ID);
        } catch (error) {
            if (!missingChannelWarned) {
                console.error(`Call Logger: channel ${CHANNEL_ID} is unavailable.`);
                missingChannelWarned = true;
            }
            return;
        }

        if (!channel?.isTextBased?.()) return;
        missingChannelWarned = false;

        for (const call of calls) {
            const callID = String(call.CallNumber ?? `${call.Caller}-${call.Timestamp}`);
            if (loggedCalls.has(callID)) continue;
            loggedCalls.add(callID);

            const coordinates = Array.isArray(call.Position)
                ? `${call.Position[0]}, ${call.Position[1]}`
                : "Unknown";

            const embed = new EmbedBuilder()
                .setTitle("New Emergency Call")
                .setColor("#43E04E")
                .addFields(
                    { name: "Department", value: String(call.Team || "Unknown"), inline: true },
                    { name: "Caller", value: String(call.Caller || "Unknown"), inline: true },
                    { name: "Call Number", value: String(call.CallNumber || "Unknown"), inline: true },
                    { name: "Description", value: String(call.Description || "No description provided").slice(0, 1024) },
                    { name: "Location", value: String(call.PositionDescriptor || "No location provided").slice(0, 1024) },
                    { name: "Coordinates", value: coordinates.slice(0, 1024) }
                )
                .setFooter({ text: "Texas State Roleplay Emergency Dispatch" })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }

        if (loggedCalls.size > 2000) {
            const entries = [...loggedCalls].slice(-1000);
            loggedCalls.clear();
            for (const entry of entries) loggedCalls.add(entry);
        }
    } catch (error) {
        console.error("Call Logger Error:", error.response?.data || error.message || error);
    }
}

module.exports = function startCallLogger(client) {
    console.log("Emergency Call Logger Started");
    checkCalls(client);
    setInterval(() => checkCalls(client), 10000);
};
