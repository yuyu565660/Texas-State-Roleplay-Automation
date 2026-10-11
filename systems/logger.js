const config = require('../config.json');

async function sendLog(client, type, embed) {

    let channelID;

    switch(type) {

        case "session":
            channelID = config.channels.sessionLogs;
            break;

        case "infraction":
            channelID = config.channels.infractionLogs;
            break;

        case "promotion":
            channelID = config.channels.promotionLogs;
            break;

        case "training":
            channelID = config.channels.trainingResults;
            break;

        default:
            return;
    }

    const channel = client.channels.cache.get(channelID);

    if (!channel) {
        console.log(`Missing log channel: ${channelID}`);
        return;
    }

    await channel.send({
        embeds: [embed]
    });
}

module.exports = {
    sendLog
};
