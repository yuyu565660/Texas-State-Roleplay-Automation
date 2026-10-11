const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");


module.exports = {


async execute(interaction){



/*
==========================
START BAN APPEAL BUTTON
==========================
*/


if(
    interaction.isButton() &&
    interaction.customId === "start_ban_appeal"
){


    const modal =
    new ModalBuilder()

    .setCustomId(
        "ban_appeal_modal"
    )

    .setTitle(
        "Ban Appeal"
    );



    const roblox =
    new TextInputBuilder()

    .setCustomId(
        "roblox_username"
    )

    .setLabel(
        "Roblox Username"
    )

    .setStyle(
        TextInputStyle.Short
    )

    .setRequired(true);



    const reason =
    new TextInputBuilder()

    .setCustomId(
        "ban_reason"
    )

    .setLabel(
        "What were you banned for?"
    )

    .setStyle(
        TextInputStyle.Short
    )

    .setRequired(true);



    const appeal =
    new TextInputBuilder()

    .setCustomId(
        "appeal_reason"
    )

    .setLabel(
        "Why should your ban be removed?"
    )

    .setStyle(
        TextInputStyle.Paragraph
    )

    .setRequired(true);



    const future =
    new TextInputBuilder()

    .setCustomId(
        "future_actions"
    )

    .setLabel(
        "What will you do differently?"
    )

    .setStyle(
        TextInputStyle.Paragraph
    )

    .setRequired(true);



    modal.addComponents(

        new ActionRowBuilder()
        .addComponents(
            roblox
        ),

        new ActionRowBuilder()
        .addComponents(
            reason
        ),

        new ActionRowBuilder()
        .addComponents(
            appeal
        ),

        new ActionRowBuilder()
        .addComponents(
            future
        )

    );


    return interaction.showModal(
        modal
    );


}
/*
==========================
SUBMIT BAN APPEAL
==========================
*/


if(
    interaction.isModalSubmit() &&
    interaction.customId === "ban_appeal_modal"
){

    const pendingChannel =
    interaction.guild.channels.cache.get(
        "1526584201632284953"
    );



    const embed =
    new EmbedBuilder()

    .setTitle(
        " New Ban Appeal"
    )

    .setColor(
        "#43E04E"
    )

    .addFields(

        {
            name:"User",
            value:`${interaction.user}`
        },

        {
            name:"Roblox Username",
            value:
            interaction.fields.getTextInputValue(
                "roblox_username"
            )
        },

        {
            name:"Ban Reason",
            value:
            interaction.fields.getTextInputValue(
                "ban_reason"
            )
        },

        {
            name:"Appeal Reason",
            value:
            interaction.fields.getTextInputValue(
                "appeal_reason"
            )
        },

        {
            name:"Future Actions",
            value:
            interaction.fields.getTextInputValue(
                "future_actions"
            )
        },

        {
            name:"Status",
            value:
            " Pending"
        }

    )

    .setFooter({

        text:
        `User ID: ${interaction.user.id}`

    });



    const buttons =
    new ActionRowBuilder()

    .addComponents(

        new ButtonBuilder()

        .setCustomId(
            `accept_ban_${interaction.user.id}`
        )

        .setLabel(
            " Accept Appeal"
        )

        .setStyle(
            ButtonStyle.Success
        ),



        new ButtonBuilder()

        .setCustomId(
            `deny_ban_${interaction.user.id}`
        )

        .setLabel(
            " Deny Appeal"
        )

        .setStyle(
            ButtonStyle.Danger
        )

    );



    await pendingChannel.send({

        content:
        "<@&1403586703515582477>",

        embeds:[
            embed
        ],

        components:[
            buttons
        ]

    });



    return interaction.reply({

        content:
        " Your ban appeal has been submitted.",

        flags:64

    });


}
/*
==========================
ACCEPT / DENY BUTTONS
==========================
*/


if(
    interaction.isButton() &&
    (
        interaction.customId.startsWith("accept_ban_") ||
        interaction.customId.startsWith("deny_ban_")
    )
){


    const action =
    interaction.customId.startsWith(
        "accept_ban_"
    )
    ? "accept"
    : "deny";



    const userId =
    interaction.customId.split("_")[2];



    const modal =
    new ModalBuilder()

    .setCustomId(
        `${action}_ban_reason_${userId}`
    )

    .setTitle(
        action === "accept"
        ? "Accept Ban Appeal"
        : "Deny Ban Appeal"
    );



    const reason =
    new TextInputBuilder()

    .setCustomId(
        "decision_reason"
    )

    .setLabel(
        "Reason"
    )

    .setPlaceholder(
        "Enter the reason for your decision..."
    )

    .setStyle(
        TextInputStyle.Paragraph
    )

    .setRequired(true);



    modal.addComponents(

        new ActionRowBuilder()
        .addComponents(
            reason
        )

    );



    return interaction.showModal(
        modal
    );

}
/*
==========================
ACCEPT / DENY MODAL RESULT
==========================
*/


if(
    interaction.isModalSubmit() &&
    (
        interaction.customId.startsWith("accept_ban_reason_") ||
        interaction.customId.startsWith("deny_ban_reason_")
    )
){


    const accepted =
    interaction.customId.startsWith(
        "accept_ban_reason_"
    );



    const userId =
    interaction.customId.split("_")[3];



    const reason =
    interaction.fields.getTextInputValue(
        "decision_reason"
    );



    const user =
    await interaction.client.users.fetch(
        userId
    ).catch(() => null);



    const originalEmbed =
    interaction.message.embeds[0];



    const updatedEmbed =
    EmbedBuilder.from(
        originalEmbed
    );



    updatedEmbed.addFields(

        {
            name:
            accepted
            ? "Accepted By"
            : "Denied By",

            value:
            `${interaction.user}`

        },

        {
            name:
            "Reason",

            value:
            reason

        }

    );



    updatedEmbed.spliceFields(

        updatedEmbed.data.fields.findIndex(
            field =>
            field.name === "Status"
        ),

        1,

        {
            name:"Status",

            value:
            accepted
            ? " Accepted"
            : " Denied"
        }

    );



    updatedEmbed.setColor(
        accepted
        ? "Green"
        : "Red"
    );



    const resultChannel =
    interaction.guild.channels.cache.get(

        accepted
        ? "1526584266635346021"
        : "1526584352673108160"

    );



    await resultChannel.send({

        embeds:[
            updatedEmbed
        ]

    });



    if(user){


        await user.send({

            embeds:[

                new EmbedBuilder()

                .setTitle(
                    " Texas State Roleplay Ban Appeal"
                )

                .setColor(
                    accepted
                    ? "Green"
                    : "Red"
                )

                .setDescription(

                    accepted

                    ?

                    `Your ban appeal has been **accepted** by ${interaction.user}.\n\n**Reason:**\n${reason}`

                    :

                    `Your ban appeal has been **denied** by ${interaction.user}.\n\n**Reason:**\n${reason}`

                )

            ]

        }).catch(() => {});


    }



    await interaction.message.delete()
    .catch(() => {});



    return interaction.reply({

        content:

        accepted

        ?

        " Ban appeal accepted and moved."

        :

        " Ban appeal denied and moved.",

        flags:64

    });


}



}

};
