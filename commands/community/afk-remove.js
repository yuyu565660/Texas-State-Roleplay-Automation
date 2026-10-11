const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");



const databasePath =
path.join(
    __dirname,
    "../../database/afk.json"
);





function loadDB(){

    return JSON.parse(
        fs.readFileSync(databasePath)
    );

}





function saveDB(data){

    fs.writeFileSync(

        databasePath,

        JSON.stringify(
            data,
            null,
            4
        )

    );

}





module.exports = {



data: new SlashCommandBuilder()

.setName("afk-remove")

.setDescription("Remove your AFK status (Verified +)"),






async execute(interaction){





const allowedRole =
"1403586702546571397";





if(
!interaction.member.roles.cache.has(
    allowedRole
)
){

return interaction.reply({

    content:
    "You do not have permission to use this command.",

    flags:64

});

}





const db =
loadDB();





const afkData =
db[interaction.user.id];





if(!afkData){


return interaction.reply({

    content:
    "You are not currently AFK.",

    flags:64

});


}








let pingMessage =
"Nobody pinged you while you were AFK.";







if(
afkData.pings &&
afkData.pings.length > 0
){



pingMessage =

`Users who pinged you:

${afkData.pings.map(p =>

`<@${p.user}> - ${p.link} in <#${p.channel}>`

).join("\n")}`;


}







delete db[interaction.user.id];





saveDB(db);







await interaction.reply({

content:

`Your AFK status has been removed.

${pingMessage}`,

flags:64

});









// Command Usage Log

const logChannel =
interaction.guild.channels.cache.get(
    "1529614403639709696"
);




if(logChannel){



    const logEmbed =
    new EmbedBuilder()

    .setTitle(
        "Command Used"
    )

    .setColor(
        "#43E04E"
    )

    .setDescription(
`
**Command:**
/afk-remove

**Used By:**
${interaction.user}

**User ID:**
${interaction.user.id}

**Action:**
Removed AFK status

**Ping Count:**
${afkData.pings?.length || 0}

**Channel:**
${interaction.channel}

**Time:**
<t:${Math.floor(Date.now() / 1000)}:F>
`
    )

    .setFooter({

        text:
        "Texas State Roleplay Logs"

    })

    .setTimestamp();





    await logChannel.send({

        embeds:[
            logEmbed
        ]

    });


}




}

};
