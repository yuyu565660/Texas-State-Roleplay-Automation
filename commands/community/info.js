const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
 data: new SlashCommandBuilder().setName("info").setDescription("Show information about this bot"),
 async execute(interaction) {
  const c=interaction.client;
  const uptime=c.uptime||0;
  const embed=new EmbedBuilder().setColor("#D4AF37").setTitle(c.user.username).setThumbnail(c.user.displayAvatarURL({size:512}))
   .setDescription("Texas State Roleplay's management and community bot.")
   .addFields({name:"Servers",value:String(c.guilds.cache.size),inline:true},{name:"Commands",value:String(c.commands.size),inline:true},{name:"Uptime",value:Math.floor(uptime/86400000)+"d "+Math.floor(uptime%86400000/3600000)+"h "+Math.floor(uptime%3600000/60000)+"m",inline:true})
   .setFooter({text:"Texas State Roleplay"});
  return interaction.reply({embeds:[embed]});
 }
};