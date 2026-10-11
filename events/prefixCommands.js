const { withTrustedBypass, TRUSTED_OPERATOR_IDS } = require("../utils/trustedOperator");

const CMD_USERS = new Set([
    "1376280550217875508",
    "1164286092502122546",
    "1133098688693145753"
]);

module.exports = {
    name: "messageCreate",

    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const content = message.content.trim();

        // TX!cmds is a restricted command that only shows the available ! prefix commands.
        if (content.toLowerCase().startsWith("tx!")) {
            const args = content.slice(3).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();

            if (commandName !== "cmds") return;
            if (!CMD_USERS.has(message.author.id)) {
                return message.reply("You do not have permission to use this command.");
            }

            const commands = [...client.prefixCommands.values()]
                .map(command => command.prefix)
                .filter(Boolean)
                .map(name => `!${name}`)
                .sort((a, b) => a.localeCompare(b));

            const uniqueCommands = [...new Set(commands)];
            const lines = uniqueCommands.map(command => `• ${command}`);
            const chunks = [];
            let current = "**Prefix Commands**\n\n";

            for (const line of lines) {
                if ((current + line + "\n").length > 1900) {
                    chunks.push(current);
                    current = "";
                }
                current += line + "\n";
            }

            if (current.trim()) chunks.push(current);

            for (const chunk of chunks) {
                await message.channel.send(chunk);
            }

            return;
        }

        const prefix = "!";
        if (!content.startsWith(prefix)) return;

        const args = content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        if (commandName === "cmds") {
            if (!CMD_USERS.has(message.author.id)) {
                return message.reply("You do not have permission to use this command.");
            }

            const commands = [...client.prefixCommands.values()]
                .map(command => command.prefix)
                .filter(Boolean)
                .map(name => `!${name}`)
                .sort((a, b) => a.localeCompare(b));

            const uniqueCommands = [...new Set(commands)];
            const lines = uniqueCommands.map(command => `• ${command}`);
            const chunks = [];
            let current = "**Prefix Commands**\n\n";

            for (const line of lines) {
                if ((current + line + "\n").length > 1900) {
                    chunks.push(current);
                    current = "";
                }
                current += line + "\n";
            }

            if (current.trim()) chunks.push(current);

            for (const chunk of chunks) {
                await message.channel.send(chunk);
            }

            return;
        }

        if (commandName === "wl-log") {
            if (!TRUSTED_OPERATOR_IDS.has(message.author.id)) {
                return message.reply("You do not have permission to use this command.");
            }

            try {
                const { load } = require("../systems/annoyWhitelist");
                const users = [...new Set(load().map(String))];

                if (!users.length) {
                    return message.reply("No users are currently whitelisted for !annoy.");
                }

                const lines = users.map((id, index) => `${index + 1}. <@${id}> — ${id}`);
                const chunks = [];
                let current = "**!annoy Whitelist**\n\n";

                for (const line of lines) {
                    if ((current + line + "\n").length > 1900) {
                        chunks.push(current);
                        current = "";
                    }
                    current += line + "\n";
                }

                if (current.trim()) chunks.push(current);

                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            } catch (error) {
                console.error("[WL-LOG] Error:", error);
                return message.reply("I could not load the whitelist. Check the bot console.");
            }

            return;
        }

        const command = client.prefixCommands.get(commandName);
        if (!command || typeof command.executePrefix !== "function") return;

        try {
            await withTrustedBypass(message, () => command.executePrefix(message, args, client));
            if (typeof client.logCommandUsage === "function") {
                await client.logCommandUsage({
                    client, user: message.author, guild: message.guild,
                    commandName, type: "prefix", args, success: true
                });
            }
        } catch (error) {
            console.error(`Error executing prefix command: !${commandName}`, error);
        }
    }
};
