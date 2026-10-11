const { SlashCommandBuilder } = require("discord.js");
const reviewSuggestion = require("../../utils/mrPollSuggestionReview");
module.exports = {
 data: new SlashCommandBuilder().setName("deny").setDescription("Deny a pending suggestion")
  .addStringOption(o=>o.setName("message_id").setDescription("Message ID of the suggestion").setRequired(true))
  .addStringOption(o=>o.setName("reason").setDescription("Reason for the decision").setRequired(true).setMaxLength(1000)),
 async execute(interaction) { return reviewSuggestion(interaction, "denied"); }
};