const express = require("express");
const axios = require("axios");
const nacl = require("tweetnacl");

const {
    EmbedBuilder
} = require("discord.js");

const config = require("../config.json");

module.exports = (client) => {

    const app = express();

    app.use(
        express.raw({
            type: "application/json"
        })
    );

    // ==========================================================
    // CHANNELS
    // ==========================================================

    const SECURITY_LOG =
        "1532749392413724692";

    // ==========================================================
    // STAFF ROLES
    // ==========================================================

    const REMOVE_ROLES = [

        "1403586703045693500",
        "1403586703146483800",
        "1403586703146483801",
        "1403586703243083916",
        "1522708224300683274",
        "1403586703243083917",
        "1403586703243083918",
        "1403586703243083919",
        "1522880646714757211",
        "1403586703243083920",
        "1403586703243083921",
        "1522880704793284759",
        "1522880716197859388"

    ];

    const PUNISH_ROLE =
        "1403586702844498082";

    // ==========================================================
    // MELONLY
    // ==========================================================

    const MELONLY_API_KEY =
        config.melonlyApiKey || null;

    const MELONLY_BASE_URL =
        "https://api.melonly.xyz";

    // ==========================================================
    // ERLC PUBLIC KEY
    // ==========================================================

    const PUBLIC_KEY =
        Buffer.from(
            "MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=",
            "base64"
        );

    // ==========================================================
    // VERIFY ERLC SIGNATURE
    // ==========================================================

    function verifySignature(req) {

        const signature =
            req.headers["x-signature-ed25519"];

        const timestamp =
            req.headers["x-signature-timestamp"];

        if (
            !signature ||
            !timestamp
        ) {

            return false;

        }

        const message =
            Buffer.concat([

                Buffer.from(timestamp),

                req.body

            ]);

        return nacl.sign.detached.verify(

            message,

            Buffer.from(
                signature,
                "hex"
            ),

            PUBLIC_KEY

        );

    }

    // ==========================================================
    // MELONLY DISCORD -> ROBLOX
    // ==========================================================

    async function getMelonlyRoblox(discordId) {

        if (!MELONLY_API_KEY) {

            console.log(
                "Melonly API key is missing from config.json"
            );

            return null;

        }

        try {

            const response =
                await axios.get(

                    `${MELONLY_BASE_URL}/api/v1/verification/discord/${discordId}/roblox`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${MELONLY_API_KEY}`,

                            Accept:
                                "application/json"

                        },

                        timeout: 10000

                    }

                );

            return response.data;

        } catch (error) {

            if (
                error.response?.status === 404
            ) {

                return null;

            }

            console.log(

                "Melonly Discord -> Roblox Error:",

                error.response?.data ||
                error.message

            );

            return null;

        }

    }

    // ==========================================================
    // MELONLY ROBLOX -> DISCORD
    // ==========================================================

    async function getMelonlyDiscord(robloxId) {

        if (!MELONLY_API_KEY) {

            console.log(
                "Melonly API key is missing from config.json"
            );

            return null;

        }

        try {

            const response =
                await axios.get(

                    `${MELONLY_BASE_URL}/api/v1/verification/roblox/${robloxId}/discord`,

                    {

                        headers: {

                            Authorization:
                                `Bearer ${MELONLY_API_KEY}`,

                            Accept:
                                "application/json"

                        },

                        timeout: 10000

                    }

                );

            return response.data;

        } catch (error) {

            if (
                error.response?.status === 404
            ) {

                return null;

            }

            console.log(

                "Melonly Roblox -> Discord Error:",

                error.response?.data ||
                error.message

            );

            return null;

        }

    }

    // ==========================================================
    // GET ROBLOX USER ID FROM USERNAME
    // ==========================================================

    async function getRobloxUserId(username) {

        try {

            const response =
                await axios.post(

                    "https://users.roblox.com/v1/usernames/users",

                    {

                        usernames: [
                            username
                        ],

                        excludeBannedUsers:
                            true

                    },

                    {

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        timeout: 10000

                    }

                );

            const users =
                response.data?.data;

            if (
                !users ||
                !users.length
            ) {

                return null;

            }

            return users[0].id;

        } catch (error) {

            console.log(

                "Roblox Username Lookup Error:",

                error.response?.data ||
                error.message

            );

            return null;

        }

    }

    // ==========================================================
    // FIND DISCORD USER THROUGH MELONLY
    // ==========================================================

    async function findDiscordUser(
        robloxUsername
    ) {

        // ------------------------------------------------------
        // Make sure Melonly API key exists
        // ------------------------------------------------------

        if (!MELONLY_API_KEY) {

            console.log(
                "Cannot use Melonly: API key missing."
            );

            return null;

        }

        // ------------------------------------------------------
        // Convert Roblox username -> Roblox ID
        // ------------------------------------------------------

        const robloxId =
            await getRobloxUserId(
                robloxUsername
            );

        if (!robloxId) {

            console.log(
                "Roblox user not found:",
                robloxUsername
            );

            return null;

        }

        console.log(

            "Roblox ID found:",

            robloxUsername,

            "->",

            robloxId

        );

        // ------------------------------------------------------
        // Ask Melonly for Discord account
        // ------------------------------------------------------

        const melonly =
            await getMelonlyDiscord(
                String(robloxId)
            );

        if (!melonly) {

            console.log(

                "No Melonly connection found:",

                robloxUsername,

                robloxId

            );

            return null;

        }

        // ------------------------------------------------------
        // Get Discord ID
        // ------------------------------------------------------

        const discordId =
            melonly.userId ||
            melonly.providerAccountId;

        if (!discordId) {

            console.log(
                "Melonly response did not contain a Discord ID:",
                melonly
            );

            return null;

        }

        console.log(

            "Melonly connection found:",

            robloxUsername,

            "-> Discord:",

            discordId

        );

        return {

            discordId:
                String(discordId),

            robloxId:
                String(robloxId)

        };

    }

    // ==========================================================
    // SEND LOG
    // ==========================================================

    async function sendLog(
        title,
        description
    ) {

        const channel =
            client.channels.cache.get(
                SECURITY_LOG
            );

        if (!channel) {

            console.log(
                "Security log channel not found."
            );

            return;

        }

        await channel.send({

            embeds: [

                new EmbedBuilder()

                    .setTitle(title)

                    .setDescription(
                        description
                    )

                    .setTimestamp()

            ]

        });

    }

    // ==========================================================
    // DETECT ALL / OTHER
    // ==========================================================

    function hasDangerousWord(
        message
    ) {

        const words =
            message
                .toLowerCase()
                .split(/\s+/);

        return (

            words.includes(
                "all"
            )

            ||

            words.includes(
                "other"
            )

            ||

            message.includes(
                "@everyone"
            )

            ||

            message.includes(
                "@here"
            )

        );

    }

    // ==========================================================
    // PUNISH STAFF
    // ==========================================================

    async function punishStaff(
        robloxUsername,
        command
    ) {

        console.log(
            "Looking up through Melonly:",
            robloxUsername
        );

        // ------------------------------------------------------
        // FIND DISCORD ACCOUNT THROUGH MELONLY
        // ------------------------------------------------------

        const connection =
            await findDiscordUser(
                robloxUsername
            );

        if (!connection) {

            await sendLog(

                "Security Violation - User Not Found",

                `**Roblox:**\n${robloxUsername}\n\n**Command:**\n${command}\n\n**Result:**\nNo Discord account could be found through Melonly.`

            );

            return;

        }

        const discordID =
            connection.discordId;

        // ------------------------------------------------------
        // FIND GUILD
        // ------------------------------------------------------

        const guild =
            client.guilds.cache.first();

        if (!guild) {

            console.log(
                "No Discord guild found."
            );

            return;

        }

        // ------------------------------------------------------
        // FIND MEMBER
        // ------------------------------------------------------

        const member =
            await guild.members.fetch(
                discordID
            ).catch(
                () => null
            );

        if (!member) {

            await sendLog(

                "Security Violation - Member Not Found",

                `**Roblox:**\n${robloxUsername}\n\n**Discord ID:**\n${discordID}\n\n**Command:**\n${command}\n\n**Result:**\nDiscord account was found through Melonly, but the user is not in the server.`

            );

            return;

        }

        console.log(
            "Punishing:",
            member.user.tag
        );

        // ------------------------------------------------------
        // REMOVE STAFF ROLES
        // ------------------------------------------------------

        for (
            const role of REMOVE_ROLES
        ) {

            if (
                member.roles.cache.has(
                    role
                )
            ) {

                await member.roles.remove(
                    role
                ).catch(
                    error => {

                        console.log(
                            "Failed to remove role:",
                            role,
                            error.message
                        );

                    }
                );

            }

        }

        // ------------------------------------------------------
        // ADD PUNISHMENT ROLE
        // ------------------------------------------------------

        await member.roles.add(
            PUNISH_ROLE
        ).catch(
            error => {

                console.log(
                    "Failed to add punishment role:",
                    error.message
                );

            }
        );

        // ------------------------------------------------------
        // LOG
        // ------------------------------------------------------

        await sendLog(

            "Security Punishment",

            `**User:**\n${member}\n\n**Discord ID:**\n${discordID}\n\n**Roblox:**\n${robloxUsername}\n\n**Roblox ID:**\n${connection.robloxId}\n\n**Command:**\n${command}\n\n**Action:**\nRemoved staff permissions`

        );

        // ------------------------------------------------------
        // ERLC COMMANDS
        // ------------------------------------------------------

        await sendERLCCommand(
            `:unmod ${robloxUsername}`
        );

        await sendERLCCommand(
            `:unadmin ${robloxUsername}`
        );

        await sendERLCCommand(
            `:pm ${robloxUsername} Your staff permissions have been removed due to a security violation.`
        );

    }

    // ==========================================================
    // SEND ERLC COMMAND
    // ==========================================================

    async function sendERLCCommand(
        command
    ) {

        try {

            await axios.post(

                "https://api.erlc.gg/v2/server/command",

                {

                    command:
                        command

                },

                {

                    headers: {

                        "Content-Type":
                            "application/json",

                        "server-key":
                            config.erlc.serverKey,

                        "Authorization":
                            config.erlc.globalKey

                    }

                }

            );

            console.log(
                "ERLC:",
                command
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        7000
                    )
            );

        } catch (error) {

            console.log(

                "ERLC ERROR:",

                error.response?.data ||
                error.message

            );

        }

    }

    // ==========================================================
    // WEBHOOK
    // ==========================================================

    app.post(

        "/erlc/webhook",

        async (
            req,
            res
        ) => {

            // --------------------------------------------------
            // VERIFY SIGNATURE
            // --------------------------------------------------

            if (
                !verifySignature(req)
            ) {

                console.log(
                    "Invalid ERLC webhook signature."
                );

                return res.sendStatus(
                    401
                );

            }

            // --------------------------------------------------
            // PARSE BODY
            // --------------------------------------------------

            let data;

            try {

                data =
                    JSON.parse(
                        req.body.toString()
                    );

            } catch (error) {

                console.log(
                    "Invalid webhook JSON."
                );

                return res.sendStatus(
                    400
                );

            }

            // --------------------------------------------------
            // GET PLAYER
            // --------------------------------------------------

            const player =
                data.player?.username;

            // --------------------------------------------------
            // GET MESSAGE
            // --------------------------------------------------

            const message =
                data.message;

            if (
                !player ||
                !message
            ) {

                return res.sendStatus(
                    200
                );

            }

            console.log(
                "ERLC COMMAND:",
                player,
                message
            );

            // --------------------------------------------------
            // LOG EVERY COMMAND
            // --------------------------------------------------

            if (
                message.startsWith(":")
            ) {

                await sendLog(

                    "ERLC Command Log",

                    `**Player:**\n${player}\n\n**Command:**\n${message}`

                );

            }

            // --------------------------------------------------
            // CHECK ALL / OTHER
            // --------------------------------------------------

            if (
                hasDangerousWord(
                    message
                )
            ) {

                console.log(
                    "DANGEROUS COMMAND:",
                    player,
                    message
                );

                await punishStaff(

                    player,

                    message

                );

            }

            return res.sendStatus(
                200
            );

        }

    );

    // ==========================================================
    // START WEBHOOK
    // ==========================================================

    app.listen(

        3000,

        () => {

            console.log(
                "ERLC Webhook Started on port 3000"
            );

            console.log(
                "Melonly verification lookup:",
                MELONLY_API_KEY
                    ? "Enabled"
                    : "Missing API key"
            );

        }

    );

};
