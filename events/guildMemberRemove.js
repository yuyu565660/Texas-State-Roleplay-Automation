const REP_ROLE_ID = "1537655738212683846";
const REP_ALERT_ROLE_ID = "1403586703515582477";
const REP_ALERT_CHANNEL_ID = "1543642610386604152";
const PARTNERSHIP_CHANNEL_ID = "1403586706543874152";

module.exports = {
    name: "guildMemberRemove",
    once: false,

    async execute(member) {
        if (!member?.guild) return;
        if (!member.roles?.cache?.has(REP_ROLE_ID)) return;

        const channel = await member.guild.channels.fetch(REP_ALERT_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        await channel.send({
            content: `<@&${REP_ALERT_ROLE_ID}> <@${member.user.id}> has left the server and was a rep. Please delete their ad in <#${PARTNERSHIP_CHANNEL_ID}>.`,
            allowedMentions: {
                roles: [REP_ALERT_ROLE_ID],
                users: [member.user.id]
            }
        });
    }
};
