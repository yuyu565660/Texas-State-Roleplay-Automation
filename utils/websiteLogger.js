const axios = require("axios");

async function logToWebsite({ type, discordUser, payload, id }) {
    const url = process.env.WEBSITE_LOG_URL;
    const secret = process.env.WEBSITE_LOG_SECRET;

    if (!url || !secret) return { success: false, skipped: true };

    try {
        const response = await axios.post(url, {
            id,
            type,
            discordUser: discordUser ? {
                id: discordUser.id,
                username: discordUser.username,
                tag: discordUser.tag
            } : undefined,
            payload
        }, {
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        return response.data;
    } catch (error) {
        console.error("Website staff log error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { logToWebsite };
