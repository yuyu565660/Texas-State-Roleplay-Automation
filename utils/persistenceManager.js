const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIRECTORIES = [
    path.join(ROOT, "data"),
    path.join(ROOT, "database")
];
const BACKUP_DIRECTORY = path.join(ROOT, "persistent-backups");
const BACKUP_INTERVAL_MS = 60 * 1000;

let backupTimer = null;

function ensureDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true });
}

function walkJsonFiles(directory) {
    if (!fs.existsSync(directory)) return [];

    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...walkJsonFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(fullPath);
        }
    }

    return files;
}

function isValidJson(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8").trim();
        if (!raw) return true;
        JSON.parse(raw);
        return true;
    } catch {
        return false;
    }
}

function atomicWrite(filePath, content) {
    const directory = path.dirname(filePath);
    ensureDirectory(directory);

    const temporaryPath = filePath + ".tmp-" + process.pid;
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, filePath);
}

function backupFile(filePath) {
    const relativePath = path.relative(ROOT, filePath);
    const backupPath = path.join(BACKUP_DIRECTORY, relativePath);

    if (!fs.existsSync(filePath)) return;

    ensureDirectory(path.dirname(backupPath));

    const content = fs.readFileSync(filePath);
    atomicWrite(backupPath, content);
}

function restoreCorruptFile(filePath) {
    const relativePath = path.relative(ROOT, filePath);
    const backupPath = path.join(BACKUP_DIRECTORY, relativePath);

    if (!fs.existsSync(backupPath)) return false;
    if (isValidJson(filePath)) return false;

    try {
        atomicWrite(filePath, fs.readFileSync(backupPath));
        console.warn("[PERSISTENCE] Restored corrupt JSON file:", relativePath);
        return true;
    } catch (error) {
        console.error("[PERSISTENCE] Failed to restore:", relativePath, error);
        return false;
    }
}

function backupAll() {
    ensureDirectory(BACKUP_DIRECTORY);

    let count = 0;

    for (const directory of DATA_DIRECTORIES) {
        for (const filePath of walkJsonFiles(directory)) {
            try {
                if (!isValidJson(filePath)) {
                    restoreCorruptFile(filePath);
                }

                if (isValidJson(filePath)) {
                    backupFile(filePath);
                    count++;
                }
            } catch (error) {
                console.error("[PERSISTENCE] Failed backing up:", filePath, error);
            }
        }
    }

    return count;
}

function initialize() {
    for (const directory of DATA_DIRECTORIES) {
        ensureDirectory(directory);
    }

    ensureDirectory(BACKUP_DIRECTORY);

    const restored = [];

    for (const directory of DATA_DIRECTORIES) {
        for (const filePath of walkJsonFiles(directory)) {
            if (restoreCorruptFile(filePath)) {
                restored.push(path.relative(ROOT, filePath));
            }
        }
    }

    const count = backupAll();

    if (backupTimer) clearInterval(backupTimer);
    backupTimer = setInterval(() => {
        backupAll();
    }, BACKUP_INTERVAL_MS);

    if (backupTimer.unref) backupTimer.unref();

    console.log(
        "[PERSISTENCE] Local persistent storage initialized. " +
        count + " JSON dataset(s) protected."
    );

    if (restored.length) {
        console.warn(
            "[PERSISTENCE] Recovered: " + restored.join(", ")
        );
    }
}

function shutdown() {
    if (backupTimer) {
        clearInterval(backupTimer);
        backupTimer = null;
    }

    const count = backupAll();
    console.log("[PERSISTENCE] Final backup completed for " + count + " dataset(s).");
}

module.exports = {
    initialize,
    shutdown,
    backupAll,
    atomicWrite
};
