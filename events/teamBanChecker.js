const axios = require("axios");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

// ==========================================================
// CONFIG
// ==========================================================

const TEAM_BANS_FILE = path.join(
    __dirname,
    "../data/teamBans.json"
);

const CHECK_INTERVAL = 10000;

// ==========================================================
// INTERVAL CONTROL
// ==========================================================

let intervalStarted = false;

// ==========================================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================================

function getServerKey() {
    return process.env.ERLC_SERVER_KEY;
}

function getGlobalKey() {
    return process.env.ERLC_GLOBAL_KEY;
}

// ==========================================================
// SEND ERLC COMMAND
// ==========================================================

async function sendERLCCommand(command) {
    const serverKey =
        getServerKey();

    const globalKey =
        getGlobalKey();

    if (!serverKey) {
        throw new Error(
            "ERLC_SERVER_KEY is missing from Railway Variables."
        );
    }

    if (!globalKey) {
        throw new Error(
            "ERLC_GLOBAL_KEY is missing from Railway Variables."
        );
    }

    await axios.post(
        "https://api.erlc.gg/v2/server/command",
        {
            command: command
        },
        {
            headers: {
                "Content-Type": "application/json",
                "server-key": serverKey,
                "Authorization": globalKey
            }
        }
    );
}

// ==========================================================
// LOAD TEAM BANS
// ==========================================================

function loadBans() {
    if (!fs.existsSync(TEAM_BANS_FILE)) {
        console.log(
            "Team ban checker: teamBans.json was not found."
        );

        return {
            bans: []
        };
    }

    try {
        const data =
            JSON.parse(
                fs.readFileSync(
                    TEAM_BANS_FILE,
                    "utf8"
                )
            );

        if (
            !data ||
            !Array.isArray(data.bans)
        ) {
            console.error(
                "Team ban checker: teamBans.json does not contain a valid bans array."
            );

            return {
                bans: []
            };
        }

        return data;

    } catch (error) {
        console.error(
            "Team ban checker: Could not read teamBans.json."
        );

        console.error(error);

        return {
            bans: []
        };
    }
}

// ==========================================================
// CHECK TEAM BANS
// ==========================================================

async function checkTeamBans() {
    try {
        const serverKey =
            getServerKey();

        const globalKey =
            getGlobalKey();

        if (!serverKey) {
            console.error(
                "Team ban checker: ERLC_SERVER_KEY is missing."
            );

            return;
        }

        if (!globalKey) {
            console.error(
                "Team ban checker: ERLC_GLOBAL_KEY is missing."
            );

            return;
        }

        const bans =
            loadBans();

        if (
            !Array.isArray(bans.bans) ||
            bans.bans.length === 0
        ) {
            return;
        }

        // ==================================================
        // GET CURRENT SERVER DATA
        // ==================================================

        const response =
            await axios.get(
                "https://api.erlc.gg/v2/server",
                {
                    headers: {
                        "server-key":
                            serverKey,

                        "Authorization":
                            globalKey
                    }
                }
            );

        // ==================================================
        // IMPORTANT:
        // ERLC API USES "Players" WITH A CAPITAL P
        // ==================================================

        const players =
            response.data?.Players;

        if (!Array.isArray(players)) {
            console.error(
                "Team ban checker: Players data was not an array."
            );

            return;
        }

        console.log(
            `Team ban checker: Checking ${players.length} player(s).`
        );

        // ==================================================
        // CHECK EVERY PLAYER
        // ==================================================

        for (const player of players) {
            if (!player) {
                continue;
            }

            if (
                typeof player.Player !== "string"
            ) {
                continue;
            }

            // ERLC format:
            // PlayerName:123456789

            const playerParts =
                player.Player.split(":");

            const name =
                playerParts[0];

            const userId =
                playerParts[1];

            const team =
                String(
                    player.Team || ""
                );

            if (!name || !userId) {
                continue;
            }

            if (!team) {
                continue;
            }

            // ==================================================
            // FIND MATCHING TEAM BAN
            // ==================================================

            const found =
                bans.bans.find(
                    ban => {
                        if (!ban) {
                            return false;
                        }

                        const bannedTeam =
                            String(
                                ban.team || ""
                            ).trim();

                        const bannedUser =
                            String(
                                ban.user || ""
                            ).trim();

                        if (
                            bannedTeam !== team
                        ) {
                            return false;
                        }

                        return (
                            bannedUser ===
                            String(userId)
                        );
                    }
                );

            if (!found) {
                continue;
            }

            // ==================================================
            // TEAM BAN DETECTED
            // ==================================================

            console.log(
                `Team banned player detected: ${name} (${userId}) - ${team}`
            );

            // ==================================================
            // WANTED PLAYER
            // ==================================================

            try {
                await sendERLCCommand(
                    `:wanted ${name} 5`
                );

                console.log(
                    `Team ban checker: Wanted ${name}.`
                );

            } catch (error) {
                console.error(
                    `Could not wanted ${name}:`,
                    error.response?.data ||
                    error.message ||
                    error
                );
            }

            // ==================================================
            // WAIT 1 SECOND
            // ==================================================

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );

            // ==================================================
            // PM PLAYER
            // ==================================================

            try {
                await sendERLCCommand(
                    `:pm ${name} You are team banned from ${found.team}.`
                );

                console.log(
                    `Team ban checker: PM sent to ${name}.`
                );

            } catch (error) {
                console.error(
                    `Could not PM ${name}:`,
                    error.response?.data ||
                    error.message ||
                    error
                );
            }
        }

    } catch (error) {
        console.error(
            "Team ban checker error:",
            error.response?.data ||
            error.message ||
            error
        );
    }
}

// ==========================================================
// START TEAM BAN CHECKER
// ==========================================================

function startTeamBanChecker() {
    if (intervalStarted) {
        console.log(
            "Team ban checker is already running."
        );

        return;
    }

    intervalStarted = true;

    console.log(
        "Team ban checker started."
    );

    checkTeamBans();

    setInterval(
        () => {
            checkTeamBans();
        },
        CHECK_INTERVAL
    );
}

// ==========================================================
// IMPORTANT:
// EXPORT THE FUNCTION DIRECTLY
// ==========================================================

module.exports = startTeamBanChecker;
