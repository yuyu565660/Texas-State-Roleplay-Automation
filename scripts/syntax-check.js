const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const ignored = new Set(["node_modules", ".git", ".bh-history", ".npm", "musicManager.js"]);
const files = [];

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue;

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(fullPath);
        }
    }
}

walk(root);

let failed = 0;

for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8"
    });

    if (result.status !== 0) {
        failed++;
        console.error(`Syntax error: ${path.relative(root, file)}`);
        if (result.stderr) console.error(result.stderr.trim());
    }
}

if (failed > 0) {
    console.error(`Syntax check failed: ${failed} file(s).`);
    process.exit(1);
}

console.log(`Syntax check passed: ${files.length} JavaScript file(s).`);
