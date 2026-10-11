const {
    EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require("discord.js");
const suggestionCommand = require("../commands/community/suggestion");
const fs = require("fs");
const path = require("path");

const FALLBACK_CHANNEL = "1403638078660280451";
const LOG_CHANNEL = "1529614403639709696";
const VERIFIED_ROLE = "1403586702546571397";
const BLACKLIST_ROLE = "1535793077862535168";
const dbPath = path.join(__dirname, "../database/suggestions.json");

function readDB() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, "utf8") || "{}");
    } catch { return {}; }
}
function saveDB(db) {
    try {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        const tmp = dbPath + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(db, null, 4), "utf8");
        fs.renameSync(tmp, dbPath);
    } catch (error) { console.error("[MR POLL] Suggestion save failed:", error); }
}

module.exports = {
    async execute(interaction) {
        if (interaction.isButton() && interaction.customId === "mrpoll_suggestion_open") {
            const modal = new ModalBuilder().setCustomId("mrpoll_suggestion_submit").setTitle("Submit a suggestion")
                .addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("suggestion_title").setLabel("Title (optional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("suggestion_description").setLabel("Suggestion").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(3500))
                );
            return interaction.showModal(modal);
        }
        if (!interaction.isModalSubmit() || interaction.customId !== "mrpoll_suggestion_submit") return;
        if (interaction.member?.roles?.cache?.has(BLACKLIST_ROLE)) return interaction.reply({ content: "You are currently blacklisted from submitting suggestions.", ephemeral: true });
        if (!interaction.member?.roles?.cache?.has(VERIFIED_ROLE)) return interaction.reply({ content: "You need to be verified before submitting a suggestion.", ephemeral: true });

        const title = interaction.fields.getTextInputValue("suggestion_title").trim();
        const description = interaction.fields.getTextInputValue("suggestion_description").trim();
        if (!description) return interaction.reply({ content: "Please enter a suggestion.", ephemeral: true });
        const settings = suggestionCommand.guildSettings(interaction.guildId);
        const channelId = settings.pendingChannel || FALLBACK_CHANNEL;
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel?.isTextBased() || !channel.messages) return interaction.reply({ content: "I couldn't access the configured suggestions channel. Ask a server manager to check /suggestion settings.", ephemeral: true });

        const submittedAt = Math.floor(Date.now() / 1000);
        const submitter = settings.anonymousSubmitter ? "Anonymous" : "<@" + interaction.user.id + ">";
        const embed = new EmbedBuilder().setColor("#D4AF37").setTitle(title || "New Suggestion")
            .setDescription("**Submitted By**\n" + submitter + "\n\n**Suggestion**\n" + description + "\n\n**Submitted At**\n<t:" + submittedAt + ":F>\n\nThis suggestion is pending review.")
            .setFooter({ text: "Texas State Roleplay Suggestions" }).setTimestamp();
        const message = await channel.send({ embeds: [embed] });
        const buttonComponents = [
            new ButtonBuilder().setCustomId("suggest_up_" + message.id).setLabel("Agree: 0").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("suggest_down_" + message.id).setLabel("Disagree: 0").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("suggest_accept_" + message.id).setLabel("Accept").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("suggest_deny_" + message.id).setLabel("Deny").setStyle(ButtonStyle.Secondary)
        ];
        if (settings.anonymousVotes) buttonComponents.push(new ButtonBuilder().setCustomId("suggest_voters_" + message.id).setLabel("View Voters").setStyle(ButtonStyle.Secondary));
        const row = new ActionRowBuilder().addComponents(buttonComponents);
        await message.edit({ components: [row] });
        const db = readDB();
        db[message.id] = { upvotes: [], downvotes: [], decision: null, reviewedById: null, submitterId: interaction.user.id, anonymousSubmitter: Boolean(settings.anonymousSubmitter) };
        saveDB(db);
        if (settings.createThreads !== false) {
            await message.startThread({ name: "Suggestion discussion - " + (title || description).slice(0, 70), autoArchiveDuration: 10080 }).catch(() => {});
        }
        await interaction.reply({ content: "Your suggestion has been submitted.", ephemeral: true });
        const log = await interaction.guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (log?.isTextBased()) {
            await log.send({ embeds: [new EmbedBuilder().setColor("#D4AF37").setTitle("Suggestion Submitted")
                .setDescription("**Submitted by:** " + (settings.anonymousSubmitter ? "Anonymous" : interaction.user.toString()) + "\n**Suggestion:** " + description.slice(0, 2500) + "\n**Destination:** " + channel)
                .setTimestamp()] }).catch(() => {});
        }
    }
};
