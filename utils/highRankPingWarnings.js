const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../data/highRankPingWarnings.json");

function load() {
    try {
        if (!fs.existsSync(FILE)) return {};
        const raw = fs.readFileSync(FILE, "utf8");
        return raw.trim() ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[HIGH RANK PING WARNINGS] Load error:", error);
        return {};
    }
}

function save(data) {
    try {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("[HIGH RANK PING WARNINGS] Save error:", error);
    }
}

function getDayKey(timestamp = Date.now()) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

function getWarnings(guildId, userId) {
    const all = load();
    const key = guildId + ":" + userId;
    const entry = all[key];

    if (!entry || entry.day !== getDayKey()) {
        if (entry) {
            delete all[key];
            save(all);
        }
        return { count: 0, day: getDayKey() };
    }

    return entry;
}

function addWarning(guildId, userId) {
    const all = load();
    const key = guildId + ":" + userId;
    const day = getDayKey();
    const existing = all[key];

    const count = existing && existing.day === day ? existing.count + 1 : 1;

    all[key] = {
        guildId,
        userId,
        count,
        day,
        updatedAt: Date.now()
    };

    save(all);
    return all[key];
}

module.exports = {
    getWarnings,
    addWarning
};
