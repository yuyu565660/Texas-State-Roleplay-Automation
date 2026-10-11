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

function getDB() {
    try {
        if (!fs.existsSync(databasePath)) {
            return {};
        }

        return JSON.parse(
            fs.readFileSync(
                databasePath,
                "utf8"
            )
        );
    } catch (error) {
        console.error(
            "Could not read giveaways database:"
        );

        console.error(error);

        return {};
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(
            databasePath,
            JSON.stringify(
                data,
                null,
                4
            )
        );
    } catch (error) {
        console.error(
            "Could not save giveaways database:"
        );

        console.error(error);
    }
}

function chooseWinners(
    entries,
    amount
) {
    if (!Array.isArray(entries)) {
        return [];
    }

    return [...entries]
        .sort(
            () =>
                Math.random() - 0.5
        )
        .slice(
            0,
            amount
        );
}

async function checkGiveaways() {
    const db = getDB();

    for (const id in db) {
        try {
            const giveaway = db[id];

            if (!giveaway) {
                delete db[id];
                continue;
            }

            if (
                Date.now() <
                giveaway.endTime
            ) {
                continue;
            }

            const channel =
                await globalThis.discordClient
                    .channels
                    .fetch(
                        giveaway.channelId
                    )
                    .catch(
                        () => null
                    );

            if (!channel) {
                delete db[id];
                saveDB(db);
                continue;
            }

            const message =
                await channel.messages
                    .fetch(
                        giveaway.messageId
                    )
                    .catch(
                        () => null
                    );

            if (!message) {
                delete db[id];
                saveDB(db);
                continue;
            }

            const winners =
                chooseWinners(
                    giveaway.entries,
                    giveaway.winners || 1
                );

            const winnerText =
                winners.length > 0
                    ? winners
                        .map(
                            userId =>
                                `<@${userId}>`
                        )
                        .join(", ")
                    : "No winners";

            const embed =
                new EmbedBuilder()
                    .setColor("#D4AF37")
                    .setTitle(
                        "Giveaway Ended!"
                    )
                    .setDescription(
                        `**Prize:**

${giveaway.prize || "Unknown"}

**Winner:**

${winnerText}

━━━━━━━━━━━━━━━━━━

Congratulations ${winnerText} for winning the giveaway!

To claim your reward, please create a Board of Directors ticket.

Thank you to everyone who participated!`
                    )
                    .setTimestamp();

            await message.edit({
                embeds: [embed],
                components: []
            });

            delete db[id];

            saveDB(db);

        } catch (error) {
            console.error(
                `Giveaway ${id} Error:`
            );

            console.error(error);
        }
    }
}

module.exports = function startGiveawayEnd(client) {
    console.log(
        "Giveaway End Monitor Started"
    );

    globalThis.discordClient = client;

    checkGiveaways();

    setInterval(() => {
        checkGiveaways();
    }, 10000);
};
