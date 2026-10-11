require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const config = require("./config.json");


const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);



async function resetCommands() {

    try {

        console.log("Removing guild commands...");


        // Remove server (guild) slash commands
        await rest.put(

            Routes.applicationGuildCommands(

                config.clientId,

                config.guildId

            ),

            {
                body: []
            }

        );


        console.log(
            "✅ Guild commands removed."
        );



        console.log("Removing global commands...");


        // Remove global slash commands
        await rest.put(

            Routes.applicationCommands(

                config.clientId

            ),

            {
                body: []
            }

        );


        console.log(
            "✅ Global commands removed."
        );



        console.log(
            "✅ All slash commands have been reset."
        );


    } catch(error) {


        console.error(
            "❌ Failed resetting commands:"
        );

        console.error(error);


    }

}



resetCommands();
