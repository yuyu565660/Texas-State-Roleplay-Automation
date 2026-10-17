const LOA_ROLE_ID = "1403586703515582484";
const ALERT_CHANNEL_ID = "1535310251178332271";
const ALERT_ROLE_ID = "1403586703612186670";
const SCAN_INTERVAL_MS = 30000;

function getPlayingActivities(presence) {
    return (presence?.activities || []).filter(activity => {
        if (!activity?.name) return false;
        return activity.type === 0;
    });
}

function getAlertSet(client) {
    if (!client._loaGameAlerts) client._loaGameAlerts = new Set();
    return client._loaGameAlerts;
}

function clearMemberAlerts(member) {
    const alerts = getAlertSet(member.client);
    const prefix = member.guild.id + ":" + member.id + ":";
    for (const key of [...alerts]) {
        if (key.startsWith(prefix)) alerts.delete(key);
    }
}

async function alertMember(member, presenceOverride = null) {
    if (!member || member.user?.bot) return false;
    if (!member.roles.cache.has(LOA_ROLE_ID)) {
        clearMemberAlerts(member);
        return false;
    }

    const presence =
        presenceOverride ||
        member.presence ||
        member.guild.presences.cache.get(member.id);

    const games = getPlayingActivities(presence);
    if (!games.length) {
        clearMemberAlerts(member);
        return false;
    }

    const channel = member.guild.channels.cache.get(ALERT_CHANNEL_ID) ||
        await member.guild.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
        console.error("[LOA GAME DETECTOR] Cannot access alert channel " + ALERT_CHANNEL_ID);
        return false;
    }

    const alerts = getAlertSet(member.client);
    let sent = false;

    for (const game of games) {
        const gameKey = member.guild.id + ":" + member.id + ":" + game.name;
        if (alerts.has(gameKey)) continue;

        await channel.send({
            content: "<@&" + ALERT_ROLE_ID + "> <@" + member.id + "> has LOA and is playing **" + game.name + "**.",
            allowedMentions: {
                roles: [ALERT_ROLE_ID],
                users: [member.id]
            }
        });

        alerts.add(gameKey);
        sent = true;

        console.log(
            "[LOA GAME DETECTOR] Alert sent: " +
            member.user.tag + " | " + game.name
        );
    }

    return sent;
}

async function scanGuild(guild) {
    try {
        // Do not call guild.members.fetch() on a timer. That sends Gateway
        // REQUEST_GUILD_MEMBERS (opcode 8) and causes the rate-limit errors
        // seen when this detector runs every few seconds.
        const loaRole = guild.roles.cache.get(LOA_ROLE_ID);
        if (!loaRole) {
            console.warn("[LOA GAME DETECTOR] LOA role not found | guild=" + guild.id);
            return;
        }

        let checked = 0;
        let alerted = 0;

        for (const member of loaRole.members.values()) {
            if (member.user?.bot) continue;
            checked++;
            if (await alertMember(member)) alerted++;
        }

        console.log(
            "[LOA GAME DETECTOR] Scan complete | guild=" + guild.id +
            " | LOA members checked=" + checked +
            " | alerts sent=" + alerted
        );
    } catch (error) {
        console.error("[LOA GAME DETECTOR] Scan failed:", error);
    }
}

function start(client) {
    if (client._loaGameDetectorStarted) return;
    client._loaGameDetectorStarted = true;

    const run = () => {
        for (const guild of client.guilds.cache.values()) {
            scanGuild(guild).catch(error => {
                console.error("[LOA GAME DETECTOR] Scheduled scan error:", error);
            });
        }
    };

    client._loaGameDetectorInterval = setInterval(run, SCAN_INTERVAL_MS);
    if (client._loaGameDetectorInterval.unref) client._loaGameDetectorInterval.unref();

    console.log("[LOA GAME DETECTOR] Started; checking cached LOA members every 30 seconds.");
}

module.exports = {
    name: "presenceUpdate",

    async execute(oldPresence, newPresence) {
        try {
            if (!newPresence?.guild || !newPresence.userId) return;

            // Never request-fetch here. Presence events and the member cache
            // are enough for role checking and game detection.
            const member = newPresence.member || newPresence.guild.members.cache.get(newPresence.userId);
            if (!member) return;

            if (!member.roles.cache.has(LOA_ROLE_ID)) {
                clearMemberAlerts(member);
                return;
            }

            await alertMember(member, newPresence);
        } catch (error) {
            console.error("[LOA GAME DETECTOR] presenceUpdate error:", error);
        }
    },

    alertMember,
    scanGuild,
    start,
    clearMemberAlerts
};
