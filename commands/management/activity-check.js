const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ACTIVITY_PERMISSION_ROLE = "1403586703612186670";
const DATA_FILE = path.join(__dirname, "../../data/activityChecks.json");
const USERS_PER_PAGE = 10;

function parseDuration(input) {
    if (!input || typeof input !== "string") return null;
    const normalized = input.toLowerCase().trim();
    const regex = /(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|months?|mo)/g;
    let totalMilliseconds = 0;
    let match;
    let matched = false;
    while ((match = regex.exec(normalized)) !== null) {
        matched = true;
        const amount = Number(match[1]);
        const unit = match[2];
        if (!Number.isFinite(amount) || amount <= 0) return null;
        let multiplier;
        if (/^(s|sec)/.test(unit)) multiplier = 1000;
        else if (/^(m|min)/.test(unit)) multiplier = 60 * 1000;
        else if (/^(h|hr)/.test(unit)) multiplier = 60 * 60 * 1000;
        else if (/^(d|day)/.test(unit)) multiplier = 24 * 60 * 60 * 1000;
        else if (/^(w|week)/.test(unit)) multiplier = 7 * 24 * 60 * 60 * 1000;
        else if (/^(mo|month)/.test(unit)) multiplier = 30 * 24 * 60 * 60 * 1000;
        else return null;
        totalMilliseconds += amount * multiplier;
    }
    const stripped = normalized.replace(regex, "").replace(/[\s,]+/g, "");
    return matched && stripped.length === 0 && totalMilliseconds > 0 ? totalMilliseconds : null;
}

function loadChecks() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        return raw.trim() ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("Activity check database read error:", error);
        return {};
    }
}

function saveChecks(checks) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(checks, null, 2));
}

function makeCustomId(type, checkId, page = null) {
    return page === null ? `activity_check_${type}_${checkId}` : `activity_check_${type}_${checkId}_${page}`;
}

function activityButton(checkId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(makeCustomId("react", checkId))
            .setLabel(disabled ? "Activity Check Closed" : "React")
            .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

function resultNavigation(checkId, page, totalPages) {
    if (totalPages <= 1) return [];
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(makeCustomId("page", checkId, Math.max(0, page - 1)))
                .setLabel("Previous")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId(makeCustomId("page", checkId, Math.min(totalPages - 1, page + 1)))
                .setLabel("Next")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        )
    ];
}

function buildResultEmbed(check, page = 0) {
    const missedUserIds = Array.isArray(check.missedUserIds) ? check.missedUserIds : [];
    const totalPages = Math.max(1, Math.ceil(missedUserIds.length / USERS_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const start = safePage * USERS_PER_PAGE;
    const pageUsers = missedUserIds.slice(start, start + USERS_PER_PAGE);
    const embed = new EmbedBuilder()
        .setTitle("Staff Activity Check Results")
        .setDescription([
            `Activity Check ID: **${check.checkId}**`,
            `Responded: **${check.reactedUsers?.length || 0}**`,
            `Did Not Respond: **${missedUserIds.length}**`,
            `Page **${safePage + 1}/${totalPages}**`
        ].join("\n"))
        .setTimestamp();
    if (pageUsers.length === 0) embed.addFields({ name: "Did Not Respond", value: "None" });
    else embed.addFields(pageUsers.map((userId, index) => ({ name: `${start + index + 1}. <@${userId}>`, value: `User ID: ${userId}` })));
    return { embed, page: safePage, totalPages, pageUsers };
}

async function getTargetMembers(guild, roleId) {
    const role = guild.roles.cache.get(roleId);
    if (!role) return [];
    await guild.members.fetch().catch(error => console.error("Activity member fetch error:", error));
    return [...role.members.values()];
}

async function issueActivityInfraction(guild, check, member) {
    try {
        const infract = require("../moderation/infract.js");
        const result = await infract.issueStaffInfraction({
            guild,
            user: member.user,
            issuerId: check.issuerId,
            punishment: check.punishment,
            reason: "Failing to react to an activity check",
            notes: `Automated infraction from activity check ${check.checkId}.`,
            appealable: check.appealable
        });
        if (!result?.success) console.error(`Activity check infraction failed for ${member.user.tag}:`, result?.error);
    } catch (error) {
        console.error(`Activity check infraction error for ${member.user.tag}:`, error);
    }
}

async function applyNextPunishment(guild, member, punishment) {
    const isStrike = punishment === "Strike" || /^Strike\b/i.test(punishment);
    const roles = isStrike
        ? ["1403586702773063728", "1403586702773063727", "1403586702773063726"]
        : ["1403586702773063723", "1403586702773063724", "1403586702773063725"];

    let currentLevel = 0;
    for (let i = roles.length - 1; i >= 0; i--) {
        if (member.roles.cache.has(roles[i])) {
            currentLevel = i + 1;
            break;
        }
    }

    const nextLevel = Math.min(currentLevel + 1, 3);
    const nextRoleId = roles[nextLevel - 1];

    if (nextLevel === 3) {
        for (const roleId of roles.slice(0, 2)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId).catch(error => console.error("Failed removing old punishment role:", error));
            }
        }
    }

    if (!member.roles.cache.has(nextRoleId)) {
        await member.roles.add(nextRoleId).catch(error => console.error("Failed adding punishment role:", error));
    }

    return nextLevel;
}

function splitMentions(userIds, maxLength = 1900) {
    const chunks = [];
    let current = "";
    for (const userId of userIds) {
        const mention = `<@${userId}>`;
        if (current && current.length + mention.length + 1 > maxLength) {
            chunks.push(current);
            current = mention;
        } else current += current ? ` ${mention}` : mention;
    }
    if (current) chunks.push(current);
    return chunks;
}

async function finalizeActivityCheck(client, messageId) {
    const checks = loadChecks();
    const check = checks[messageId];
    if (!check || check.completed) return;
    try {
        const guild = await client.guilds.fetch(check.guildId);
        const channel = await guild.channels.fetch(check.channelId);
        const message = await channel?.messages.fetch(messageId);
        if (!guild || !channel || !message) return;
        const members = await getTargetMembers(guild, check.roleId);
        const reacted = new Set(check.reactedUsers || []);
        const missedMembers = members.filter(member => !reacted.has(member.id));
        for (const member of missedMembers) {
            const level = await applyNextPunishment(guild, member, check.punishment);
            await issueActivityInfraction(guild, { ...check, punishment: `${check.punishment} ${level}` }, member);
        }
        check.completed = true;
        check.completedAt = Date.now();
        check.missedUserIds = missedMembers.map(member => member.id);
        checks[messageId] = check;
        saveChecks(checks);
        const result = buildResultEmbed(check, 0);
        const mentionChunks = splitMentions(check.missedUserIds);
        const firstMentions = mentionChunks.shift() || "No one missed the activity check.";
        await message.edit({
            content: firstMentions,
            embeds: [result.embed],
            components: [activityButton(check.checkId, true), ...resultNavigation(check.checkId, result.page, result.totalPages)],
            allowedMentions: { users: result.pageUsers }
        });
        for (const chunk of mentionChunks) {
            await channel.send({ content: chunk, allowedMentions: { users: chunk.match(/\d{17,20}/g) || [] } }).catch(error => console.error("Activity check mention message error:", error));
        }
    } catch (error) {
        console.error("Activity check finalization error:", error);
    }
}

function scheduleActivityCheck(client, messageId, endsAt) {
    const MAX_TIMEOUT = 2_147_000_000;
    const delay = endsAt - Date.now();
    if (delay <= 0) return finalizeActivityCheck(client, messageId);
    setTimeout(() => scheduleActivityCheck(client, messageId, endsAt), Math.min(delay, MAX_TIMEOUT));
}

async function handleActivityInteraction(interaction) {
    if (!interaction.isButton()) return false;
    const customId = interaction.customId;
    if (!customId.startsWith("activity_check_")) return false;
    const parts = customId.split("_");
    const type = parts[2];
    const checkId = parts[3];
    const page = parts[4] === undefined ? 0 : Number(parts[4]);
    const checks = loadChecks();
    const check = Object.values(checks).find(item => item.checkId === checkId);
    if (!check) {
        await interaction.reply({ content: "This activity check no longer exists.", flags: MessageFlags.Ephemeral });
        return true;
    }
    if (type === "react") {
        if (check.completed || Date.now() >= check.endsAt) {
            await interaction.reply({ content: "This activity check has already closed.", flags: MessageFlags.Ephemeral });
            return true;
        }
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.roles.cache.has(check.roleId)) {
            await interaction.reply({ content: "You are not required to respond to this activity check.", flags: MessageFlags.Ephemeral });
            return true;
        }
        check.reactedUsers = Array.isArray(check.reactedUsers) ? check.reactedUsers : [];
        if (!check.reactedUsers.includes(interaction.user.id)) {
            check.reactedUsers.push(interaction.user.id);
            saveChecks(checks);
        }
        await interaction.reply({ content: "Your response has been recorded. Thank you!", flags: MessageFlags.Ephemeral });
        return true;
    }
    if (type === "page") {
        if (!check.completed) {
            await interaction.reply({ content: "The activity check has not finished yet.", flags: MessageFlags.Ephemeral });
            return true;
        }
        const result = buildResultEmbed(check, Number.isFinite(page) ? page : 0);
        const pageMentions = result.pageUsers.map(userId => `<@${userId}>`).join(" ");
        await interaction.update({
            content: pageMentions || "No one missed the activity check.",
            embeds: [result.embed],
            components: [activityButton(check.checkId, true), ...resultNavigation(check.checkId, result.page, result.totalPages)],
            allowedMentions: { users: result.pageUsers }
        });
        return true;
    }
    return false;
}

async function restoreActivityChecks(client) {
    const checks = loadChecks();
    let changed = false;

    for (const [messageId, check] of Object.entries(checks)) {
        if (!check?.messageId || check.completed) continue;

        if (!check.checkId) {
            check.checkId = crypto.randomUUID();
            checks[messageId] = check;
            changed = true;
        }

        // Migrate old activity-check buttons so restored checks remain clickable.
        try {
            const guild = await client.guilds.fetch(check.guildId);
            const channel = await guild.channels.fetch(check.channelId);
            const message = await channel?.messages.fetch(messageId);
            const oldRow = message?.components?.[0];

            if (message && oldRow?.components?.length) {
                const oldButton = oldRow.components[0];
                const newButton = ButtonBuilder.from(oldButton)
                    .setCustomId(makeCustomId("react", check.checkId))
                    .setLabel("React")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(false);

                const row = ActionRowBuilder.from(oldRow);
                row.components[0] = newButton;
                await message.edit({ components: [row] }).catch(() => {});
            }
        } catch (error) {
            console.error(`Activity check migration failed for ${messageId}:`, error?.message || error);
        }

        scheduleActivityCheck(client, messageId, Number(check.endsAt));
    }

    if (changed) saveChecks(checks);
}

async function execute(interaction) {
    if (!interaction.member.roles.cache.has(ACTIVITY_PERMISSION_ROLE)) {
        return interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });
    }
    const channel = interaction.options.getChannel("channel");
    const role = interaction.options.getRole("role");
    const time = interaction.options.getString("time").trim();
    const punishment = interaction.options.getString("punishment") || "Warning";
    const appealable = interaction.options.getString("appealable");
    const duration = parseDuration(time);
    if (!duration) {
        return interaction.reply({ content: "Invalid time. Type a duration such as `23 seconds`, `1 minute`, `1 hour`, `1 day`, `1 week`, `1 month`, or `1 day 4 hours 30 minutes`.", flags: MessageFlags.Ephemeral });
    }
    if (!appealable) {
        return interaction.reply({ content: "You must select an appeal status for the automatic activity-check infraction.", flags: MessageFlags.Ephemeral });
    }
    if (!channel.isTextBased() || !channel.isSendable()) {
        return interaction.reply({ content: "The selected channel cannot receive messages.", flags: MessageFlags.Ephemeral });
    }
    const endsAt = Date.now() + duration;
    const deadline = `<t:${Math.floor(endsAt / 1000)}:F>`;
    const checkId = crypto.randomUUID();
    const content = [
        "# Staff Activity Check",
        "",
        `${role}`,
        "It’s time for our **activity check**.",
        "All members are required to respond to this activity check to confirm that they are currently active within the community.",
        "Failure to respond by the deadline will result in an automatic infraction.",
        `**Deadline:** ${deadline}`,
        `**Activity Check ID:** ${checkId}`,
        "Thank you for your cooperation and continued dedication to **Texas State Roleplay**."
    ].join("\n");
    const message = await channel.send({ content, components: [activityButton(checkId, false)], allowedMentions: { parse: [], roles: [role.id] } });
    const checks = loadChecks();
    checks[message.id] = {
        messageId: message.id,
        checkId,
        guildId: interaction.guildId,
        channelId: channel.id,
        roleId: role.id,
        endsAt,
        issuerId: interaction.user.id,
        punishment,
        appealable,
        reactedUsers: [],
        missedUserIds: [],
        completed: false,
        createdAt: Date.now(),
        durationInput: time
    };
    saveChecks(checks);
    scheduleActivityCheck(interaction.client, message.id, endsAt);
    return interaction.reply({ content: `Activity check sent in ${channel} with a duration of **${time}** and will close ${deadline}. Automatic infractions are always enabled.`, flags: MessageFlags.Ephemeral });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("activity-check")
        .setDescription("Run a staff activity check")
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("Channel where the activity check will be sent")
            .setRequired(true))
        .addRoleOption(option => option
            .setName("role")
            .setDescription("Staff role required to respond")
            .setRequired(true))
        .addStringOption(option => option
            .setName("time")
            .setDescription("How long the activity check should remain open")
            .setRequired(true))
        .addStringOption(option => option
            .setName("appealable")
            .setDescription("Whether the automatic infraction can be appealed")
            .setRequired(true)
            .addChoices(
                { name: "Appealable", value: "Yes" },
                { name: "Not Appealable", value: "No" }
            ))
        .addStringOption(option => option
            .setName("punishment")
            .setDescription("Automatic punishment for members who do not respond")
            .setRequired(false)
            .addChoices(
                { name: "Warning", value: "Warning" },
                { name: "Strike", value: "Strike" }
            )),

    async execute(interaction) {
        return execute(interaction);
    },

    handleActivityInteraction,
    restoreActivityChecks
};
