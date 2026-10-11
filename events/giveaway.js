const {
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");


const databasePath =
path.join(
    __dirname,
    "../database/giveaways.json"
);



function getDB(){

    if(!fs.existsSync(databasePath)){

        fs.writeFileSync(
            databasePath,
            "{}"
        );

    }

    return JSON.parse(
        fs.readFileSync(databasePath)
    );

}



function saveDB(data){

    fs.writeFileSync(
        databasePath,
        JSON.stringify(data,null,4)
    );

}



function chooseWinners(entries, amount){

    const shuffled =
    [...entries].sort(
        () => Math.random() - 0.5
    );


    return shuffled.slice(
        0,
        amount
    );

}



module.exports = {


name: "interactionCreate",


async execute(interaction, client){


    if(!interaction.isButton()) return;



    if(
        interaction.customId.startsWith(
            "giveaway_join_"
        )
    ){


        const giveawayID =
        interaction.customId.split("_")[2];



        const db =
        getDB();



        const giveaway =
        db[giveawayID];



        if(!giveaway){

            return interaction.reply({

                content:
                "This giveaway no longer exists.",

                flags:64

            });

        }



        if(
            giveaway.entries.includes(
                interaction.user.id
            )
        ){

            return interaction.reply({

                content:
                "You are already entered.",

                flags:64

            });

        }



        giveaway.entries.push(
            interaction.user.id
        );


        saveDB(db);



        return interaction.reply({

            content:
            "You have been entered into the giveaway!",

            flags:64

        });


    }

}

};
