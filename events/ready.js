const path = require("path");
const loaGameDetector = require("./loaGameDetector");

module.exports = {
    name: "clientReady",
    once: true,

    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        // Discord presence persists; repeatedly setting it creates needless API
        // traffic and floods the console every 30 seconds.
        try {
            if (client.user.presence?.status !== "dnd") {
                await client.user.setPresence({ status: "dnd", activities: [] });
            }
            console.log("[PRESENCE] Status is DND.");
        } catch (error) {
            console.error("[PRESENCE] Failed to set DND:", error);
        }
        console.log("Starting monitoring systems...");

        try {
            const { startSuspensionRestorer } = require("../utils/staffSuspensions");
            startSuspensionRestorer(client);
            console.log("Started: staff suspension restoration");
        } catch (error) {
            console.error("Failed to start staff suspension restoration:", error);
        }

        try {
            const activityCheck = require("../commands/management/activity-check.js");
            await activityCheck.restoreActivityChecks(client);
            console.log("Started: activity-check restoration");
        } catch (error) {
            console.error("Failed to restore activity checks:", error);
        }

        const monitors = [
            ["callLogger.js", "callLogger.js"],
            ["giveawayEnd.js", "giveawayEnd.js"],
            ["joinLogger.js", "joinLogger.js"],
            ["liveryMonitor.js", "liveryMonitor.js"],
            ["lowLetterLogger.js", "lowLetterLogger.js"],
            ["teamBanChecker.js", "teamBanChecker.js"],
            ["wantedMonitor.js", "wantedMonitor.js"]
        ];

        for (const [name, fileName] of monitors) {
            try {
                const monitor = require(path.join(__dirname, fileName));

                if (typeof monitor === "function") {
                    await monitor(client);
                    console.log(`Started: ${name}`);
                    continue;
                }
                if (monitor && typeof monitor.start === "function") {
                    await monitor.start(client);
                    console.log(`Started: ${name}`);
                    continue;
                }
                if (monitor && typeof monitor.startLowLetterLogger === "function") {
                    await monitor.startLowLetterLogger(client);
                    console.log(`Started: ${name}`);
                    continue;
                }
                if (monitor && typeof monitor.startTeamBanChecker === "function") {
                    await monitor.startTeamBanChecker(client);
                    console.log(`Started: ${name}`);
                    continue;
                }

                console.log(`Skipped monitor: ${name} - no startup function found.`);
            } catch (error) {
                console.error(`Failed to start ${name}:`);
                console.error(error);
            }
        }

        try {
            loaGameDetector.start(client);
            for (const guild of client.guilds.cache.values()) {
                await loaGameDetector.scanGuild(guild);
            }
            console.log("Started: LOA game detector");
        } catch (error) {
            console.error("Failed to start LOA game detector:", error);
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Monitoring systems started.");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
};
