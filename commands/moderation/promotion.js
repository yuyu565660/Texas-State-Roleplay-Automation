const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const REQUIRED_PROMOTE_ROLE = "1403586703515582477";
const VOID_PERMISSION_ROLES = new Set([
  "1526415142408163430",
  "1403586703612186672",
  "1403586703716777984",
  "1403586703716777985",
  "1403586703716777988"
]);

const RANKS = [
  ["Junior Moderator","1403586703243083916"],["Senior Moderator","1522708224300683274"],["Head Moderator","1522708285466349618"],["Lead Moderator","1403586703612183917"],
  ["Trial Administrator","1522880646714757211"],["Junior Administrator","1403586703243083920"],["Senior Administrator","1403586703243083921"],["Head Administrator","1522880704793284759"],["Lead Administrator","1522880716197859388"],
  ["Trial Internal Affairs","1524812476074561771"],["Junior Internal Affairs","1526411315432652981"],["Senior Internal Affairs","1403586703381237971"],["Head Internal Affairs","1526411531040985128"],["Lead Internal Affairs","1526411586850263070"]
].map(([name,roleId])=>({name,roleId}));

const EXTRA_ROLES = {
  "1522880646714757211":["1403586703243083918","1403586703243083919","1403586702546571402"],
  "1403586703243083920":["1403586703243083918","1403586703243083919","1403586702546571402"],
  "1403586703243083921":["1403586703243083918","1403586703243083919","1403586702546571402"],
  "1522880704793284759":["1403586703243083918","1403586703243083919","1403586702546571402"],
  "1522880716197859388":["1403586703243083918","1403586703243083919","1403586702546571402"],
  "1524812476074561771":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586702546571402"],
  "1526411315432652981":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586702546571402"],
  "1403586703381237971":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586702546571402"],
  "1526411531040985128":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586702546571402"],
  "1526411586850263070":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586702546571402"],
  "1522707386916409354":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"],
  "1403586703515582478":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"],
  "1403586703515582479":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"],
  "1403586703515582480":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"],
  "1403586703515582481":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"],
  "1534335606337831093":["1403586703243083919","1403586703243083922","1403586703381237966","1403586703381237968","1403586703381237969","1403586703515582476","1403586703515582477","1403586702546571402"]
};

function highest(member){let i=-1;for(let n=0;n<RANKS.length;n++)if(member.roles.cache.has(RANKS[n].roleId))i=n;return i;}

function hasVoidPermission(member){
  return member?.roles?.cache?.some(role => VOID_PERMISSION_ROLES.has(role.id));
}

function voidButtons(){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("promotion_void_confirm").setLabel("Confirm Void").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("promotion_void_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
  );
}

function disabledVoidButton(label){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("promotion_void_done").setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(true)
  );
}

function attachVoidHandler(message, targetId, roleId, highRank = false){
  const collector = message.createMessageComponentCollector({
    time: 7 * 24 * 60 * 60 * 1000,
    filter: i => i.isButton() && ["promotion_void","promotion_void_confirm","promotion_void_cancel"].includes(i.customId)
  });

  collector.on("collect", async interaction => {
    if (!hasVoidPermission(interaction.member)) {
      return interaction.reply({content:"You do not have permission to void promotions.",flags:MessageFlags.Ephemeral});
    }

    if (interaction.customId === "promotion_void") {
      return interaction.update({components:[voidButtons()]});
    }

    if (interaction.customId === "promotion_void_cancel") {
      return interaction.update({
        components:[new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("promotion_void").setLabel("Void Promotion").setStyle(ButtonStyle.Danger)
        )]
      });
    }

    if (interaction.customId !== "promotion_void_confirm") return;

    const currentEmbed = message.embeds?.[0];
    if (!currentEmbed) return interaction.reply({content:"The promotion embed could not be found.",flags:MessageFlags.Ephemeral});
    if (currentEmbed.footer?.text?.startsWith("Voided by:")) return interaction.reply({content:"This promotion has already been voided.",flags:MessageFlags.Ephemeral});

    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) return interaction.reply({content:"The promoted user is no longer in the server.",flags:MessageFlags.Ephemeral});

    const role = interaction.guild.roles.cache.get(roleId);
    const bot = interaction.guild.members.me;
    if (role && member.roles.cache.has(roleId)) {
      if (!bot || role.position >= bot.roles.highest.position) {
        return interaction.reply({content:"I cannot remove the promotion role because of the bot role hierarchy.",flags:MessageFlags.Ephemeral});
      }
      try {
        await member.roles.remove(role, `Promotion voided by ${interaction.user.tag}`);
      } catch(error) {
        console.error("Promotion void role removal error:",error);
        return interaction.reply({content:"I could not remove the promotion role.",flags:MessageFlags.Ephemeral});
      }
    }

    const voidedEmbed = new EmbedBuilder(currentEmbed.toJSON())
      .setFooter({text:`Voided by: ${interaction.user.tag}`});

    // Explicitly retain every existing attachment so attachment:// logos/images
    // referenced by the embed remain inside the embed after the edit.
    const attachments = message.attachments.map(attachment => ({
      id: attachment.id,
      filename: attachment.name
    }));

    await interaction.update({
      embeds:[voidedEmbed],
      components:[disabledVoidButton("Promotion Voided")],
      attachments
    });

    collector.stop("voided");
  });
}

module.exports={
 data:new SlashCommandBuilder().setName("promote").setDescription("Promote a staff member")
  .addUserOption(o=>o.setName("user").setDescription("User to promote").setRequired(true))
  .addStringOption(o=>o.setName("rank").setDescription("New rank").setRequired(true).addChoices(...RANKS.map(r=>({name:r.name,value:r.roleId}))))
  .addStringOption(o=>o.setName("reason").setDescription("Reason for the promotion").setRequired(true))
  .addStringOption(o=>o.setName("notes").setDescription("Additional notes").setRequired(false)),
 async execute(interaction){
  try{
   if(!interaction.guild)return interaction.reply({content:"This command can only be used inside a server.",flags:MessageFlags.Ephemeral});
   if(!interaction.member.roles.cache.has(REQUIRED_PROMOTE_ROLE))return interaction.reply({content:"You do not have permission to use the `/promote` command.",flags:MessageFlags.Ephemeral});
   const user=interaction.options.getUser("user"),roleId=interaction.options.getString("rank"),reason=interaction.options.getString("reason"),notes=interaction.options.getString("notes")||"None";
   if(user.id===interaction.user.id)return interaction.reply({content:"You cannot promote yourself.",flags:MessageFlags.Ephemeral});
   const target=await interaction.guild.members.fetch(user.id).catch(()=>null);
   if(!target)return interaction.reply({content:"That user is not in the server.",flags:MessageFlags.Ephemeral});
   const selected=RANKS.findIndex(r=>r.roleId===roleId);
   if(selected<0)return interaction.reply({content:"That is not a valid promotion rank.",flags:MessageFlags.Ephemeral});
   const current=highest(target);
   if(current!==-1&&selected<=current)return interaction.reply({content:`You can only promote someone to a rank higher than their current rank.\n\nCurrent Rank: **${RANKS[current].name}**\nSelected Rank: **${RANKS[selected].name}**`,flags:MessageFlags.Ephemeral});
   const bot=interaction.guild.members.me,role=interaction.guild.roles.cache.get(roleId);
   if(!bot||!role)return interaction.reply({content:"I could not verify the promotion role or bot permissions.",flags:MessageFlags.Ephemeral});
   if(role.position>=bot.roles.highest.position)return interaction.reply({content:"I cannot give that role because my bot's highest role must be above it.",flags:MessageFlags.Ephemeral});
   if(target.roles.highest.position>=bot.roles.highest.position)return interaction.reply({content:"I cannot manage this user because their highest role is equal to or higher than my bot's role.",flags:MessageFlags.Ephemeral});
   for(const r of RANKS){if(r.roleId!==roleId&&target.roles.cache.has(r.roleId)){const old=interaction.guild.roles.cache.get(r.roleId);if(old&&old.position<bot.roles.highest.position)await target.roles.remove(old).catch(()=>{});}}
   await target.roles.add(role,`Promotion to ${RANKS[selected].name} by ${interaction.user.tag}`);
   const added=[];for(const id of EXTRA_ROLES[roleId]||[]){const r=interaction.guild.roles.cache.get(id);if(r&&r.position<bot.roles.highest.position){await target.roles.add(r).catch(()=>{});added.push(r);}}
   const previous=current===-1?"No current staff rank":RANKS[current].name;
   const embed=new EmbedBuilder().setTitle("Staff Promotion").setColor("#43E04E").setDescription(`Congratulations ${target}!\n\nYou have been promoted to **${RANKS[selected].name}**.\n\n**Reason:** ${reason}           **Additional Notes:** ${notes}\n\n**Promoted By:** **${interaction.user}**                        **Previous Rank:** ${previous}\n\n**New Rank:** ${RANKS[selected].name}                  **Automatic Roles Added:** ${added.length?added.map(r=>r.toString()).join(" "):"None"}`).setTimestamp();
   const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("promotion_void").setLabel("Void Promotion").setStyle(ButtonStyle.Danger));
   const message=await interaction.channel.send({embeds:[embed],components:[row]});
   attachVoidHandler(message,target.id,roleId,false);
   return interaction.reply({content:`Successfully promoted ${target} to **${RANKS[selected].name}**.`,flags:MessageFlags.Ephemeral});
  }catch(error){console.error("Promotion error:",error);if(interaction.replied||interaction.deferred)return interaction.editReply({content:"An error occurred while processing the promotion."});return interaction.reply({content:"An error occurred while processing the promotion.",flags:MessageFlags.Ephemeral});}
 }
};
