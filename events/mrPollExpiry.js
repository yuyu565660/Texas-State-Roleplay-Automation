const pollCommand = require("../commands/community/poll");

async function scanExpiredPolls(client) {
    const db = pollCommand.readDB();
    let changed = false;
    for (const record of Object.values(db)) {
        if (!record || record.ended || !record.endsAt || Date.now() < record.endsAt) continue;
        try {
            const channel = await client.channels.fetch(record.channelId).catch(() => null);
            const message = channel?.isTextBased() ? await channel.messages.fetch(record.messageId).catch(() => null) : null;
            if (!message) {
                record.ended = true;
                record.endedAt = Date.now();
                record.endNote = "Poll expired; original message unavailable";
                changed = true;
                continue;
            }
            await pollCommand.closePoll(client, record, message, "Duration elapsed");
            changed = true;
        } catch (error) {
            console.error("[MR POLL] Expiry scan failed:", error);
        }
    }
    if (changed) pollCommand.writeDB(db);
}

module.exports = {
    name: "clientReady",
    once: true,
    async execute(readyClient, client) {
        const activeClient = client || readyClient;
        await scanExpiredPolls(activeClient);
        const timer = setInterval(() => {
            scanExpiredPolls(activeClient).catch(error => console.error("[MR POLL] Expiry timer error:", error));
        }, 30000);
        if (timer.unref) timer.unref();
    }
};
