const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "../database/suggestions.json");
const suggestionSettings = require("../commands/community/suggestion");
const REVIEW_ROLE_ID = "1523696980126072882";

function getDB() {
    try {
        if (!fs.existsSync(databasePath)) {
            fs.mkdirSync(path.dirname(databasePath), { recursive: true });
            fs.writeFileSync(databasePath, "{}", "utf8");
        }
        const raw = fs.readFileSync(databasePath, "utf8").trim();
        if (!raw) return {};
        const data = JSON.parse(raw);
        return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (error) {
        console.error("Suggestion database read error:", error);
        return {};
    }
}

function saveDB(data) {
    const temp = `${databasePath}.tmp`;
    try {
        fs.mkdirSync(path.dirname(databasePath), { recursive: true });
        fs.writeFileSync(temp, JSON.stringify(data, null, 4), "utf8");
        fs.renameSync(temp, databasePath);
        return true;
    } catch (error) {
        console.error("Suggestion database write error:", error);
        try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
        return false;
    }
}

function parseButton(id) {
    const match = /^(suggest_up|suggest_down|suggest_accept|suggest_deny|suggest_voters)_(\d+)$/.exec(id);
    return match ? { action: match[1], messageId: match[2] } : null;
}

function makeRow(message, reviewDisabled) {
    const components = message.components?.[0]?.components || [];
    if (components.length !== 4 && components.length !== 5) return null;

    return new ActionRowBuilder().addComponents(
        ButtonBuilder.from(components[0]),
        ButtonBuilder.from(components[1]),
        ButtonBuilder.from(components[2]).setDisabled(reviewDisabled),
        ButtonBuilder.from(components[3]).setDisabled(reviewDisabled),
        ...(components[4] ? [ButtonBuilder.from(components[4])] : [])
    );
}

module.exports = {
    // Explicit event name so index.js registers this as a real
    // interactionCreate event instead of relying on the fallback loader.
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isButton()) return;

        const parsed = parseButton(interaction.customId);
        if (!parsed || interaction.message.id !== parsed.messageId) return;

        const { action, messageId } = parsed;
        const db = getDB();
        const record = db[messageId] || {
            upvotes: [],
            downvotes: [],
            decision: null,
            reviewedById: null,
            reviewedByTag: null
        };

        record.upvotes = Array.isArray(record.upvotes) ? record.upvotes : [];
        record.downvotes = Array.isArray(record.downvotes) ? record.downvotes : [];

        // VIEW VOTERS
        if (action === "suggest_voters") {
            if (!interaction.member?.roles?.cache?.has(REVIEW_ROLE_ID)) {
                return interaction.reply({ content: "You do not have permission to view suggestion voters.", ephemeral: true });
            }
            const voters = getDB()[messageId] || record;
            const format = ids => ids.length ? ids.map(id => `<@${id}>`).join(", ").slice(0, 900) : "None";
            return interaction.reply({ content: `**Agree (${(voters.upvotes || []).length})**\\n${format(voters.upvotes || [])}\\n\\n**Disagree (${(voters.downvotes || []).length})**\\n${format(voters.downvotes || [])}`, ephemeral: true });
        }

        // AGREE / DISAGREE
        if (action === "suggest_up" || action === "suggest_down") {
            const userId = interaction.user.id;

            if (action === "suggest_up") {
                record.downvotes = record.downvotes.filter(id => id !== userId);
                if (record.upvotes.includes(userId)) {
                    record.upvotes = record.upvotes.filter(id => id !== userId);
                } else {
                    record.upvotes.push(userId);
                }
            } else {
                record.upvotes = record.upvotes.filter(id => id !== userId);
                if (record.downvotes.includes(userId)) {
                    record.downvotes = record.downvotes.filter(id => id !== userId);
                } else {
                    record.downvotes.push(userId);
                }
            }

            const components = interaction.message.components?.[0]?.components || [];
            if (components.length !== 4 && components.length !== 5) {
                return interaction.reply({ content: "These suggestion buttons are invalid. Please create a new suggestion.", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(components[0]).setLabel(`Agree: ${record.upvotes.length}`),
                ButtonBuilder.from(components[1]).setLabel(`Disagree: ${record.downvotes.length}`),
                ButtonBuilder.from(components[2]).setDisabled(Boolean(record.decision)),
                ButtonBuilder.from(components[3]).setDisabled(Boolean(record.decision)),
                ...(components[4] ? [ButtonBuilder.from(components[4])] : [])
            );

            // Update Discord first, then save. This prevents a failed Discord
            // edit from falsely recording a vote.
            try {
                await interaction.update({ components: [row] });
            } catch (error) {
                console.error("Suggestion vote update error:", error);
                return;
            }

            db[messageId] = record;
            saveDB(db);
            return;
        }

        // ACCEPT / DENY
        if (action === "suggest_accept" || action === "suggest_deny") {
            if (!interaction.member?.roles?.cache?.has(REVIEW_ROLE_ID)) {
                return interaction.reply({ content: "You do not have permission to accept or deny suggestions.", ephemeral: true });
            }

            // One final decision per suggestion. Store the exact Discord USER ID.
            if (record.decision) {
                return interaction.reply({
                    content: record.reviewedById === interaction.user.id
                        ? "You already accepted or denied this suggestion."
                        : `This suggestion has already been ${record.decision} by <@${record.reviewedById}>.`,
                    ephemeral: true
                });
            }

            const existingEmbed = interaction.message.embeds?.[0];
            if (!existingEmbed) {
                return interaction.reply({ content: "I couldn't find the suggestion embed.", ephemeral: true });
            }

            const existingFooter = existingEmbed.footer?.text || "";
            if (/^(Accepted|Denied) by:/i.test(existingFooter)) {
                return interaction.reply({ content: "This suggestion has already been reviewed.", ephemeral: true });
            }

            const accepted = action === "suggest_accept";
            const decision = accepted ? "accepted" : "denied";
            const footerText = `${accepted ? "Accepted" : "Denied"} by: ${interaction.user.username}`;
            const updatedEmbed = EmbedBuilder.from(existingEmbed).setFooter({ text: footerText });
            const row = makeRow(interaction.message, true);

            if (!row) {
                return interaction.reply({ content: "These suggestion buttons are invalid. Please create a new suggestion.", ephemeral: true });
            }

            // Discord is updated FIRST. If it fails, the database is untouched.
            try {
                await interaction.update({ embeds: [updatedEmbed], components: [row] });
            } catch (error) {
                console.error("Suggestion review update error:", error);
                return;
            }

            record.decision = decision;
            record.reviewedById = interaction.user.id;
            record.reviewedByTag = interaction.user.tag;
            record.reviewedAt = Date.now();
            db[messageId] = record;

            if (!saveDB(db)) {
                console.error("Suggestion review updated in Discord but could not be persisted.");
            }

            const settings = suggestionSettings.guildSettings(interaction.guildId);
            const destinationId = accepted ? settings.approvedChannel : settings.deniedChannel;
            if (destinationId) {
                const destination = await interaction.guild.channels.fetch(destinationId).catch(() => null);
                if (destination?.isTextBased()) {
                    await destination.send({ embeds: [updatedEmbed] }).catch(error => {
                        console.error("Suggestion review destination send failed:", error);
                    });
                }
            }
        }
    }
};
