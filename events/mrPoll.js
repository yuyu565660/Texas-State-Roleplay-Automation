const { EmbedBuilder } = require("discord.js");
const pollCommand = require("../commands/community/poll");

module.exports = {
    async execute(interaction) {
        const match = /^mrpoll_vote_(\d+)_(\d+)$/.exec(interaction.customId || "");
        if (!match) return;
        const [, messageId, optionText] = match;
        const optionIndex = Number(optionText);
        const db = pollCommand.readDB();
        const record = db[messageId];

        if (!record || record.guildId !== interaction.guildId) {
            return interaction.reply({ content: "This poll is no longer available.", ephemeral: true });
        }
        if (record.ended || (record.endsAt && Date.now() >= record.endsAt)) {
            record.ended = true;
            record.endedAt = record.endedAt || Date.now();
            db[messageId] = record;
            pollCommand.writeDB(db);
            return interaction.reply({ content: "This poll has ended.", ephemeral: true });
        }
        if (optionIndex < 0 || optionIndex >= record.options.length) {
            return interaction.reply({ content: "That poll choice is invalid.", ephemeral: true });
        }

        record.votes = Array.isArray(record.votes) ? record.votes : record.options.map(() => []);
        while (record.votes.length < record.options.length) record.votes.push([]);
        for (const voters of record.votes) {
            const idx = voters.indexOf(interaction.user.id);
            if (idx !== -1) voters.splice(idx, 1);
        }
        record.votes[optionIndex].push(interaction.user.id);

        const embed = EmbedBuilder.from(interaction.message.embeds[0] || new EmbedBuilder().setTitle("Poll"));
        try {
            await interaction.update({ embeds: [embed], components: pollCommand.makeButtons(record) });
            db[messageId] = record;
            pollCommand.writeDB(db);
        } catch (error) {
            console.error("[MR POLL] Vote update failed:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "I couldn't save that vote. Please try again.", ephemeral: true }).catch(() => {});
            }
        }
    }
};
