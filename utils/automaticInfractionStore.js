const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../database/automaticInfractions.json");

function load() {
    try {
        if (!fs.existsSync(FILE)) return {};
        const raw = fs.readFileSync(FILE, "utf8");
        return raw.trim() ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[AUTOMATIC INFRACTION STORE] Load error:", error);
        return {};
    }
}

function save(data) {
    try {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("[AUTOMATIC INFRACTION STORE] Save error:", error);
    }
}

function saveAutomaticInfraction(id, data) {
    const all = load();
    all[id] = {
        ...data,
        savedAt: Date.now()
    };
    save(all);
}

function getAutomaticInfraction(id) {
    return load()[id] || null;
}

function removeAutomaticInfraction(id) {
    const all = load();
    delete all[id];
    save(all);
}

module.exports = {
    saveAutomaticInfraction,
    getAutomaticInfraction,
    removeAutomaticInfraction
};
