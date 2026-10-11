const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const settingsModule = require("../commands/community/suggestion");
const DB_PATH = path.join(__dirname, "../database/suggestions.json");
const FALLBACK_CHANNEL = "1403638078660280451";
const REVIEW_ROLE = "1523696980126072882";

function readDB() {
    try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}"); } catch { return {}; }
}
function saveDB(db) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        const tmp = DB_PATH + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(db, null, 4), "utf8");
        fs.renameSync(tmp, DB_PATH);
        return true;
    } catch (error) { console.error("[MR POLL] Suggestion review save failed:", error); return false; }
}

module.exports = async function reviewSuggestion(interaction, decision) {
    if (!interaction.guild) return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    const allowed = interaction.member?.roles?.cache?.has(REVIEW_ROLE) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (!allowed) return interaction.reply({ content: "You do not have permission to review suggestions.", ephemeral: true });

    const messageId = interaction.options.getString("message_id", true).trim();
    const reason = interaction.options.getString("reason", true).trim();
    const settings = settingsModule.guildSettings(interaction.guildId);
    const channelId = settings.pendingChannel || FALLBACK_CHANNEL;
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !channel.messages) return interaction.reply({ content: "The pending suggestions channel is unavailable.", ephemeral: true });
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message?.embeds?.[0]) return interaction.reply({ content: "I couldn't find that suggestion in the pending channel. Check the message ID.", ephemeral: true });

    const db = readDB();
    const record = db[messageId] || { upvotes: [], downvotes: [] };
    if (record.decision) return interaction.reply({ content: "That suggestion has already been reviewed.", ephemeral: true });

    const title = decision === "accepted" ? "Accepted" : "Denied";
    const embed = EmbedBuilder.from(message.embeds[0])
        .addFields({ name: "Review decision", value: title }, { name: "Review reason", value: reason.slice(0, 1000) })
        .setFooter({ text: title + " by: " + interaction.user.username });
    const rows = (message.components || []).map(row => {
        const next = new ActionRowBuilder();
        const components = row.components.map(component => {
            try { return ButtonBuilder.from(component).setDisabled(true); } catch { return component; }
        });
        if (components.length) next.addComponents(components);
        return next;
    }).filter(row => row.components.length);

    try {
        await message.edit({ embeds: [embed], components: rows });
    } catch (error) {
        console.error("[MR POLL] Suggestion edit failed:", error);
        return interaction.reply({ content: "I couldn't update that suggestion. Check my message permissions.", ephemeral: true });
    }

    record.decision = decision;
    record.reviewedById = interaction.user.id;
    record.reviewedByTag = interaction.user.tag;
    record.reviewedAt = Date.now();
    record.reason = reason;
    db[messageId] = record;
    saveDB(db);

    const destinationId = decision === "accepted" ? settings.approvedChannel : settings.deniedChannel;
    if (destinationId) {
        const destination = await interaction.guild.channels.fetch(destinationId).catch(() => null);
        if (destination?.isTextBased()) {
            await destination.send({ embeds: [embed] }).catch(error => console.error("[MR POLL] Could not post reviewed suggestion:", error));
        }
    }
    return interaction.reply({ content: "Suggestion " + decision + ".", ephemeral: true });
};
