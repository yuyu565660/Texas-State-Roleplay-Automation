const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "approved_alts.json");

function load() {
    try {
        if (!fs.existsSync(dataPath)) return {};
        const raw = fs.readFileSync(dataPath, "utf8").trim();
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("[DATABASE] Failed to read approved alts:", error);
        return {};
    }
}

function save(data) {
    try {
        const temporaryPath = dataPath + ".tmp-" + process.pid;
        fs.writeFileSync(
            temporaryPath,
            JSON.stringify(data, null, 2),
            "utf8"
        );
        fs.renameSync(temporaryPath, dataPath);
    } catch (error) {
        console.error("[DATABASE] Failed to save approved alts:", error);
    }
}

function prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();

    return {
        run(...params) {
            const data = load();

            if (normalized.includes("INSERT OR REPLACE INTO APPROVED_ALTS")) {
                const [robloxId, approvedBy, approvedDate] = params;
                data[String(robloxId)] = {
                    roblox_id: String(robloxId),
                    approved_by: String(approvedBy),
                    approved_date: Number(approvedDate)
                };
                save(data);
                return { changes: 1 };
            }

            if (normalized.includes("DELETE FROM APPROVED_ALTS")) {
                const [robloxId] = params;
                const key = String(robloxId);
                const existed = Object.prototype.hasOwnProperty.call(data, key);
                delete data[key];
                if (existed) save(data);
                return { changes: existed ? 1 : 0 };
            }

            throw new Error("Unsupported database query.");
        },

        get(...params) {
            if (normalized.includes("SELECT ROBLOX_ID FROM APPROVED_ALTS")) {
                const [robloxId] = params;
                return load()[String(robloxId)] || undefined;
            }

            throw new Error("Unsupported database query.");
        }
    };
}

module.exports = {
    prepare
};
