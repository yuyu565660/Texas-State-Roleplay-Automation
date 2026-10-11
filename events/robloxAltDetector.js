const {
EmbedBuilder
} = require("discord.js");


const db =
require("../database/database");


const config =
require("../config.json");



async function getRobloxUser(id){

try{


const response =
await fetch(
`https://users.roblox.com/v1/users/${id}`
);



if(!response.ok)
return null;



return await response.json();



}catch(error){

console.log(
"Roblox API Error:",
error
);

return null;

}

}




module.exports = {


name:"ready",



async execute(client){



console.log(
"Roblox Alt Detector Online"
);



setInterval(async()=>{


try{


const response =
await fetch(
"https://api.erlc.gg/v2/server",
{

headers:{
"Server-Key":
config.serverKey
}

}
);



const server =
await response.json();



if(!server.JoinLogs)
return;




for(const join of server.JoinLogs){



if(!join.Join)
continue;



const info =
join.Player.split(":");



const username =
info[0];


const robloxId =
info[1];



const approved =
db.prepare(`
SELECT roblox_id
FROM approved_alts
WHERE roblox_id = ?
`).get(
robloxId
);



if(approved)
continue;



const user =
await getRobloxUser(
robloxId
);



if(!user)
continue;



const age =
Math.floor(
(
Date.now()
-
new Date(user.created).getTime()
)
/
86400000
);



if(age < 80){



const logChannel =
client.channels.cache.get(
"1528423871122772068"
);



if(logChannel){


logChannel.send({

embeds:[

new EmbedBuilder()

.setTitle(
"🚨 Roblox Alt Detected"
)

.setColor(
"Red"
)

.setDescription(
`Roblox Username:
**${username}**

Roblox ID:
\`${robloxId}\`

Account Age:
**${age} days**

Detection:
Account younger than 80 days`
)

.setTimestamp()

]

});


}



}



}



}catch(error){

console.log(
"Alt Detector Error:",
error
);


}



},30000);



}


};
