const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const config = require("./config.json");

// ==========================================================
// SETTINGS
// ==========================================================

const TOKEN = process.env.TOKEN || config.token;
const CLIENT_ID = config.clientId;
const GUILD_ID = config.guildId;

if (!TOKEN) {
    console.error("❌ TOKEN is missing.");
    console.error("Add TOKEN=your_bot_token to your .env file.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("❌ clientId is missing from config.json.");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("❌ guildId is missing from config.json.");
    process.exit(1);
}

// ==========================================================
// COMMAND STORAGE
// ==========================================================

const commands = [];
const commandNames = new Set();

// ==========================================================
// FIND ALL COMMAND FILES
// ==========================================================

function getCommandFiles(directory) {
    let files = [];

    if (!fs.existsSync(directory)) {
        console.log(`⚠️ Missing folder: ${directory}`);
        return files;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
        const fullPath = path.join(directory, item);

        let stats;

        try {
            stats = fs.statSync(fullPath);
        } catch (error) {
            console.error(`❌ Could not read: ${fullPath}`);
            continue;
        }

        // Recursively search folders
        if (stats.isDirectory()) {
            files.push(
                ...getCommandFiles(fullPath)
            );

            continue;
        }

        // Only JavaScript files
        if (
            stats.isFile() &&
            item.endsWith(".js") &&
            !item.startsWith("_")
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

// ==========================================================
// LOAD COMMANDS
// ==========================================================

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔍 Searching for slash commands...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const commandsPath = path.join(
    __dirname,
    "commands"
);

const commandFiles = getCommandFiles(
    commandsPath
);

console.log(
    `📁 Found ${commandFiles.length} JavaScript command file(s).`
);

console.log("");

// ==========================================================
// PROCESS COMMAND FILES
// ==========================================================

for (const file of commandFiles) {
    try {
        // Clear cached version so deployment always reads
        // the current command file.
        delete require.cache[
            require.resolve(file)
        ];

        const command = require(file);

        // Ignore files that aren't slash commands
        if (
            !command ||
            !command.data ||
            typeof command.data.toJSON !== "function"
        ) {
            console.log(
                `⚠️ Skipped non-command file: ${path.relative(
                    __dirname,
                    file
                )}`
            );

            continue;
        }

        const commandData =
            command.data.toJSON();

        const commandName =
            commandData.name;

        if (!commandName) {
            console.log(
                `⚠️ Skipped command with no name: ${path.relative(
                    __dirname,
                    file
                )}`
            );

            continue;
        }

        // ==================================================
        // DUPLICATE CHECK
        // ==================================================

        if (
            commandNames.has(
                commandName
            )
        ) {
            console.log(
                `⚠️ Duplicate command skipped: /${commandName}`
            );

            console.log(
                `   File: ${path.relative(
                    __dirname,
                    file
                )}`
            );

            continue;
        }

        // ==================================================
        // ADD COMMAND
        // ==================================================

        commandNames.add(
            commandName
        );

        commands.push(
            commandData
        );

        console.log(
            `✅ Loaded command: /${commandName}`
        );

        console.log(
            `   └─ ${path.relative(
                __dirname,
                file
            )}`
        );

    } catch (error) {
        console.error(
            `❌ Failed loading command: ${path.relative(
                __dirname,
                file
            )}`
        );

        console.error(error);
    }
}

// ==========================================================
// CHECK COMMANDS
// ==========================================================

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

if (commands.length === 0) {
    console.error(
        "❌ No slash commands were found."
    );

    console.error(
        "Make sure your commands are inside the /commands folder."
    );

    process.exit(1);
}

console.log(
    `📦 Total commands ready: ${commands.length}`
);

console.log(
    `🏠 Guild ID: ${GUILD_ID}`
);

console.log(
    `🤖 Client ID: ${CLIENT_ID}`
);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// ==========================================================
// DISCORD REST
// ==========================================================

const rest = new REST({
    version: "10"
}).setToken(TOKEN);

// ==========================================================
// DEPLOY
// ==========================================================

(async () => {
    try {
        console.log("");
        console.log(
            `🔄 Deploying ${commands.length} slash commands...`
        );

        console.log("");

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("");
        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.log(
            "✅ Slash commands registered successfully!"
        );

        console.log(
            `📋 ${commands.length} command(s) deployed.`
        );

        console.log("");

        for (const command of commands) {
            console.log(
                `   /${command.name}`
            );
        }

        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.log(
            "💀 You can restart the bot now."
        );

    } catch (error) {
        console.log("");
        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        console.error(
            "❌ Slash command deployment failed."
        );

        console.error("");

        // Better error messages
        if (error.code === 50001) {
            console.error(
                "❌ Missing Access: The bot cannot access this guild."
            );
        } else if (error.code === 50013) {
            console.error(
                "❌ Invalid Permissions: Check the bot's permissions."
            );
        } else if (error.code === 0) {
            console.error(
                "❌ Invalid bot token."
            );
        }

        console.error("");
        console.error(error);

        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

        process.exit(1);
    }
})();
