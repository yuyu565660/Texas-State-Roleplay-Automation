const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

const ALLOWED_ROLE_ID = "1403586703515582477";
const MEMBER_ROLE_ID = "1403586703045693500";
const PAGE_SIZE = 10;
const CHANNEL_CONCURRENCY = 15;
const ACTIVITY_PATH = path.join(__dirname, "../../database/member-activity.json");

function getChannels(guild) {
    return [...guild.channels.cache.values()].filter(channel =>
        !channel.isDMBased?.() &&
        channel.isTextBased?.() &&
        typeof channel.messages?.fetch === "function"
    );
}

function loadActivity() {
    try {
        if (!fs.existsSync(ACTIVITY_PATH)) return {};
        return JSON.parse(fs.readFileSync(ACTIVITY_PATH, "utf8"));
    } catch (error) {
        console.error("[ACTIVITY] Could not read activity database:", error);
        return {};
    }
}

function makeRecord(record) {
    if (!record?.lastMessage) return null;

    const seconds = Math.floor(record.lastMessage / 1000);
    const link = record.channelId && record.messageId
        ? `https://discord.com/channels/${record.guildId}/${record.channelId}/${record.messageId}`
        : null;

    return {
        createdTimestamp: record.lastMessage,
        link,
        display: link
            ? `<t:${seconds}:R> • <t:${seconds}:f>\\n[View last message](${link})`
            : `<t:${seconds}:R> • <t:${seconds}:f>`
    };
}

function buildEmbed(members, records, page, totalPages) {
    const start = page * PAGE_SIZE;
    const pageMembers = members.slice(start, start + PAGE_SIZE);

    const description = pageMembers.map((member, index) => {
        const record = records.get(member.id);
        return `**${start + index + 1}.** <@${member.id}> — ${record?.display || "No message found"}`;
    }).join("\n\n");

    return new EmbedBuilder()
        .setTitle("Texas State Roleplay | Member Activity")
        .setDescription(description || "No members with the required role were found.")
        .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${members.length} members` })
        .setTimestamp();
}

function buildButtons(page, totalPages, userId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`activity_prev_${userId}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId(`activity_next_${userId}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}

async function scanRecentChannel(channel, targetIds, records, cutoff) {
    let before;

    while (true) {
        let messages;

        try {
            messages = await channel.messages.fetch({
                limit: 100,
                ...(before ? { before } : {})
            });
        } catch (error) {
            console.error(`[ACTIVITY] Could not read #${channel.name}: ${error.message}`);
            return;
        }

        if (!messages.size) return;

        for (const msg of messages.values()) {
            if (msg.author?.bot || !targetIds.has(msg.author.id)) continue;

            const existing = records.get(msg.author.id);
            if (!existing || msg.createdTimestamp > existing.createdTimestamp) {
                const seconds = Math.floor(msg.createdTimestamp / 1000);
                records.set(msg.author.id, {
                    createdTimestamp: msg.createdTimestamp,
                    display: `<t:${seconds}:R> • <t:${seconds}:f>\\n[View last message](https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id})`
                });
            }
        }

        if (messages.last().createdTimestamp <= cutoff || messages.size < 100) return;
        before = messages.last().id;
    }
}

module.exports = {
    name: "activity",

    async execute(message) {
        if (!message.guild || !message.member.roles.cache.has(ALLOWED_ROLE_ID)) return;

        const sentMessage = await message.channel.send("Loading member activity...");

        try {
            const role = message.guild.roles.cache.get(MEMBER_ROLE_ID);

            if (!role) {
                await sentMessage.edit("The member activity role could not be found.");
                return;
            }

            const targetMembers = [...role.members.values()].filter(member => !member.user.bot);

            if (!targetMembers.length) {
                await sentMessage.edit("No members with the required role were found.");
                return;
            }

            const activity = loadActivity();
            const records = new Map();

            for (const member of targetMembers) {
                const record = makeRecord(activity[member.id]);
                if (record) records.set(member.id, record);
            }

            const missingIds = new Set(
                targetMembers
                    .filter(member => !records.has(member.id))
                    .map(member => member.id)
            );

            const channels = getChannels(message.guild);

            if (missingIds.size > 0) {
                await sentMessage.edit(`Catching up ${missingIds.size} member(s) with no saved activity...`).catch(() => {});

                let completed = 0;
                let nextIndex = 0;

                async function fullWorker() {
                    while (true) {
                        const index = nextIndex++;
                        if (index >= channels.length) return;

                        await scanRecentChannel(channels[index], missingIds, records, 0);
                        completed++;
                    }
                }

                await Promise.all(
                    Array.from(
                        { length: Math.min(CHANNEL_CONCURRENCY, channels.length) },
                        () => fullWorker()
                    )
                );
            }

            const validTimes = targetMembers
                .map(member => records.get(member.id)?.createdTimestamp || 0)
                .filter(Boolean);

            const oldestTrackedTime = validTimes.length ? Math.min(...validTimes) : Date.now();

            // Normal activity is now a quick catch-up scan. It only fetches enough
            // history to verify messages newer than the oldest saved activity.
            if (channels.length) {
                let completed = 0;
                let nextIndex = 0;
                let lastUpdate = 0;

                async function updateProgress(force = false) {
                    const now = Date.now();
                    if (!force && now - lastUpdate < 1500) return;
                    lastUpdate = now;

                    await sentMessage.edit({
                        content: `Checking recent activity... ${completed}/${channels.length} channels checked`
                    }).catch(() => {});
                }

                async function worker() {
                    while (true) {
                        const index = nextIndex++;
                        if (index >= channels.length) return;

                        await scanRecentChannel(
                            channels[index],
                            new Set(targetMembers.map(member => member.id)),
                            records,
                            oldestTrackedTime
                        );

                        completed++;
                        await updateProgress();
                    }
                }

                await Promise.all(
                    Array.from(
                        { length: Math.min(CHANNEL_CONCURRENCY, channels.length) },
                        () => worker()
                    )
                );

                await updateProgress(true);
            }

            targetMembers.sort((a, b) => {
                const aTime = records.get(a.id)?.createdTimestamp || 0;
                const bTime = records.get(b.id)?.createdTimestamp || 0;

                if (aTime !== bTime) return bTime - aTime;
                return a.displayName.localeCompare(b.displayName);
            });

            const totalPages = Math.max(1, Math.ceil(targetMembers.length / PAGE_SIZE));
            let page = 0;

            await sentMessage.edit({
                content: null,
                embeds: [buildEmbed(targetMembers, records, page, totalPages)],
                components: [buildButtons(page, totalPages, message.author.id)]
            });

            const collector = sentMessage.createMessageComponentCollector({
                time: 10 * 60 * 1000
            });

            collector.on("collect", async interaction => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({
                        content: "Only the person who used this command can change the page.",
                        ephemeral: true
                    }).catch(() => {});
                    return;
                }

                if (interaction.customId === `activity_prev_${message.author.id}`) {
                    page = Math.max(0, page - 1);
                }

                if (interaction.customId === `activity_next_${message.author.id}`) {
                    page = Math.min(totalPages - 1, page + 1);
                }

                await interaction.update({
                    embeds: [buildEmbed(targetMembers, records, page, totalPages)],
                    components: [buildButtons(page, totalPages, message.author.id)]
                }).catch(() => {});
            });

            collector.on("end", async () => {
                await sentMessage.edit({
                    components: [buildButtons(page, totalPages, message.author.id, true)]
                }).catch(() => {});
            });
        } catch (error) {
            console.error("[ACTIVITY] Hybrid scan failed:", error);

            await sentMessage.edit({
                content: "I could not finish checking member activity. Check the bot console for the error.",
                embeds: [],
                components: []
            }).catch(() => {});
        }
    }
};
