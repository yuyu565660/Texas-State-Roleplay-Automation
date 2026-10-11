const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const questions = [
    "Do you have experience as Media Team?",
    "Why do you want to join the Media Team?",
    "How active would you be 1-10?",
    "Do you promise to upload at least 1-2 pictures/week?",
    "SEND_IMAGES",
    "Why should we accept you into the Media Team?",
    "What makes you fit to be a member of the Media Team?",
    "What Software do you use to edit your Photos/Videos?",
    "Describe where you've demonstrated teamwork skills within a staff/media team in ER:LC",
    "Do you agree to make/post 1-2 pieces of your work a week?",
    "Do you agree to remain active within the Media Team?",
    "Do you agree not to utilise pictures/work in any other server?",
    "Do you agree that any AI images will not be media approved, and understand if you are caught, you may be anywhere from a strike-media blacklist?"
];

const pendingChannel = "1528865927180058825";
const acceptedChannel = "1528866611879219371";
const deniedChannel = "1528866696004243528";
const mediaRole = "1403586702928511072";

let applications = {};

module.exports = {
    async execute(interaction) {
        // This handler is loaded globally for interactionCreate, so slash
        // commands and other interactions can reach it too. Only process
        // interactions that actually have a customId.
        if (!interaction || typeof interaction.customId !== "string") {
            return false;
        }

        if (interaction.customId === "start_media_application") {
            applications[interaction.user.id] = {
                answers: [],
                images: []
            };

            await interaction.reply({
                content: "✅ Check your DMs! Your Media Team application has started.",
                ephemeral: true
            });

            await askQuestion(interaction.user, 0);
            return true;
        }

        if (
            interaction.customId.startsWith("media_accept_") ||
            interaction.customId.startsWith("media_deny_")
        ) {
            const userID = interaction.customId.split("_")[2];

            if (!interaction.member?.roles?.cache?.has("1528232509521789088")) {
                await interaction.reply({
                    content: "❌ You cannot review applications.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.customId.startsWith("media_accept_")) {
                const member = await interaction.guild.members.fetch(userID);

                await member.roles.add(mediaRole).catch(() => {});

                await interaction.guild.channels.cache.get(acceptedChannel)?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Media Team Accepted")
                            .setDescription(`Applicant: <@${userID}>\nAccepted by: <@${interaction.user.id}>`)
                    ]
                });

                await member.send("🎉 Your Media Team application has been accepted!").catch(() => {});
            } else {
                await interaction.guild.channels.cache.get(deniedChannel)?.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("❌ Media Team Denied")
                            .setDescription(`Applicant: <@${userID}>\nDenied by: <@${interaction.user.id}>`)
                    ]
                });

                const member = await interaction.guild.members.fetch(userID).catch(() => null);
                await member?.send("❌ Your Media Team application has been denied.").catch(() => {});
            }

            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ components: [] });
            } else if (interaction.message) {
                await interaction.message.edit({ components: [] }).catch(() => {});
            }

            return true;
        }

        return false;
    }
};

async function askQuestion(user, index) {
    if (!applications[user.id]) return;

    if (index >= questions.length) {
        await finishApplication(user);
        return;
    }

    const question = questions[index];

    if (question === "SEND_IMAGES") {
        await user.send(
            "📸 Please send a few images of your previous Media Team work.\n\n" +
            "Send all images now.\n" +
            "When you are finished, type **done**."
        );

        const collector = user.dmChannel.createMessageCollector({
            filter: m => m.author.id === user.id,
            time: 300000
        });

        collector.on("collect", msg => {
            if (msg.content.toLowerCase() === "done") {
                collector.stop();
                return;
            }

            if (msg.attachments.size > 0) {
                msg.attachments.forEach(img => {
                    applications[user.id].images.push(img.url);
                });

                user.send("✅ Image added!").catch(() => {});
            } else {
                user.send("❌ Please send an image or type **done**.").catch(() => {});
            }
        });

        collector.on("end", () => {
            askQuestion(user, index + 1).catch(() => {});
        });

        return;
    }

    await user.send(
        `📸 **Media Team Application**\n\nQuestion ${index + 1}/${questions.length}\n\n${question}`
    );

    const collector = user.dmChannel.createMessageCollector({
        filter: m => m.author.id === user.id,
        max: 1,
        time: 300000
    });

    collector.on("collect", msg => {
        if (!applications[user.id]) return;
        applications[user.id].answers.push(msg.content);
        askQuestion(user, index + 1).catch(() => {});
    });

    collector.on("end", collected => {
        if (collected.size === 0 && applications[user.id]) {
            user.send("❌ Application cancelled due to inactivity.").catch(() => {});
            delete applications[user.id];
        }
    });
}

async function finishApplication(user) {
    const data = applications[user.id];
    if (!data) return;

    const embed = new EmbedBuilder()
        .setColor("#D4AF37")
        .setTitle("📸 New Media Team Application")
        .setDescription(`Applicant: <@${user.id}>`);

    let answerIndex = 0;
    questions.forEach(q => {
        if (q !== "SEND_IMAGES") {
            embed.addFields({
                name: q,
                value: data.answers[answerIndex++] || "No answer"
            });
        }
    });

    embed.addFields({
        name: "Images",
        value: data.images.length
            ? data.images.map(x => `[Image](${x})`).join("\n").slice(0, 1024)
            : "No images"
    });

    const channel = user.client.channels.cache.get(pendingChannel);
    if (!channel) {
        await user.send("❌ Your application could not be submitted because the review channel is unavailable.").catch(() => {});
        delete applications[user.id];
        return;
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`media_accept_${user.id}`)
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`media_deny_${user.id}`)
            .setLabel("Deny")
            .setStyle(ButtonStyle.Danger)
    );

    const embeds = [embed];

    data.images.forEach((image, index) => {
        embeds.push(
            new EmbedBuilder()
                .setColor("#D4AF37")
                .setTitle(`📸 Work Example ${index + 1}`)
                .setImage(image)
        );
    });

    await channel.send({
        content: "<@&1528232509521789088> New Media Team application received!",
        embeds,
        components: [row]
    });

    await user.send("✅ Your Media Team application has been submitted!").catch(() => {});
    delete applications[user.id];
}
