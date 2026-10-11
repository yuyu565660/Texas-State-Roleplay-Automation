const { SlashCommandBuilder } = require("discord.js");
module.exports = {
 data: new SlashCommandBuilder().setName("invite").setDescription("Get an invite link for this bot"),
 async execute(interaction) {
  const url="https://discord.com/oauth2/authorize?client_id="+interaction.client.user.id+"&scope=bot%20applications.commands";
  return interaction.reply({content:"[Invite this bot]("+url+")",ephemeral:true});
 }
};