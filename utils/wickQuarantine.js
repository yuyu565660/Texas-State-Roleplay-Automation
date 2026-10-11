const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "wick-quarantine.json");

function ensure() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}", "utf8");
}

function read() {
    ensure();
    try {
        const raw = fs.readFileSync(FILE, "utf8").trim();
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[WICK QUARANTINE] Failed to read store:", error);
        return {};
    }
}

function write(data) {
    ensure();
    const temp = FILE + ".tmp-" + process.pid;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temp, FILE);
}

function key(guildId, userId) {
    return guildId + ":" + userId;
}

function get(guildId, userId) {
    return read()[key(guildId, userId)] || null;
}

function set(guildId, userId, value) {
    const data = read();
    data[key(guildId, userId)] = value;
    write(data);
    return value;
}

function remove(guildId, userId) {
    const data = read();
    delete data[key(guildId, userId)];
    write(data);
}

function all() {
    return read();
}

module.exports = { get, set, remove, all };
