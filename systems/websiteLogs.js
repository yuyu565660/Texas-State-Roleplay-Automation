const WEBSITE_LOG_URL = process.env.WEBSITE_LOG_URL || "https://texas-state-roleplay-website-manage.vercel.app/api/staff-logs";
const WEBSITE_LOG_SECRET = process.env.WEBSITE_LOG_SECRET;

async function sendWebsiteLog(type, payload, discordUser) {
    if (!WEBSITE_LOG_SECRET) {
        console.warn("WEBSITE_LOG_SECRET is not configured; website log skipped.");
        return false;
    }

    try {
        const response = await fetch(WEBSITE_LOG_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WEBSITE_LOG_SECRET}`
            },
            body: JSON.stringify({
                type,
                discordUser: discordUser ? {
                    id: discordUser.id,
                    username: discordUser.username,
                    tag: discordUser.tag
                } : null,
                payload
            })
        });

        if (!response.ok) {
            console.error("Website log API returned", response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error("Could not send website log:", error);
        return false;
    }
}

module.exports = { sendWebsiteLog };
