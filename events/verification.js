const {
    EmbedBuilder
} = require("discord.js");

const axios =
    require("axios");

const config =
    require("../config.json");


// ==========================================================
// SETTINGS
// ==========================================================

const LOG_CHANNEL =
    "1529614403639709696";

const VERIFIED_ROLE =
    "1403586703045693500";

const MELONLY_BASE_URL =
    "https://api.melonly.xyz";

const MELONLY_API_KEY =
    config.melonly?.melonlyApi2 || null;


// ==========================================================
// MELONLY VERIFICATION
// ==========================================================

async function getMelonlyVerification(
    discordId
) {

    if (!MELONLY_API_KEY) {

        throw new Error(
            "Melonly API key is not configured."
        );

    }


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

                timeout:
                    15000

            }

        );


    return response.data;

}


// ==========================================================
// EVENT
// ==========================================================

module.exports = {

    name:
        "interactionCreate",


    async execute(interaction) {

        try {

            // ==================================================
            // ONLY BUTTONS
            // ==================================================

            if (
                !interaction.isButton()
            ) {
                return;
            }


            // ==================================================
            // ONLY VERIFICATION BUTTON
            // ==================================================

            if (
                interaction.customId !==
                "start_verify"
            ) {

                return;

            }


            // ==================================================
            // DEFER
            // ==================================================

            await interaction.deferReply({

                ephemeral:
                    true

            });


            // ==================================================
            // CHECK API KEY
            // ==================================================

            if (
                !MELONLY_API_KEY
            ) {

                return interaction.editReply({

                    content:
                        "The verification system is not configured correctly. Please contact an directive."

                });

            }


            // ==================================================
            // CHECK MELONLY
            // ==================================================

            let verification;

            try {

                verification =
                    await getMelonlyVerification(
                        interaction.user.id
                    );

            } catch (error) {

                const status =
                    error.response?.status;


                // ==============================================
                // NOT VERIFIED IN MELONLY
                // ==============================================

                if (
                    status === 404
                ) {

                    return interaction.editReply({

                        content:
                            " You are not connected to a Roblox account through Melonly.\n\nPlease connect your Roblox account to your Discord account through Melonly, then click **Verify** again."

                    });

                }


                // ==============================================
                // UNAUTHORIZED
                // ==============================================

                if (
                    status === 401
                ) {

                    console.error(
                        "Melonly verification API returned 401."
                    );

                    return interaction.editReply({

                        content:
                            "The verification system could not authenticate with Melonly. Please contact an administrator."

                    });

                }


                // ==============================================
                // OTHER API ERROR
                // ==============================================

                console.error(
                    "Melonly verification error:",
                    error.response?.data ||
                    error.message ||
                    error
                );


                return interaction.editReply({

                    content:
                        "The Melonly verification system is currently unavailable. Please try again later."

                });

            }


            // ==================================================
            // VALIDATE RESPONSE
            // ==================================================

            if (
                !verification ||
                !verification.robloxId
            ) {

                return interaction.editReply({

                    content:
                        " Melonly did not return a valid Roblox account for your Discord account."

                });

            }


            // ==================================================
            // ROBLOX INFORMATION
            // ==================================================

            const robloxId =
                String(
                    verification.robloxId
                );

            const robloxUsername =
                verification.preferredUsername ||
                verification.name ||
                verification.nickname ||
                "Unknown";


            // ==================================================
            // GET VERIFIED ROLE
            // ==================================================

            let verifiedRole =
                interaction.guild.roles.cache.get(
                    VERIFIED_ROLE
                );


            // ==================================================
            // ADD VERIFIED ROLE
            // ==================================================

            if (
                verifiedRole
            ) {

                await interaction.member.roles.add(
                    verifiedRole
                ).catch(error => {

                    console.error(
                        "Could not add verified role:",
                        error
                    );

                });

            }


            // ==================================================
            // SUCCESS EMBED
            // ==================================================

            const successEmbed =
                new EmbedBuilder()

                    .setColor(
                        "#43E04E"
                    )

                    .setTitle(
                        "Verification Successful"
                    )

                    .setDescription(

`You have been successfully verified!

Your Roblox account was found through **Melonly**.

**Discord**
${interaction.user}

**Roblox Username**
${robloxUsername}

**Roblox ID**
\`${robloxId}\`

Your verification is now linked to your Melonly account.`

                    )

                    .setTimestamp();


            // ==================================================
            // RESPONSE
            // ==================================================

            await interaction.editReply({

                embeds: [
                    successEmbed
                ]

            });


            // ==================================================
            // LOG
            // ==================================================

            const logChannel =
                interaction.guild.channels.cache.get(
                    LOG_CHANNEL
                );


            if (logChannel) {

                const logEmbed =
                    new EmbedBuilder()

                        .setColor(
                            "#43E04E"
                        )

                        .setTitle(
                            "Member Verified"
                        )

                        .setDescription(

`A member has successfully verified through Melonly.

**Discord User**
${interaction.user}

**Discord ID**
\`${interaction.user.id}\`

**Roblox Username**
${robloxUsername}

**Roblox ID**
\`${robloxId}\`

**Verification Provider**
Melonly`

                        )

                        .setTimestamp();


                await logChannel.send({

                    embeds: [
                        logEmbed
                    ]

                }).catch(() => {});

            }


        } catch (error) {

            console.error(
                "Verification button error:",
                error
            );


            if (
                interaction.deferred ||
                interaction.replied
            ) {

                return interaction.editReply({

                    content:
                        "Something went wrong while verifying your account. Please try again."

                }).catch(() => {});

            }

        }

    }

};
