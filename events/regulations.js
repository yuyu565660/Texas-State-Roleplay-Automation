const {
    EmbedBuilder
} = require("discord.js");


module.exports = {


async execute(interaction){


if(!interaction.isButton()) return;



/*
==========================
DISCORD REGULATIONS
==========================
*/


if(
interaction.customId === "discord_regulations"
){


const embed = new EmbedBuilder()

.setColor("#5865F2")

.setTitle(
"Texas State Roleplay | Discord Rules"
)

.setDescription(
`## Respect Everyone

Treat all members with respect. Harassment, discrimination, threats, or personal attacks are not tolerated.

## No Spamming

Do not spam messages, emojis, GIFs, images, reactions, or commands.

## No NSFW Content

NSFW or inappropriate content is strictly prohibited.

## Appropriate Language

Keep conversations professional. Offensive language, slurs, or excessive profanity are not allowed.

## Roblox Username

Your Discord nickname must match your Roblox username.

## Toxicity

Bullying, harassment, threats, or unnecessary drama will not be tolerated.

## Mentions

Do not abuse @everyone, @here, or role mentions.

## Advertising

Advertising other communities without permission is prohibited.

## Alternate Accounts

Do not use alternate accounts to evade punishments.

## Staff Respect

Follow staff instructions and use the correct appeal process.

## Privacy

Do not share personal information.

## Impersonation

Do not impersonate staff or community members.

## Community Rules

Members must follow:

## Brainrot 

Do not do any brain rots in the server or in game.

• Discord Terms of Service
• Discord Community Guidelines
• PRC Community Guidelines
• Texas State Roleplay Rules`
);



return interaction.reply({

embeds:[
embed
],

ephemeral:true

});


}





/*
==========================
IN-GAME REGULATIONS
==========================
*/


if(
interaction.customId === "ingame_regulations"
){


const embed = new EmbedBuilder()

.setColor("#00A86B")

.setTitle(
"Texas State Roleplay | In-Game Rules"
)

.setDescription(
`## RDM

Random Deathmatch is not allowed.

## VDM

Using vehicles to intentionally harm players is not allowed.

## FRP

Fail Roleplay and unrealistic actions are prohibited.

## NLR

Players must forget previous situations after respawning.

## FearRP

Players must value their character's life.

## GTA Driving

Unrealistic driving is not allowed.

## Combat Logging

Leaving to avoid roleplay or moderation is prohibited.

## Scene Interference

Do not interfere with active roleplay scenes.

## Exploiting

Using glitches, exploits, or unauthorized software is prohibited.

## Staff Instructions

Staff instructions must be followed.

## Roblox & PRC Rules

All players must follow Roblox Terms of Service, PRC Community Guidelines, and Texas State Roleplay rules.`
);



return interaction.reply({

embeds:[
embed
],

ephemeral:true

});


}





/*
==========================
RESTRICTED ITEMS
==========================
*/


if(
interaction.customId === "restricted_items"
){


const embed = new EmbedBuilder()

.setColor("#FF0000")

.setTitle(
"Texas State Roleplay | Restricted & Banned Items"
)

.setDescription(
`## Vehicles

### Booster Vehicles

• 2021 Falcon Heritage
• 2022 Falcon Heritage Track
• 2022 Stuttgart Landschaft
• 2013 Navara Horizon
• 2023 Chevlon Corbeta 8

### Banned Vehicles

• 2020 Strugatti Ettore
• 2023 Kovac Heladera
• Pea Car
• SWAT Truck (Unless authorized)
• Mobile Command Center (Unless authorized)


━━━━━━━━━━━━━━━━━━


## Weapons

### Booster Weapons

• Remington 870
• Colt Python
• M249


### Banned Weapons

• Remington MSR
• TEC-9
• Desert Eagle


━━━━━━━━━━━━━━━━━━


## Banned Roleplays

• Animal Abuse Roleplay
• Bomb Threat Roleplay
• Drug Roleplay
• NSFW Roleplay
• Terrorism Roleplay
• Torture Roleplay
• Mass Casualty Roleplay

Anything violating Roblox Terms of Service or PRC Community Guidelines is prohibited.`
);



return interaction.reply({

embeds:[
embed
],

ephemeral:true

});


}


}


};
