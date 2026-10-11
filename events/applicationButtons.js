const fs = require("fs");
const path = require("path");

const databasePath = path.join(
__dirname,
"../database/applications.json"
);

const iaDatabasePath = path.join(
__dirname,
"../database/internal-affairs.json"
);

function getDB(file) {
try {
if (!fs.existsSync(file)) {
fs.mkdirSync(path.dirname(file), {
recursive: true
});

        fs.writeFileSync(file, "{}");

        return {};
    }

    const raw = fs.readFileSync(file, "utf8");

    if (!raw.trim()) {
        return {};
    }

    return JSON.parse(raw);

} catch (error) {
    console.error("Database read error:", error);
    return {};
}

}

function saveDB(file, data) {
try {
fs.mkdirSync(path.dirname(file), {
recursive: true
});

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 4)
    );

} catch (error) {
    console.error("Database save error:", error);
}
}

module.exports = {

async execute(interaction) {

    // ==========================================================
    // STAFF APPLICATION
    // ==========================================================

    if (
        interaction.isButton() &&
        interaction.customId === "start_staff_application"
    ) {

        console.log(
            "Staff application button clicked by " +
            interaction.user.tag +
            " (" +
            interaction.user.id +
            ")"
        );

        // ======================================================
        // ACKNOWLEDGE BUTTON IMMEDIATELY
        // ======================================================

        try {

            await interaction.deferReply({
                ephemeral: true
            });

        } catch (error) {

            console.error(
                "Staff application deferReply error:",
                error
            );

            return;
        }

        // ======================================================
        // LOAD DATABASE
        // ======================================================

        const db = getDB(databasePath);

        // ======================================================
        // CHECK ACTIVE APPLICATION
        // ======================================================

        if (db[interaction.user.id]) {

            return interaction.editReply({
                content:
                    "You already have an active staff application."
            });

        }

        // ======================================================
        // CREATE APPLICATION
        // ======================================================

        db[interaction.user.id] = {

            question: 0,

            answers: [],

            type: "staff",

            timestamps: {

                started: Date.now(),

                questions: []

            }

        };

        // ======================================================
        // RECORD QUESTION 1
        // ======================================================

        db[interaction.user.id].timestamps.questions.push({

            question: 0,

            sent: Date.now()

        });

        // ======================================================
        // SAVE DATABASE
        // ======================================================

        saveDB(
            databasePath,
            db
        );

        // ======================================================
        // TELL USER
        // ======================================================

        await interaction.editReply({

            content:
                "Your application has started. Check your DMs."

        });

        // ======================================================
        // SEND FIRST QUESTION
        // ======================================================

        try {

            await interaction.user.send(

                "**Staff Application Starting**\n\n" +

                "**Question 1/21**\n\n" +

                "What is your Roblox username?"

            );

        } catch (error) {

            console.error(
                "Staff application DM error:",
                error
            );

            delete db[interaction.user.id];

            saveDB(
                databasePath,
                db
            );

            return interaction.followUp({

                content:
                    "I could not DM you. Please enable your Discord DMs for this server and try again.",

                ephemeral: true

            });

        }

        console.log(
            "Staff application started successfully for " +
            interaction.user.tag
        );

        return;
    }

    // ==========================================================
    // INTERNAL AFFAIRS APPLICATION
    // ==========================================================

    if (
        interaction.isButton() &&
        interaction.customId === "start_internal_affairs"
    ) {

        console.log(
            "Internal Affairs application button clicked by " +
            interaction.user.tag +
            " (" +
            interaction.user.id +
            ")"
        );

        // ======================================================
        // ACKNOWLEDGE BUTTON IMMEDIATELY
        // ======================================================

        try {

            await interaction.deferReply({
                ephemeral: true
            });

        } catch (error) {

            console.error(
                "Internal Affairs deferReply error:",
                error
            );

            return;
        }

        // ======================================================
        // LOAD DATABASE
        // ======================================================

        const db = getDB(
            iaDatabasePath
        );

        // ======================================================
        // CHECK ACTIVE APPLICATION
        // ======================================================

        if (db[interaction.user.id]) {

            return interaction.editReply({

                content:
                    "You already have an active Internal Affairs application."

            });

        }

        // ======================================================
        // CREATE APPLICATION
        // ======================================================

        db[interaction.user.id] = {

            question: 0,

            answers: [],

            type: "internal_affairs",

            timestamps: {

                started: Date.now(),

                questions: []

            }

        };

        // ======================================================
        // RECORD QUESTION 1
        // ======================================================

        db[interaction.user.id].timestamps.questions.push({

            question: 0,

            sent: Date.now()

        });

        // ======================================================
        // SAVE DATABASE
        // ======================================================

        saveDB(
            iaDatabasePath,
            db
        );

        // ======================================================
        // RESPOND
        // ======================================================

        await interaction.editReply({

            content:
                "Your Internal Affairs application has started. Check your DMs."

        });

        // ======================================================
        // SEND FIRST QUESTION
        // ======================================================

        try {

            await interaction.user.send(

                "**Internal Affairs Application Starting**\n\n" +

                "**Question 1/35**\n\n" +

                "What is your Roblox username?"

            );

        } catch (error) {

            console.error(
                "Internal Affairs DM error:",
                error
            );

            delete db[interaction.user.id];

            saveDB(
                iaDatabasePath,
                db
            );

            return interaction.followUp({

                content:
                    "I could not DM you. Please enable your Discord DMs for this server and try again.",

                ephemeral: true

            });

        }

        console.log(
            "Internal Affairs application started successfully for " +
            interaction.user.tag
        );

        return;
    }

    // ==========================================================
    // NOT AN APPLICATION BUTTON
    // ==========================================================

    return;
}

};
