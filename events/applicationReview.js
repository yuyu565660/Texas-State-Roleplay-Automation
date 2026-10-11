const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const config = require("../config.json");


const databasePath = path.join(
    __dirname,
    "../database/applications.json"
);


const iaDatabasePath = path.join(
    __dirname,
    "../database/internal-affairs.json"
);



function getDB(file){

    return JSON.parse(
        fs.readFileSync(file)
    );

}


function saveDB(file,data){

    fs.writeFileSync(
        file,
        JSON.stringify(data,null,4)
    );

}



module.exports = {


async execute(interaction){



// ==========================
// ACCEPT / DENY BUTTON
// ==========================

if(
interaction.isButton() &&
(
interaction.customId.startsWith("accept_") ||
interaction.customId.startsWith("deny_")
)
){


if(
!interaction.member.roles.cache.has(
config.application.reviewRole
)
){

return interaction.reply({

content:
"You cannot review applications.",

ephemeral:true

});

}



const modal = new ModalBuilder()

.setCustomId(
interaction.customId
)

.setTitle(
"Application Decision Reason"
);



const reason = new TextInputBuilder()

.setCustomId(
"reason"
)

.setLabel(
"Reason for this decision"
)

.setStyle(
TextInputStyle.Paragraph
)

.setRequired(true);



modal.addComponents(

new ActionRowBuilder()
.addComponents(reason)

);



return interaction.showModal(modal);


}





// ==========================
// MODAL SUBMIT
// ==========================


if(
interaction.isModalSubmit()
){


if(
!interaction.customId.startsWith("accept_") &&
!interaction.customId.startsWith("deny_")
){

return;

}



const userId =
interaction.customId.split("_")[1];



const accepted =
interaction.customId.startsWith("accept_");



const reason =
interaction.fields.getTextInputValue(
"reason"
);



let db =
getDB(databasePath);



let iaDB =
getDB(iaDatabasePath);



let application =
db[userId];



let isIA =
iaDB[userId] !== undefined;



if(isIA){

application =
iaDB[userId];

}



if(!application){


return interaction.reply({

content:
"Application data not found.",

ephemeral:true

});

}




const user =
await interaction.client.users.fetch(
userId
);




const embed =
new EmbedBuilder()

.setColor(
accepted
?
"#43E04E"
:
"#43E04E"
)

.setTitle(
accepted
?
"Application Accepted"
:
"Application Denied"
)

.setDescription(
`Applicant:
<@${userId}>

Reviewed By:
${interaction.user}

Reason:
${reason}

Date:
<t:${Math.floor(Date.now()/1000)}:F>`
);




if(application.answers){

application.answers.forEach(
(answer,index)=>{

embed.addFields({

name:
`Question ${index + 1}: ${answer.question}`,

value:
answer.answer.slice(0,1024) || "No answer provided"

});

});

}




// ==========================
// SEND RESULT LOG
// ==========================


const resultChannel =
await interaction.client.channels.fetch(

isIA

?
(
accepted
?
config.internalAffairs.acceptedLogs
:
config.internalAffairs.deniedLogs
)

:

(
accepted
?
config.application.acceptedLogs
:
config.application.deniedLogs
)

);



await resultChannel.send({

embeds:[
embed
]

});





// ==========================
// REMOVE FROM PENDING CHANNEL
// ==========================


try{


const pendingChannel =
await interaction.client.channels.fetch(

isIA
?
config.internalAffairs.pendingLogs
:
config.application.reviewChannel

);



if(application.messageId){


const pendingMessage =
await pendingChannel.messages.fetch(
application.messageId
);


await pendingMessage.delete();


}



}catch(error){

console.log(
"Pending message delete error:",
error.message
);

}





// ==========================
// GIVE ROLE IF ACCEPTED
// ==========================


if(accepted){


try{


const member =
await interaction.guild.members.fetch(
userId
);



await member.roles.add(

isIA

?
config.internalAffairs.acceptedRole

:
config.application.acceptedRole

);


}catch(error){

console.log(
"Role Error:",
error.message
);

}


}





// ==========================
// DM USER
// ==========================


await user.send({

embeds:[

new EmbedBuilder()

.setColor(
accepted
?
"#43E04E"
:
"#43E04E"
)

.setTitle(

accepted

?
(
isIA
?
"Internal Affairs Application Accepted"
:
"Welcome to the Team!"
)

:

(
isIA
?
"Internal Affairs Application Denied"
:
"Application Denied"
)

)

.setDescription(

`Your application has been ${
accepted ? "accepted" : "denied"
}.

Reviewed By:
${interaction.user}

Reason:
${reason}`

)

]

}).catch(()=>{});




// ==========================
// DELETE DATABASE ENTRY
// ==========================


if(isIA){

delete iaDB[userId];

saveDB(
iaDatabasePath,
iaDB
);


}else{


delete db[userId];

saveDB(
databasePath,
db
);


}





await interaction.reply({

content:
"Application decision completed successfully.",

ephemeral:true

});


}


}


};
