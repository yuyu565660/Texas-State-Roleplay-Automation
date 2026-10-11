const fs = require("fs");
const path = require("path");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const STAFF_ROLE_ID = "1403586703146483793";
const NOTES_FILE = path.join(__dirname, "..", "..", "data", "notes.json");

function loadNotes() {
    try {
        if (!fs.existsSync(NOTES_FILE)) return [];
        const raw = fs.readFileSync(NOTES_FILE, "utf8").trim();
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Notes database read error:", error);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("noteview")
        .setDescription("View staff notes for a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to view notes for")
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)) {
            return interaction.reply({
                content: "❌ You cannot use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.options.getUser("user", true);
        const notes = loadNotes().filter(note => String(note.userId) === String(user.id));

        const description = notes.length
            ? notes.map((note, index) => {
                const issuedBy = note.issuedById
                    ? `<@${note.issuedById}>`
                    : note.issuedByTag || "Unknown";

                return [
                    `**Note #${index + 1}**`,
                    `> ${String(note.note || "").replace(/\n/g, "\n> ")}`,
                    `**Issued By:** ${issuedBy}`,
                    `**Date:** <t:${Math.floor(Number(note.timestamp || Date.now()) / 1000)}:F>`
                ].join("\n");
            }).join("\n\n")
            : "No notes found for this user.";

        const embed = new EmbedBuilder()
            .setTitle(`Notes for ${user.tag}`)
            .setColor("#43E04E")
            .setDescription(description)
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
};
