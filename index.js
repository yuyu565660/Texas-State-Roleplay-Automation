const {
    Client,
    GatewayIntentBits,
    Collection,
    Partials,
    REST,
    Routes,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const express = require("express");

require("dotenv").config();

const persistenceManager = require("./utils/persistenceManager");
persistenceManager.initialize();

process.on("exit", () => {
    try {
        persistenceManager.shutdown();
    } catch (error) {
        console.error("[PERSISTENCE] Shutdown backup failed:", error);
    }
});

process.on("uncaughtException", (error) => {
    console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("UNHANDLED REJECTION:", error);
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error("TOKEN IS MISSING");
    process.exit(1);
}

const loaGameDetector = require("./events/loaGameDetector");
const wickQuarantine = require("./events/wickQuarantine");
const config = require("./config.json");
const CLIENT_ID = config.clientId;
const GUILD_ID = config.guildId;
const COMMAND_LOG_CHANNEL_ID = "1529614403639709696";

async function logCommandUsage({ client, user, guild, commandName, type, args = [], success = true }) {
    try {
        const channel = await client.channels.fetch(COMMAND_LOG_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const commandText = String(type === "prefix" ? "!" : "/") + String(commandName || "unknown");

        const embed = new EmbedBuilder()
            .setTitle("Command Used")
            .addFields(
                { name: "Command", value: commandText, inline: true },
                { name: "User", value: "<@" + user.id + ">\n" + user.id, inline: true },
                { name: "Server", value: guild ? guild.name + "\n" + guild.id : "Unknown", inline: true },
                { name: "Arguments", value: args.length ? args.join(" ").slice(0, 1000) : "None", inline: false },
                { name: "Status", value: success ? "Success" : "Error", inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error("[COMMAND LOG] Failed:", error);
    }
}

if (!CLIENT_ID || !GUILD_ID) {
    console.error("CLIENT/GUILD ID IS MISSING");
    process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const webServer = app.listen(PORT, () => {
    console.log("Web server running on port " + PORT);
});
webServer.on("error", (error) => console.error("Main web server error:", error));

const INSTANCE_LOCK_PATH = path.join(__dirname, ".tsp-bot-instance.lock");

function acquireInstanceLock() {
    try {
        if (fs.existsSync(INSTANCE_LOCK_PATH)) {
            const existingPid = Number(fs.readFileSync(INSTANCE_LOCK_PATH, "utf8").trim());

            if (existingPid && existingPid !== process.pid) {
                try {
                    process.kill(existingPid, 0);
                    console.error("[INSTANCE] Another bot process is already running. Exiting.");
                    process.exit(1);
                } catch {
                    fs.unlinkSync(INSTANCE_LOCK_PATH);
                }
            } else {
                fs.unlinkSync(INSTANCE_LOCK_PATH);
            }
        }

        fs.writeFileSync(INSTANCE_LOCK_PATH, String(process.pid), { flag: "wx" });

        const release = () => {
            try {
                if (
                    fs.existsSync(INSTANCE_LOCK_PATH) &&
                    fs.readFileSync(INSTANCE_LOCK_PATH, "utf8").trim() === String(process.pid)
                ) {
                    fs.unlinkSync(INSTANCE_LOCK_PATH);
                }
            } catch {}
        };

        process.once("exit", release);
        process.once("SIGINT", () => {
            release();
            process.exit(0);
        });
        process.once("SIGTERM", () => {
            release();
            process.exit(0);
        });

        console.log("[INSTANCE] Acquired single-process lock. PID=" + process.pid);
    } catch (error) {
        console.error("[INSTANCE] Could not acquire single-process lock:", error);
        process.exit(1);
    }
}

acquireInstanceLock();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ],
    presence: { status: "dnd" }
});

client.commands = new Collection();
client.prefixCommands = new Collection();

function getFiles(directory) {
    const files = [];
    if (!fs.existsSync(directory)) return files;

    let items;
    try {
        items = fs.readdirSync(directory);
    } catch (error) {
        console.error("Could not read folder:", directory, error);
        return files;
    }

    for (const item of items) {
        const fullPath = path.join(directory, item);

        try {
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                files.push(...getFiles(fullPath));
            } else if (stats.isFile() && item.endsWith(".js")) {
                files.push(fullPath);
            }
        } catch (error) {
            console.error("Could not read:", fullPath, error);
        }
    }

    return files;
}

console.log("\n========================================\nLOADING COMMANDS\n========================================");

const commandsPath = path.join(__dirname, "commands");
const commandFiles = getFiles(commandsPath);
const loadedCommandNames = new Set();

for (const file of commandFiles) {
    try {
        delete require.cache[require.resolve(file)];

        const command = require(file);

        if (command && command.prefix && typeof command.executePrefix === "function") {
            client.prefixCommands.set(command.prefix.toLowerCase(), command);
            console.log("Loaded prefix command: !" + command.prefix);
            continue;
        }

        if (!command || !command.data || typeof command.execute !== "function") {
            console.log("Skipped command file: " + path.relative(__dirname, file));
            continue;
        }

        const commandName = command.data.name;

        if (!commandName) {
            console.log("Command has no name: " + path.relative(__dirname, file));
            continue;
        }

        if (loadedCommandNames.has(commandName)) {
            console.log("Duplicate command skipped: /" + commandName);
            continue;
        }

        command.__filePath = path.relative(__dirname, file).replace(/\\/g, "/");
        loadedCommandNames.add(commandName);
        client.commands.set(commandName, command);

        console.log("Loaded command: /" + commandName);
    } catch (error) {
        console.error("Failed loading command: " + path.relative(__dirname, file));
        console.error(error);
    }
}

console.log("Total commands loaded: " + client.commands.size);
console.log("Total prefix commands loaded: " + client.prefixCommands.size);

function loadEvents() {
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = getFiles(eventsPath);
    let loaded = 0;
    const messageCreateHandlers = [];
    const interactionCreateHandlers = [];

    console.log("\n========================================\nLOADING EVENTS\n========================================");

    for (const file of eventFiles) {
        try {
            const event = require(file);

            if (!event || !event.name || typeof event.execute !== "function") {
                console.log("Skipped event file: " + path.relative(__dirname, file));
                continue;
            }

            const relativePath = path.relative(__dirname, file);

            if (event.name === "messageCreate") {
                // High-rank ping enforcement is already handled by highRankPing.js.
                // Skip the legacy warning handler here too; it is a messageCreate
                // event, so putting it in the interaction-only skip list had no effect.
                const delegatedMessageEvents = new Set([
                    "events/highRankPingWarning.js"
                ]);

                if (delegatedMessageEvents.has(relativePath.split(path.sep).join("/"))) {
                    console.log("Skipped duplicate message handler: " + relativePath);
                    continue;
                }

                messageCreateHandlers.push({ event, relativePath });
                loaded++;
                continue;
            }

            if (event.name === "interactionCreate") {
                // These handlers are already delegated directly by events/interactionCreate.js.
                // Loading them again here makes the same button/modal execute twice.
                const delegatedInteractionEvents = new Set([
                    "events/00_ticketClose.js",
                    "events/00_trustedCommandAccess.js",
                    "events/highRankPingWarning.js",
                    "events/applicationButtons.js",
                    "events/applicationReview.js",
                    "events/banAppeal.js",
                    "events/mediaApplication.js",
                    "events/mrPollSuggestion.js",
                    "events/regulations.js",
                    "events/suggestions.js"
                ]);

                if (delegatedInteractionEvents.has(relativePath.split(path.sep).join("/"))) {
                    console.log("Skipped duplicate delegated interaction handler: " + relativePath);
                    continue;
                }

                interactionCreateHandlers.push({ event, relativePath });
                loaded++;
                continue;
            }

            const handler = async (...args) => {
                try {
                    await event.execute(...args, client);
                } catch (error) {
                    console.error("Event Error [" + event.name + "] (" + relativePath + "):", error);
                }
            };

            if (event.once) {
                client.once(event.name, handler);
            } else {
                client.on(event.name, handler);
            }

            loaded++;
        } catch (error) {
            console.error("Failed loading event: " + path.relative(__dirname, file));
            console.error(error);
        }
    }

    if (messageCreateHandlers.length) {
        client._handledMessageIds = new Set();

        client.on("messageCreate", async (message) => {
            if (!message || !message.id || client._handledMessageIds.has(message.id)) return;

            client._handledMessageIds.add(message.id);

            const timer = setTimeout(() => {
                client._handledMessageIds.delete(message.id);
            }, 10 * 60 * 1000);

            if (timer && typeof timer.unref === "function") timer.unref();

            for (const item of messageCreateHandlers) {
                try {
                    await item.event.execute(message, client);
                } catch (error) {
                    console.error("Event Error [messageCreate] (" + item.relativePath + "):", error);
                }
            }
        });
    }

    if (interactionCreateHandlers.length) {
        client.on("interactionCreate", async (interaction) => {
            if (!client._handledInteractionIds) client._handledInteractionIds = new Set();
            if (client._handledInteractionIds.has(interaction.id)) return;

            client._handledInteractionIds.add(interaction.id);

            const timer = setTimeout(() => {
                client._handledInteractionIds.delete(interaction.id);
            }, 10 * 60 * 1000);

            if (timer && typeof timer.unref === "function") timer.unref();

            // Several legacy handlers listen for the same interaction. Mark the
            // interaction as acknowledged as soon as any handler attempts a response
            // (including showModal/update), then stop routing it to other handlers.
            if (!interaction._tspResponseGuardInstalled) {
                interaction._tspResponseGuardInstalled = true;
                for (const method of ["reply", "deferReply", "deferUpdate", "update", "showModal"]) {
                    const originalMethod = interaction[method]?.bind(interaction);
                    if (!originalMethod) continue;
                    interaction[method] = (...args) => {
                        interaction._tspAcknowledgementStarted = true;
                        return originalMethod(...args);
                    };
                }
            }

            for (const item of interactionCreateHandlers) {
                try {
                    if (interaction._tspAcknowledgementStarted || interaction.replied || interaction.deferred) break;
                    await item.event.execute(interaction, client);
                } catch (error) {
                    console.error("Event Error [interactionCreate] (" + item.relativePath + "):", error);
                    if (interaction._tspAcknowledgementStarted || interaction.replied || interaction.deferred) break;
                }
            }
        });
    }

    console.log("Total events loaded: " + loaded);
}

loadEvents();

async function deploySlashCommands() {
    const commands = Array.from(client.commands.values()).map((command) => command.data.toJSON());

    if (!commands.length) return;

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: commands
        });

        console.log("Successfully deployed " + commands.length + " slash command(s).");
    } catch (error) {
        console.error("Failed to deploy slash commands:", error);
    }
}

client.once("clientReady", async () => {
    console.log("[INSTANCE] PID=" + process.pid + " NODE=" + process.version);
    await deploySlashCommands();
    await wickQuarantine.restoreStoredQuarantines(client);
});

console.log("[DISCORD] Connecting to Discord...");
client.login(TOKEN).catch((error) => {
    console.error("Discord login failed:", error);
});

client.logCommandUsage = logCommandUsage;

module.exports = {
    client,
    deploySlashCommands,
    logCommandUsage
};
