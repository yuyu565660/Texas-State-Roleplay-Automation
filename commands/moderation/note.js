const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");

const STAFF_ROLE_ID = "1403586703146483793";
const NOTES_FILE = path.join(__dirname, "..", "..", "data", "notes.json");

function loadNotes() {
    try {
        if (!fs.existsSync(NOTES_FILE)) {
            fs.mkdirSync(path.dirname(NOTES_FILE), { recursive: true });
            fs.writeFileSync(NOTES_FILE, "[]", "utf8");
            return [];
        }

        const raw = fs.readFileSync(NOTES_FILE, "utf8").trim();
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Notes database read error:", error);
        return [];
    }
}

function saveNotes(notes) {
    const temporaryFile = `${NOTES_FILE}.tmp`;
    fs.mkdirSync(path.dirname(NOTES_FILE), { recursive: true });
    fs.writeFileSync(temporaryFile, JSON.stringify(notes, null, 2), "utf8");
    fs.renameSync(temporaryFile, NOTES_FILE);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("note")
        .setDescription("Add a note to a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to add the note to")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("note")
                .setDescription("The staff note")
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction) {
        if (!interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)) {
            return interaction.reply({
                content: "❌ You cannot use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.options.getUser("user", true);
        const noteText = interaction.options.getString("note", true).trim();

        if (!noteText) {
            return interaction.reply({
                content: "❌ The note cannot be empty.",
                flags: MessageFlags.Ephemeral
            });
        }

        const notes = loadNotes();
        const note = {
            id: `${Date.now()}-${interaction.user.id}`,
            userId: user.id,
            userTag: user.tag,
            note: noteText,
            issuedById: interaction.user.id,
            issuedByTag: interaction.user.tag,
            timestamp: Date.now()
        };

        notes.push(note);
        saveNotes(notes);

        return interaction.reply({
            content: `✅ Note added for **${user.tag}**.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
