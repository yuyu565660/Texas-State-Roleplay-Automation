const fs = require("fs");
const path = require("path");

const file = path.join(
    __dirname,
    "bans.json"
);


if (!fs.existsSync(file)) {

    fs.writeFileSync(
        file,
        JSON.stringify([], null, 4)
    );

}



function read() {

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );

}



function write(data) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



function addBan(data) {

    const bans = read();


    bans.push({

        userId: data.userId,

        username: data.username,

        moderator: data.moderator,

        moderatorId: data.moderatorId,

        reason: data.reason,

        time: Date.now(),

        active: true

    });


    write(bans);

}



function removeBan(userId) {

    const bans = read();


    const updated = bans.map(ban => {

        if (ban.userId === userId) {

            ban.active = false;

            ban.unbannedAt = Date.now();

        }

        return ban;

    });


    write(updated);

}



function getBans(userId) {

    const bans = read();


    return bans.filter(
        ban =>
        ban.userId === userId
    );

}



module.exports = {

    addBan,

    removeBan,

    getBans

};
