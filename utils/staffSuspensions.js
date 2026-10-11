const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "staff-suspensions.json");
const SUSPENSION_ROLE = "1403586702773063729";

function ensureFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}", "utf8");
}

function readData() {
    ensureFile();
    try {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeData(data) {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function saveSuspension(userId, guildId, roleId, expiresAt) {
    const data = readData();
    data[userId] = { userId, guildId, roleId, expiresAt };
    writeData(data);
}

function removeSuspension(userId) {
    const data = readData();
    delete data[userId];
    writeData(data);
}

function getSuspension(userId) {
    return readData()[userId] || null;
}

async function restoreDueSuspensions(client) {
    const data = readData();
    let changed = false;
    const now = Date.now();

    for (const [userId, record] of Object.entries(data)) {
        if (!record?.expiresAt || record.expiresAt > now) continue;

        try {
            const guild = await client.guilds.fetch(record.guildId).catch(() => null);
            if (!guild) continue;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) continue;

            // The suspension role must always be removed when the suspension expires.
            if (member.roles.cache.has(SUSPENSION_ROLE)) {
                try {
                    await member.roles.remove(
                        SUSPENSION_ROLE,
                        "Staff suspension expired."
                    );
                } catch (error) {
                    console.error(
                        `[SUSPENSION RESTORE] Could not remove suspension role from ${userId}:`,
                        error
                    );
                    // Keep the record so the bot retries on the next check.
                    continue;
                }
            }

            if (record.roleId && !member.roles.cache.has(record.roleId)) {
                const role =
                    guild.roles.cache.get(record.roleId) ||
                    await guild.roles.fetch(record.roleId).catch(() => null);

                if (!role) {
                    console.error(
                        `[SUSPENSION RESTORE] Saved role ${record.roleId} no longer exists for ${userId}.`
                    );
                    // The suspension is still over, so remove the saved record.
                    delete data[userId];
                    changed = true;
                    continue;
                }

                try {
                    await member.roles.add(
                        role,
                        "Suspension expired; restoring role held before suspension."
                    );
                } catch (error) {
                    console.error(
                        `[SUSPENSION RESTORE] Could not restore role ${record.roleId} to ${userId}:`,
                        error
                    );
                    // Keep the record so restoration is retried.
                    continue;
                }
            }

            delete data[userId];
            changed = true;
        } catch (error) {
            console.error(`[SUSPENSION RESTORE] Failed for ${userId}:`, error);
        }
    }

    if (changed) writeData(data);
}

function startSuspensionRestorer(client) {
    const run = () =>
        restoreDueSuspensions(client).catch(error =>
            console.error("[SUSPENSION RESTORE] Error:", error)
        );

    run();
    setInterval(run, 60 * 1000);
}

module.exports = {
    SUSPENSION_ROLE,
    saveSuspension,
    removeSuspension,
    getSuspension,
    restoreDueSuspensions,
    startSuspensionRestorer
};
