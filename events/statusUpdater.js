const { ActivityType } = require("discord.js");
const config = require("../config.json");
const fs = require("fs");
const path = require("path");

const statusFile = path.join(__dirname, "../database/botStatus.json");


module.exports = {

    name: "clientReady",

    once: true,


    async execute(client) {


        let currentType = "custom";
        let customStatus = "Texas State Roleplay";

        try {
            if (fs.existsSync(statusFile)) {
                const saved = JSON.parse(fs.readFileSync(statusFile, "utf8"));
                if (saved.type) currentType = saved.type;
                if (saved.message) customStatus = saved.message;
            }
        } catch (error) {
            console.log("Could not load saved bot status:", error.message);
        }


        async function updateStatus() {


            let status = "";



            if(currentType === "erlc") {


                try {


                    const response =
                    await fetch(
                        "https://api.erlc.gg/v2/server",
                        {
                            headers:{
                                "server-key":
                                config.serverKey
                            }
                        }
                    );


                    const data =
                    await response.json();


                    status =
                    `${data.CurrentPlayers ?? 0}/50 players in-game`;


                } catch {


                    status =
                    "ERLC Offline";


                }


            }



            if(currentType === "discord") {


                await client.guilds.cache.first().members.fetch();


                status =
                `${client.guilds.cache.first().memberCount} Discord members`;


            }



            if(currentType === "custom") {


                status =
                customStatus;


            }




            client.user.setPresence({

                activities:[

                    {

                        name:
                        status,

                        type:
                        ActivityType.Watching

                    }

                ],

                status:
                "online"

            });


        }





        client.statusSettings = {

            setType(type, message){


                currentType = type;


                if(message){

                    customStatus = message;

                }

                try {
                    fs.mkdirSync(path.dirname(statusFile), { recursive: true });
                    fs.writeFileSync(
                        statusFile,
                        JSON.stringify({ type, message: message || customStatus }, null, 4)
                    );
                } catch (error) {
                    console.log("Could not save bot status:", error.message);
                }

                updateStatus();


            }

        };



        updateStatus();


        setInterval(updateStatus, 60000);


        console.log(
            " Status updater started"
        );


    }

};
