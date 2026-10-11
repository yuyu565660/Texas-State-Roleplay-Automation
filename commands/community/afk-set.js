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





function getDB(){

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

.setName("afk-set")

.setDescription("Set yourself as AFK (Verified +)")

.addStringOption(option =>

    option

    .setName("reason")

    .setDescription("Reason you are AFK")

    .setRequired(true)

),







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







const reason =
interaction.options.getString(
    "reason"
);







const db =
getDB();







db[interaction.user.id] = {

    reason:
    reason,

    time:
    Math.floor(Date.now())

};







saveDB(db);







await interaction.reply({

    content:
    "You are now marked as AFK.",

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
/afk-set

**Used By:**
${interaction.user}

**User ID:**
${interaction.user.id}

**Reason:**
${reason}

**Action:**
Set AFK status

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
