const {
SlashCommandBuilder,
PermissionFlagsBits
}=require("discord.js");


module.exports={


data:new SlashCommandBuilder()

.setName("ticket-add")

.setDescription("Add a user to the ticket")

.addUserOption(option=>

option
.setName("user")
.setDescription("User to add")
.setRequired(true)

),



async execute(interaction){


if(!interaction.member.roles.cache.has("1529920867545518100")){

return interaction.reply({
content:" No permission.",
flags:64
});

}



const user =
interaction.options.getUser("user");


await interaction.channel.permissionOverwrites.create(
user.id,
{
ViewChannel:true,
SendMessages:true
});


interaction.reply({

content:
` Added ${user} to this ticket.`

});


}

};
