const fs = require("fs");
const path = require("path");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const quarantineStore = require("./wickQuarantine");

const LOG_CHANNEL_ID = "1529614403639709696";
const QUARANTINE_ROLE_ID = "1532285299286216775";
const MODERATION_ROLE_ID = "1403586703612186670";
const TRUSTED_ROLE_ID = "1403586703716777988";
const TRUSTED_USER_ID = "1133098688693145753";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "wick-security.json");
const WHITELIST_FILE = path.join(DATA_DIR, "security-whitelist.json");

const DEFAULT_CONFIG = {
    enabled: true,
    antiNuke: true,
    joinRaid: true,
    joinGate: true,
    heat: true,
    heatPanic: true,
    autoLockdown: true,
    mentionRaid: true,
    webhookProtection: true,
    roleProtection: true,
    channelProtection: true,
    quarantineProtection: true,
    messageProtection: true,
    messageLimit: 5,
    messageWindow: 4,
    spamTimeoutSeconds: 60,
    raidJoinLimit: 8,
    raidJoinWindow: 20,
    mentionLimit: 12,
    mentionWindow: 10,
    heatThreshold: 100,
    heatDecayMs: 60000,
    antiNukeLimit: 3,
    antiNukeWindow: 10000,
    accountAgeDays: 14,
    noAvatarAction: "quarantine",
    raidAction: "quarantine"
};

function ensure() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");
    if (!fs.existsSync(WHITELIST_FILE)) fs.writeFileSync(WHITELIST_FILE, "{}");
}

function read() {
    ensure();
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        return {};
    }
}

function write(data) {
    ensure();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuildConfig(id) {
    const data = read();
    data[id] = { ...DEFAULT_CONFIG, ...(data[id] || {}) };
    write(data);
    return data[id];
}

function updateGuildConfig(id, patch) {
    const data = read();
    data[id] = { ...DEFAULT_CONFIG, ...(data[id] || {}), ...patch };
    write(data);
    return data[id];
}

function readWhitelist() {
    ensure();
    try {
        return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf8"));
    } catch {
        return {};
    }
}

function writeWhitelist(data) {
    ensure();
    const temp = WHITELIST_FILE + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temp, WHITELIST_FILE);
}

function getGuildWhitelist(guildId) {
    const data = readWhitelist();
    const guild = data[guildId] || {};
    return {
        users: Array.isArray(guild.users) ? guild.users : [],
        bots: Array.isArray(guild.bots) ? guild.bots : [],
        webhooks: Array.isArray(guild.webhooks) ? guild.webhooks : []
    };
}

function setWhitelist(guildId, type, id, enabled = true) {
    const data = readWhitelist();
    if (!data[guildId]) data[guildId] = { users: [], bots: [], webhooks: [] };
    if (!Array.isArray(data[guildId][type])) data[guildId][type] = [];

    data[guildId][type] = data[guildId][type].filter(Boolean);

    if (enabled && !data[guildId][type].includes(id)) {
        data[guildId][type].push(id);
    }

    if (!enabled) {
        data[guildId][type] = data[guildId][type].filter(value => value !== id);
    }

    writeWhitelist(data);
    return getGuildWhitelist(guildId);
}

function isWhitelisted(guildId, type, id) {
    if (!id) return false;
    return getGuildWhitelist(guildId)[type]?.includes(id) || false;
}

function memberId(member) {
    return member?.id || member?.user?.id || null;
}

function memberHasRole(member, roleId) {
    if (!member || !roleId) return false;
    if (member.roles?.cache?.has(roleId)) return true;
    // Interaction.member can be an APIInteractionGuildMember, whose roles are IDs rather than a Collection.
    if (Array.isArray(member.roles)) return member.roles.includes(roleId);
    return false;
}

function memberHasAdministrator(member) {
    if (!member?.permissions) return false;
    try {
        if (typeof member.permissions.has === "function") {
            return member.permissions.has(PermissionsBitField.Flags.Administrator);
        }
        return new PermissionsBitField(member.permissions).has(PermissionsBitField.Flags.Administrator);
    } catch {
        return false;
    }
}

function hasSecurityBypass(member) {
    return Boolean(
        memberId(member) === TRUSTED_USER_ID ||
        memberHasRole(member, TRUSTED_ROLE_ID) ||
        memberHasAdministrator(member)
    );
}

function hasAdministrator(member) {
    return memberHasAdministrator(member);
}

function hasModerationRole(member) {
    return memberHasRole(member, MODERATION_ROLE_ID);
}

async function getLogChannel(guild) {
    return guild?.channels.cache.get(LOG_CHANNEL_ID) ||
        await guild?.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
}

async function securityLog(guild, title, fields = [], color = "#C9A227") {
    try {
        const channel = await getLogChannel(guild);
        if (!channel?.isTextBased()) return;
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(title)
                    .setColor(color)
                    .addFields(fields.slice(0, 25))
                    .setTimestamp()
            ]
        });
    } catch (error) {
        console.error("[WICK LOG]", error);
    }
}

function parseDuration(input) {
    if (!input) return null;

    const value = String(input).trim().toLowerCase();
    if (["permanent", "perm", "forever"].includes(value)) return null;

    const match = value.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)$/);
    if (!match) return undefined;

    const multipliers = {
        s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
        m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000,
        h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000,
        d: 86400000, day: 86400000, days: 86400000,
        w: 604800000, week: 604800000, weeks: 604800000
    };

    const duration = Number(match[1]) * multipliers[match[2]];
    if (!Number.isFinite(duration) || duration <= 0) return undefined;

    return duration;
}

function scheduleQuarantineExpiry(member, expiresAt) {
    if (!expiresAt) return;

    if (!member.client._wickQuarantineTimers) {
        member.client._wickQuarantineTimers = new Map();
    }

    const key = member.guild.id + ":" + member.id;
    const oldTimer = member.client._wickQuarantineTimers.get(key);
    if (oldTimer) clearTimeout(oldTimer);

    const timer = setTimeout(async () => {
        member.client._wickQuarantineTimers.delete(key);

        const fresh = await member.guild.members.fetch(member.id).catch(() => null);
        if (!fresh) return;

        if (fresh.roles.cache.has(QUARANTINE_ROLE_ID)) {
            await unquarantineMember(fresh, "Wick quarantine duration expired");
        } else {
            await restoreQuarantineRoles(fresh, "Wick quarantine duration expired");
        }
    }, Math.max(0, expiresAt - Date.now()));

    if (timer.unref) timer.unref();
    member.client._wickQuarantineTimers.set(key, timer);
}

async function restoreQuarantineRoles(member, reason = "Quarantine removed") {
    const stored = quarantineStore.get(member.guild.id, member.id);
    if (!stored) return false;

    const roleIds = Array.isArray(stored.roleIds) ? stored.roleIds : [];
    const validRoleIds = roleIds.filter(id => {
        if (!id || id === member.guild.id || id === QUARANTINE_ROLE_ID) return false;
        const role = member.guild.roles.cache.get(id);
        return role && !role.managed && role.editable;
    });

    try {
        if (!member.client._wickRoleOperations) member.client._wickRoleOperations = new Set();
        const operationKey = member.guild.id + ":" + member.id;
        member.client._wickRoleOperations.add(operationKey);

        if (member.manageable) {
            await member.roles.set(validRoleIds, reason);
        } else {
            for (const roleId of validRoleIds) {
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(roleId, reason).catch(() => {});
                }
            }
        }

        quarantineStore.remove(member.guild.id, member.id);
        member.client._wickRoleOperations?.delete(operationKey);

        if (member.client._wickQuarantineTimers) {
            const key = member.guild.id + ":" + member.id;
            const timer = member.client._wickQuarantineTimers.get(key);
            if (timer) clearTimeout(timer);
            member.client._wickQuarantineTimers.delete(key);
        }

        return true;
    } catch (error) {
        if (member.client._wickRoleOperations) {
            member.client._wickRoleOperations.delete(member.guild.id + ":" + member.id);
        }
        console.error("[WICK QUARANTINE] Failed to restore roles:", error);
        return false;
    }
}

async function quarantineMember(member, reason = "Security violation", durationMs = null) {
    if (!member?.manageable) return false;

    // Administrators, the trusted role, and the trusted user bypass automatic Wick quarantine.
    if (hasSecurityBypass(member)) return false;

    const role = member.guild.roles.cache.get(QUARANTINE_ROLE_ID) ||
        await member.guild.roles.fetch(QUARANTINE_ROLE_ID).catch(() => null);

    if (!role || role.position >= member.guild.members.me.roles.highest.position) return false;

    let stored = quarantineStore.get(member.guild.id, member.id);

    if (!stored) {
        const roleIds = member.roles.cache
            .filter(r => r.id !== member.guild.id && r.id !== QUARANTINE_ROLE_ID && !r.managed)
            .map(r => r.id);

        stored = {
            guildId: member.guild.id,
            userId: member.id,
            roleIds,
            quarantinedAt: Date.now(),
            expiresAt: durationMs ? Date.now() + durationMs : null
        };

        quarantineStore.set(member.guild.id, member.id, stored);
    } else if (durationMs) {
        stored.expiresAt = Date.now() + durationMs;
        quarantineStore.set(member.guild.id, member.id, stored);
    }

    try {
        if (!member.client._wickRoleOperations) member.client._wickRoleOperations = new Set();
        const operationKey = member.guild.id + ":" + member.id;
        member.client._wickRoleOperations.add(operationKey);
        await member.roles.set([role.id], reason);
        member.client._wickRoleOperations.delete(operationKey);
        scheduleQuarantineExpiry(member, stored.expiresAt);
        return member.roles.cache.has(role.id);
    } catch (error) {
        if (member.client._wickRoleOperations) member.client._wickRoleOperations.delete(member.guild.id + ":" + member.id);
        console.error("[WICK QUARANTINE] Failed to quarantine member:", error);
        return false;
    }
}

async function unquarantineMember(member, reason = "Quarantine removed") {
    const role = member.guild.roles.cache.get(QUARANTINE_ROLE_ID) ||
        await member.guild.roles.fetch(QUARANTINE_ROLE_ID).catch(() => null);

    if (!role) return false;

    const key = member.guild.id + ":" + member.id;
    if (!member.client._wickRoleOperations) member.client._wickRoleOperations = new Set();
    member.client._wickRoleOperations.add(key);
    let removed = false;
    try {
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role, reason);
            removed = true;
        }
    } catch (error) {
        console.error("[WICK QUARANTINE] Failed to remove quarantine role:", error);
        member.client._wickRoleOperations.delete(key);
        return false;
    }

    const restored = await restoreQuarantineRoles(member, reason);
    member.client._wickRoleOperations.delete(key);
    return restored || removed;
}

const LOCKDOWN_FILE = path.join(DATA_DIR, "wick-lockdown.json");

function readLockdowns() {
    ensure();
    try {
        const value = JSON.parse(fs.readFileSync(LOCKDOWN_FILE, "utf8") || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
        console.error("[WICK LOCKDOWN] Failed to read saved permissions:", error);
        return {};
    }
}

function writeLockdowns(data) {
    ensure();
    const temporary = LOCKDOWN_FILE + ".tmp";
    try {
        fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
        fs.renameSync(temporary, LOCKDOWN_FILE);
        return true;
    } catch (error) {
        console.error("[WICK LOCKDOWN] Failed to save permissions:", error);
        try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
        return false;
    }
}

function sendMessagesState(channel, guildId) {
    const overwrite = channel.permissionOverwrites?.cache?.get(guildId);
    if (!overwrite) return null;
    if (overwrite.allow.has(PermissionsBitField.Flags.SendMessages)) return true;
    if (overwrite.deny.has(PermissionsBitField.Flags.SendMessages)) return false;
    return null;
}

async function getLockdownChannels(guild) {
    const fetched = await guild.channels.fetch().catch(() => null);
    const channels = fetched || guild.channels.cache;
    return [...channels.values()].filter(channel =>
        channel &&
        channel.guild?.id === guild.id &&
        channel.isTextBased?.() &&
        channel.permissionOverwrites
    );
}

async function lockdownGuild(guild, reason = "Security lockdown") {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        throw new Error("The bot needs the Manage Channels permission to activate lockdown.");
    }

    const allChannels = await getLockdownChannels(guild);
    const data = readLockdowns();
    const state = data[guild.id] && data[guild.id].active
        ? data[guild.id]
        : { active: true, startedAt: Date.now(), channels: {} };
    if (!state.channels || typeof state.channels !== "object") state.channels = {};

    // Save every channel's original @everyone Send Messages state before changing any permissions.
    for (const channel of allChannels) {
        if (!Object.prototype.hasOwnProperty.call(state.channels, channel.id)) {
            state.channels[channel.id] = {
                sendMessages: sendMessagesState(channel, guild.id),
                savedAt: Date.now()
            };
        }
    }

    state.active = true;
    state.updatedAt = Date.now();
    data[guild.id] = state;
    if (!writeLockdowns(data)) {
        throw new Error("I couldn't save the original channel permissions, so lockdown was not applied.");
    }

    let changed = 0;
    for (const channel of allChannels) {
        try {
            await channel.permissionOverwrites.edit(
                guild.roles.everyone,
                { SendMessages: false },
                { reason }
            );
            changed++;
        } catch (error) {
            console.error("[WICK LOCKDOWN] Could not lock channel " + channel.id + " (" + channel.name + "):", error);
        }
    }
    return changed;
}

async function unlockGuild(guild, reason = "Security lockdown lifted") {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        throw new Error("The bot needs the Manage Channels permission to lift lockdown.");
    }

    const data = readLockdowns();
    const state = data[guild.id];
    if (!state?.active || !state.channels || typeof state.channels !== "object") {
        // Do not clear @everyone overwrites without a snapshot: that can accidentally open restricted channels.
        return 0;
    }

    const channels = await getLockdownChannels(guild);
    const channelMap = new Map(channels.map(channel => [channel.id, channel]));
    let restored = 0;

    for (const [channelId, saved] of Object.entries(state.channels)) {
        const channel = channelMap.get(channelId);
        if (!channel) {
            delete state.channels[channelId];
            continue;
        }

        try {
            await channel.permissionOverwrites.edit(
                guild.roles.everyone,
                { SendMessages: saved.sendMessages === true ? true : saved.sendMessages === false ? false : null },
                { reason }
            );
            delete state.channels[channelId];
            restored++;
            state.updatedAt = Date.now();
            if (Object.keys(state.channels).length) {
                data[guild.id] = state;
            } else {
                delete data[guild.id];
            }
            if (!writeLockdowns(data)) {
                console.error("[WICK LOCKDOWN] Restored channel " + channelId + " but could not update the saved recovery state.");
            }
        } catch (error) {
            console.error("[WICK LOCKDOWN] Could not restore channel " + channelId + " (" + channel.name + "):", error);
        }
    }

    if (Object.keys(state.channels).length) {
        state.active = true;
        data[guild.id] = state;
    } else {
        delete data[guild.id];
    }
    if (!writeLockdowns(data)) {
        console.error("[WICK LOCKDOWN] Failed to finalize saved permission cleanup.");
    }

    return restored;
}

function addTimedValue(map, key, now, windowMs) {
    const values = (map.get(key) || []).filter(timestamp => now - timestamp <= windowMs);
    values.push(now);
    map.set(key, values);
    return values.length;
}

function addHeat(client, guildId, userId, amount, decayMs) {
    if (!client._wickHeat) client._wickHeat = new Map();
    const key = guildId + ":" + userId;
    const current = client._wickHeat.get(key) || { heat: 0, updated: Date.now() };
    const decay = Math.floor((Date.now() - current.updated) / decayMs) * 10;
    current.heat = Math.max(0, current.heat - decay) + amount;
    current.updated = Date.now();
    client._wickHeat.set(key, current);
    return current.heat;
}

function getHeat(client, guildId, userId, decayMs) {
    return addHeat(client, guildId, userId, 0, decayMs);
}

module.exports = {
    LOG_CHANNEL_ID,
    QUARANTINE_ROLE_ID,
    MODERATION_ROLE_ID,
    TRUSTED_ROLE_ID,
    TRUSTED_USER_ID,
    DEFAULT_CONFIG,
    getGuildConfig,
    updateGuildConfig,
    getGuildWhitelist,
    setWhitelist,
    isWhitelisted,
    hasSecurityBypass,
    hasAdministrator,
    hasModerationRole,
    parseDuration,
    restoreQuarantineRoles,
    scheduleQuarantineExpiry,
    securityLog,
    quarantineMember,
    unquarantineMember,
    lockdownGuild,
    unlockGuild,
    addTimedValue,
    addHeat,
    getHeat
};
