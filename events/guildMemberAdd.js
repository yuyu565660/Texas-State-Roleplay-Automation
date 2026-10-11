const fs = require("fs");

const BLACKLIST_FILE =
"./data/blacklists.json";

module.exports = {

name: "guildMemberAdd",

async execute(member) {

    // ==========================================================
    // AUTOMATIC NEW MEMBER ROLE
    // ==========================================================

    const AUTO_ROLE_ID =
        "1403586702706212943";

    try {

        const autoRole =
            member.guild.roles.cache.get(
                AUTO_ROLE_ID
            );

        if (autoRole) {

            await member.roles.add(
                autoRole,
                "Automatic role assigned when member joined the server."
            ).catch(error => {

                console.error(
                    `Failed to give auto role to ${member.user.tag}:`,
                    error
                );

            });

            console.log(
                `Gave automatic role to ${member.user.tag}`
            );

        } else {

            console.error(
                `Automatic role ${AUTO_ROLE_ID} was not found.`
            );

        }

    } catch (error) {

        console.error(
            "Automatic role error:",
            error
        );

    }

    // ==========================================================
    // BLACKLIST ROLE RESTORATION
    // ==========================================================

    if (!fs.existsSync(BLACKLIST_FILE))
        return;

    let blacklists;

    try {

        blacklists =
            JSON.parse(
                fs.readFileSync(
                    BLACKLIST_FILE,
                    "utf8"
                )
            );

    } catch (error) {

        console.error(
            "Could not read blacklists.json:",
            error
        );

        return;

    }

    const userData =
        blacklists[member.id];

    if (!userData)
        return;

    for (
        const blacklist in userData
    ) {

        const roleID =
            userData[blacklist].role;

        if (!roleID)
            continue;

        await member.roles.add(
            roleID
        ).catch(error => {

            console.error(
                `Could not restore blacklist role ${roleID}:`,
                error
            );

        });

    }

    console.log(
        `Restored blacklist roles for ${member.user.tag}`
    );

}

};
