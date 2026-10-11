const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
 data: new SlashCommandBuilder().setName("avatar").setDescription("Show a member's avatar")
  .addUserOption(o=>o.setName("user").setDescription("Member to view")),
 async execute(interaction) {
  const user = interaction.options.getUser("user") || interaction.user;
  const embed = new EmbedBuilder().setColor("#D4AF37").setTitle(user.username + "'s avatar")
   .setImage(user.displayAvatarURL({ size: 1024, extension: "png" }))
   .setDescription("[Open full-size avatar](" + user.displayAvatarURL({ size: 1024, extension: "png" }) + ")");
  return interaction.reply({ embeds:[embed] });
 }
};