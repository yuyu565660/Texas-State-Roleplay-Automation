const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
 data: new SlashCommandBuilder().setName("help").setDescription("Show the bot's community commands"),
 async execute(interaction) {
  const embed=new EmbedBuilder().setColor("#D4AF37").setTitle("Texas State Roleplay Bot — Help")
   .setDescription("Community commands available alongside the existing Texas State Roleplay systems.")
   .addFields(
    {name:"Polls",value:"/poll normal — yes/no poll\n/poll strawpoll — multiple-choice poll\n/poll thread — poll with discussion thread\n/poll list — list active polls\n/poll end — end a poll",inline:false},
    {name:"Suggestions",value:"/suggest — submit a suggestion\n/suggestion — configure suggestion channels and options",inline:false},
    {name:"Utility",value:"/avatar, /serverinfo, /userinfo, /info, /stats, /ping",inline:false},
    {name:"Search and choices",value:"/pick, /google, /youtube",inline:false}
   ).setFooter({text:"Use /help to see this list again."});
  return interaction.reply({embeds:[embed],ephemeral:true});
 }
};