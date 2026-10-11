const {
    SlashCommandBuilder
} = require("discord.js");


module.exports = {

    data: new SlashCommandBuilder()

        .setName("ticket-remove")

        .setDescription("Remove a user from the current ticket")

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to remove from the ticket")
                .setRequired(true)
        ),



    async execute(interaction) {


        const allowedRole =
        "1529920867545518100";



        if (
            !interaction.member.roles.cache.has(
                allowedRole
            )
        ) {

            return interaction.reply({

                content:
                " You do not have permission to use this command.",

                flags: 64

            });

        }



        if (
            !interaction.channel.name.startsWith("ticket-")
        ) {

            return interaction.reply({

                content:
                " This command can only be used inside a ticket.",

                flags: 64

            });

        }



        const user =
        interaction.options.getUser("user");



        await interaction.channel.permissionOverwrites.edit(
            user.id,
            {
                ViewChannel: false,
                SendMessages: false
            }
        );



        await interaction.reply({

            content:
            ` Removed ${user} from this ticket.`

        });


    }

};
