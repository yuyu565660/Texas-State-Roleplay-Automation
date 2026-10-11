const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const config = require("../config.json");

// ==========================================================
// DATABASE PATHS
// ==========================================================

const databasePath =
    path.join(
        __dirname,
        "../database/applications.json"
    );

const internalAffairsDatabasePath =
    path.join(
        __dirname,
        "../database/internal-affairs.json"
    );

const afkPath =
    path.join(
        __dirname,
        "../database/afk.json"
    );

// ==========================================================
// PROTECTED ROLES
// ==========================================================

const protectedRoles = [

    "1403586703716777988",

    "1526415142408163430",

    "1403586703612186670",

    "1403586703515582477"

];

// ==========================================================
// ROLES ALLOWED TO PING PROTECTED ROLES
// ==========================================================

const allowedRoles = [

    "1403586702492303379",

    "1403586703045693500",

    "1403586703146483793"

];

// ==========================================================
// STAFF QUESTIONS
// ==========================================================

const staffQuestions = [

    "What is your Roblox username?",

    "What is your Discord username?",

    "What is your age?",

    "What timezone are you in?",

    "Have you been staff in other servers? If yes, list them.",

    "Why should we choose you as staff? (3+ sentences)",

    "What does RDM mean?",

    "What does VDM mean?",

    "What does FRP mean?",

    "What do you do if a player breaks multiple rules?",

    "When do you issue a ban instead of warning?",

    "A player is repeatedly RDMing. What do you do?",

    "Two players are toxic. What do you do?",

    "You see staff abuse their commands. What do you do?",

    "A friend breaks rules. Do you treat them differently?",

    "False staff abuse report against you. What do you do?",

    "What does being staff mean to you?",

    "How active can you be daily/weekly?",

    "No higher staff online during serious situation — what do you do?",

    "Do you understand breaking rules will get you punished?",

    "Anything else we should know?"

];

// ==========================================================
// INTERNAL AFFAIRS QUESTIONS
// ==========================================================

const iaQuestions = [

    "What is your Roblox username?",

    "What is your Discord username?",

    "What is your age?",

    "What timezone are you in?",

    "How long have you been part of Texas State Roleplay?\n*(1+ sentence)*",

    "Have you been staff in Texas State Roleplay or another server before? If yes, explain your experience.\n*(2+ sentences)*",

    "Why should we choose you for the Internal Affairs team?\n*(3+ sentences)*",

    "What is the purpose of Internal Affairs?\n*(2+ sentences)*",

    "Why is Internal Affairs important for Texas State Roleplay?\n*(3+ sentences)*",

    "What qualities should an Internal Affairs member have, and why?\n*(3+ sentences)*",

    "What does being fair and unbiased mean? Explain why it is important in Internal Affairs.\n*(3+ sentences)*",

    "A report is submitted against a staff member. What steps would you take to handle the situation?\n*(4+ sentences)*",

    "How would you handle a staff investigation from start to finish?\n*(4+ sentences)*",

    "What type of evidence would you look for during an investigation, and why?\n*(3+ sentences)*",

    "How would you determine if evidence is valid, reliable, or fake?\n*(3+ sentences)*",

    "A staff member is accused of abusing their commands. What would you do?\n*(4+ sentences)*",

    "A high-ranking staff member receives a report. Would their rank affect your decision? Explain.\n*(3+ sentences)*",

    "A friend of yours receives a report for breaking staff rules. How would you handle the situation?\n*(3+ sentences)*",

    "A staff member refuses to cooperate with an Internal Affairs investigation. What would you do?\n*(3+ sentences)*",

    "How would you handle confidential information from reports and investigations?\n*(3+ sentences)*",

    "Explain the difference between a warning, infraction, strike, and termination.\n*(4+ sentences)*",

    "When should a staff member receive an infraction or punishment?\n*(3+ sentences)*",

    "What would you do if another Internal Affairs member was being unfair or abusing their authority?\n*(4+ sentences)*",

    "How active can you be daily/weekly? Explain your availability.\n*(2+ sentences)*",

    "Is there anything else we should know about why you want to join Internal Affairs?\n*(2+ sentences)*"

];

// ==========================================================
// DATABASE HELPERS
// ==========================================================

function ensureDatabase(filePath) {

    try {

        const directory =
            path.dirname(filePath);

        if (
            !fs.existsSync(directory)
        ) {

            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );
        }

        if (
            !fs.existsSync(filePath)
        ) {

            fs.writeFileSync(
                filePath,
                "{}"
            );
        }

    } catch (error) {

        console.error(
            "Database setup error:",
            error
        );
    }
}

function getDB() {

    ensureDatabase(
        databasePath
    );

    try {

        return JSON.parse(
            fs.readFileSync(
                databasePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "Staff database read error:",
            error
        );

        return {};
    }
}

function saveDB(data) {

    ensureDatabase(
        databasePath
    );

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
            "Staff database save error:",
            error
        );
    }
}

function getIADB() {

    ensureDatabase(
        internalAffairsDatabasePath
    );

    try {

        return JSON.parse(
            fs.readFileSync(
                internalAffairsDatabasePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "IA database read error:",
            error
        );

        return {};
    }
}

function saveIADB(data) {

    ensureDatabase(
        internalAffairsDatabasePath
    );

    try {

        fs.writeFileSync(

            internalAffairsDatabasePath,

            JSON.stringify(
                data,
                null,
                4
            )

        );

    } catch (error) {

        console.error(
            "IA database save error:",
            error
        );
    }
}

// ==========================================================
// AI WRITING CHECK
// ==========================================================

async function checkAIWriting(answers) {

    const text =
        answers
            .map(a => a.answer || "")
            .join(" ");

    let score = 0;

    const reasons = [];

    const lower =
        text.toLowerCase();

    // ======================================================
    // GENERIC AI PHRASES
    // ======================================================

    const aiPhrases = [

        "i believe",

        "i am committed",

        "i look forward",

        "furthermore",

        "additionally",

        "in conclusion",

        "professionalism",

        "dedication",

        "positive environment",

        "maintain a safe"

    ];

    let phraseCount = 0;

    for (
        const word of aiPhrases
    ) {

        if (
            lower.includes(word)
        ) {

            phraseCount++;
        }
    }

    if (
        phraseCount >= 3
    ) {

        score += 25;

        reasons.push(
            "Multiple AI-style phrases detected"
        );
    }

    // ======================================================
    // PERSONAL EXPERIENCE
    // ======================================================

    const personalWords = [

        "i handled",

        "my experience",

        "my old server",

        "when i was staff",

        "i dealt with"

    ];

    let personal = false;

    for (
        const word of personalWords
    ) {

        if (
            lower.includes(word)
        ) {

            personal = true;

            break;
        }
    }

    if (!personal) {

        score += 15;

        reasons.push(
            "Few personal examples found"
        );
    }

    // ======================================================
    // FORMAL WORDING
    // ======================================================

    const formalWords = [

        "accountability",

        "integrity",

        "demonstrate",

        "contribute",

        "responsibility"

    ];

    let formalCount = 0;

    for (
        const word of formalWords
    ) {

        if (
            lower.includes(word)
        ) {

            formalCount++;
        }
    }

    if (
        formalCount >= 4
    ) {

        score += 20;

        reasons.push(
            "Very formal writing style"
        );
    }

    // ======================================================
    // LENGTH
    // ======================================================

    if (
        text.length > 5000
    ) {

        score += 15;

        reasons.push(
            "Unusually long responses"
        );
    }

    // ======================================================
    // RESPONSE TIME
    // ======================================================

    const times =
        answers
            .map(x => x.responseTime)
            .filter(
                x =>
                    typeof x === "number" &&
                    x > 0
            );

    if (
        times.length
    ) {

        const average =
            times.reduce(
                (a, b) => a + b,
                0
            ) / times.length;

        if (
            average < 15000 &&
            text.length > 2000
        ) {

            score += 20;

            reasons.push(
                "Long answers submitted very quickly"
            );
        }
    }

    // ======================================================
    // COPY / PASTE SPEED CHECK
    // ======================================================

    const copyPasteFlags = [];

    answers.forEach(
        (answer, index) => {

            if (
                !answer.responseTime ||
                !answer.answer
            ) {
                return;
            }

            if (
                answer.answer.length <= 500
            ) {
                return;
            }

            const charactersPerSecond =
                answer.answer.length /
                (answer.responseTime / 1000);

            if (
                charactersPerSecond > 15
            ) {

                score += 15;

                copyPasteFlags.push(
                    `Question ${index + 1} was answered very quickly for its length`
                );
            }
        }
    );

    if (
        copyPasteFlags.length
    ) {

        reasons.push(
            ...copyPasteFlags
        );
    }

    if (
        score > 100
    ) {

        score = 100;
    }

    let confidence =
        Math.min(
            95,
            Math.floor(
                answers.length * 4
            )
        );

    let level;

    if (
        score >= 75
    ) {

        level =
            "Highly likely AI";

    } else if (
        score >= 50
    ) {

        level =
            "Possible AI assistance";

    } else {

        level =
            "Likely human";
    }

    return {

        score,

        confidence,

        level,

        reasons:
            reasons.length
                ? reasons
                : [
                    "No major AI patterns detected"
                ]
    };
}

// ==========================================================
// MODULE
// ==========================================================

module.exports = {

    name: Events.MessageCreate,

    async execute(message) {

        try {

            // ==================================================
            // IGNORE BOTS
            // ==================================================

            if (
                message.author.bot
            ) {
                return;
            }

            if (
                message.client._securityFirewall?.blockedMessages?.has(message.id)
            ) {
                message.client._securityFirewall.blockedMessages.delete(message.id);
                return;
            }

            // ==================================================
            // MEMBER ACTIVITY TRACKING

            if (message.guild) {
                try {
                    const activityPath = path.join(
                        __dirname,
                        "../database/member-activity.json"
                    );

                    if (!fs.existsSync(path.dirname(activityPath))) {
                        fs.mkdirSync(path.dirname(activityPath), {
                            recursive: true
                        });
                    }

                    let activity = {};

                    try {
                        if (fs.existsSync(activityPath)) {
                            activity = JSON.parse(
                                fs.readFileSync(activityPath, "utf8")
                            );
                        }
                    } catch {
                        activity = {};
                    }

                    activity[message.author.id] = {
                        lastMessage: Date.now(),
                        guildId: message.guild.id
                    };

                    fs.writeFileSync(
                        activityPath,
                        JSON.stringify(activity, null, 4)
                    );
                } catch (error) {
                    console.error(
                        "[MEMBER ACTIVITY] Failed to save activity:",
                        error
                    );
                }
            }

            // High Rank Staff ping enforcement is handled by events/highRankPing.js.
            // Keeping it in one handler prevents duplicate warnings/deletions.

            // AFK SYSTEM
            // ==================================================

            ensureDatabase(
                afkPath
            );

            let afk = {};

            try {

                afk =
                    JSON.parse(
                        fs.readFileSync(
                            afkPath,
                            "utf8"
                        )
                    );

            } catch {

                afk = {};
            }

            // ==================================================
            // REMOVE AFK WHEN USER TALKS
            // ==================================================

            if (
                afk[message.author.id]
            ) {

                const data =
                    afk[message.author.id];

                const duration =
                    Date.now() -
                    data.time;

                const minutes =
                    Math.floor(
                        duration / 60000
                    );

                let timeText;

                if (
                    minutes >= 60
                ) {

                    timeText =
                        `${Math.floor(minutes / 60)} hour(s) ${minutes % 60} minute(s)`;

                } else {

                    timeText =
                        `${minutes} minute(s)`;
                }

                let pingText;

                if (
                    data.pings &&
                    data.pings.length > 0
                ) {

                    pingText =
                        `Users who pinged you:\n${
                            data.pings
                                .map(
                                    x =>
                                        `<@${x}>`
                                )
                                .join("\n")
                        }`;

                } else {

                    pingText =
                        "No user pinged you while you were gone.";
                }

                delete afk[
                    message.author.id
                ];

                fs.writeFileSync(

                    afkPath,

                    JSON.stringify(
                        afk,
                        null,
                        4
                    )

                );

                await message.reply({

                    embeds: [

                        new EmbedBuilder()

                        .setColor(
                            "#43E04E"
                        )

                        .setTitle(
                            "Welcome Back!"
                        )

                        .setDescription(
                            `<@${message.author.id}> welcome back!

You were AFK for:
**${timeText}**

Reason:
**${data.reason}**

${pingText}`
                        )

                    ]

                }).catch(() => {});
            }

            // ==================================================
            // AFK PING DETECTION
            // ==================================================

            for (
                const user of message.mentions.users.values()
            ) {

                if (
                    !afk[user.id]
                ) {
                    continue;
                }

                if (
                    !afk[user.id].pings
                ) {

                    afk[user.id].pings = [];
                }

                if (
                    !afk[user.id].pings.includes(
                        message.author.id
                    )
                ) {

                    afk[user.id].pings.push(
                        message.author.id
                    );
                }

                fs.writeFileSync(

                    afkPath,

                    JSON.stringify(
                        afk,
                        null,
                        4
                    )

                );

                await message.reply({

                    embeds: [

                        new EmbedBuilder()

                        .setColor(
                            "#43E04E"
                        )

                        .setTitle(
                            "AFK Notice"
                        )

                        .setDescription(
                            `<@${user.id}> is currently AFK.

Reason:
**${afk[user.id].reason}**

Since:
<t:${Math.floor(
    afk[user.id].time / 1000
)}:R>`
                        )

                    ]

                }).catch(() => {});
            }

            // ==================================================
            // ONLY ACCEPT APPLICATIONS IN DMS
            // ==================================================

            if (
                message.channel.type !== 1
            ) {
                return;
            }

            // ==================================================
            // USER ID
            // ==================================================

            const userId =
                message.author.id;

            // ==================================================
            // LOAD DATABASES
            // ==================================================

            const staffDB =
                getDB();

            const iaDB =
                getIADB();

            let db;

            let isIA =
                false;

            let questions;

            // ==================================================
            // DETERMINE APPLICATION
            // ==================================================

            if (
                staffDB[userId]
            ) {

                db =
                    staffDB;

                questions =
                    staffQuestions;

            } else if (
                iaDB[userId]
            ) {

                db =
                    iaDB;

                questions =
                    iaQuestions;

                isIA =
                    true;

            } else {

                return;
            }

            // ==================================================
            // GET APPLICATION
            // ==================================================

            const application =
                db[userId];

            if (
                !application
            ) {
                return;
            }

            if (
                !Array.isArray(
                    application.answers
                )
            ) {

                application.answers = [];
            }

            if (
                typeof application.question !==
                "number"
            ) {

                application.question = 0;
            }

            // ==================================================
            // TIMESTAMPS
            // ==================================================

            if (
                !application.timestamps
            ) {

                application.timestamps = {

                    started:
                        Date.now(),

                    questions: []

                };
            }

            const currentQuestion =
                application.question;

            if (
                currentQuestion >=
                questions.length
            ) {
                return;
            }

            // ==================================================
            // RESPONSE TIME
            // ==================================================

            let responseTime =
                null;

            if (

                application.timestamps.questions[
                    currentQuestion
                ]

            ) {

                responseTime =
                    Date.now() -
                    application
                        .timestamps
                        .questions[
                            currentQuestion
                        ].sent;
            }

            // ==================================================
            // SAVE ANSWER
            // ==================================================

            application.answers.push({

                question:
                    questions[
                        currentQuestion
                    ],

                answer:
                    message.content,

                responseTime:
                    responseTime
            });

            application.question++;

            // ==================================================
            // MORE QUESTIONS
            // ==================================================

            if (
                application.question <
                questions.length
            ) {

                if (
                    isIA
                ) {

                    saveIADB(
                        db
                    );

                } else {

                    saveDB(
                        db
                    );
                }

                application.timestamps.questions.push({

                    question:
                        application.question,

                    sent:
                        Date.now()

                });

                await message.author.send(

                    `**${
                        isIA
                            ? "Internal Affairs"
                            : "Staff"
                    } Application**

**Question ${
                        application.question + 1
                    }/${questions.length}**

${
    questions[
        application.question
    ]
}`

                );

                return;
            }

            // ==================================================
            // APPLICATION COMPLETE
            // ==================================================

            if (
                isIA
            ) {

                saveIADB(
                    db
                );

            } else {

                saveDB(
                    db
                );
            }

            // ==================================================
            // AI CHECK
            // ==================================================

            let aiCheck;

            try {

                aiCheck =
                    await checkAIWriting(
                        application.answers
                    );

            } catch (error) {

                console.error(
                    "AI Writing Check Error:",
                    error
                );

                aiCheck = {

                    score:
                        0,

                    confidence:
                        0,

                    level:
                        "Unavailable",

                    reasons: [
                        "AI writing check failed."
                    ]
                };
            }

            // ==================================================
            // SUBMISSION DM
            // ==================================================

            await message.author.send(

                `**Application Submitted!**

Thank you for submitting your ${
                    isIA
                        ? "Internal Affairs"
                        : "Staff"
                } application.

The management team will carefully review your responses and notify you once a decision has been made.`

            );

            // ==================================================
            // GET REVIEW CHANNEL
            // ==================================================

            const reviewChannelId =
                isIA
                    ? config.internalAffairs?.pendingLogs
                    : config.application?.reviewChannel;

            if (
                !reviewChannelId
            ) {

                console.error(
                    "Application review channel is missing from config.json"
                );

                return;
            }

            const pendingChannel =
                await message.client.channels.fetch(
                    reviewChannelId
                );

            if (
                !pendingChannel
            ) {

                console.error(
                    "Application review channel could not be found."
                );

                return;
            }

            // ==================================================
            // APPLICATION EMBED
            // ==================================================

            const embed =
                new EmbedBuilder()

                .setColor(
                    "#43E04E"
                )

                .setTitle(
                    `Texas State Roleplay | ${
                        isIA
                            ? "Internal Affairs"
                            : "Staff"
                    } Application`
                )

                .setDescription(
                    `**Applicant:**
<@${userId}>

**Submitted:**
<t:${Math.floor(
    Date.now() / 1000
)}:F>

**Total Questions:**
${application.answers.length}`
                )

                .setTimestamp();

            // ==================================================
            // AI ANALYSIS
            // ==================================================

            embed.addFields({

                name:
                    "AI Writing Analysis",

                value:
                    `**AI Probability:** ${aiCheck.score}%

**Confidence:** ${aiCheck.confidence}%

**Risk Level:** ${aiCheck.level}

**Reasons:**
${aiCheck.reasons
    .map(
        x =>
            `• ${x}`
    )
    .join("\n")}`

            });

            // ==================================================
            // APPLICATION ANSWERS
            // ==================================================

            /*
                Discord allows a maximum of 25 embed fields.
                AI analysis uses 1 field, so we safely display
                up to 24 answers here.
            */

            application.answers.forEach(
                (answer, index) => {

                    if (
                        embed.data.fields?.length >= 25
                    ) {
                        return;
                    }

                    embed.addFields({

                        name:
                            `Question ${index + 1}: ${
                                answer.question
                            }`.slice(
                                0,
                                256
                            ),

                        value:
                            (
                                answer.answer ||
                                "No answer provided."
                            ).slice(
                                0,
                                1024
                            )

                    });
                }
            );

            // ==================================================
            // ADDITIONAL ANSWERS
            // ==================================================

            const displayedAnswers =
                Math.max(
                    0,
                    (embed.data.fields?.length || 1) - 1
                );

            if (
                application.answers.length >
                displayedAnswers
            ) {

                if (
                    embed.data.fields?.length <
                    25
                ) {

                    embed.addFields({

                        name:
                            "Additional Answers",

                        value:
                            `There are ${
                                application.answers.length -
                                displayedAnswers
                            } additional answers saved in the application database.`

                    });
                }
            }

            // ==================================================
            // ACCEPT / DENY BUTTONS
            // ==================================================

            const buttons =
                new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()

                    .setCustomId(
                        `accept_${userId}`
                    )

                    .setLabel(
                        "Accept"
                    )

                    .setStyle(
                        ButtonStyle.Success
                    ),

                    new ButtonBuilder()

                    .setCustomId(
                        `deny_${userId}`
                    )

                    .setLabel(
                        "Deny"
                    )

                    .setStyle(
                        ButtonStyle.Danger
                    )

                );

            // ==================================================
            // REVIEW ROLE
            // ==================================================

            const reviewRole =
                isIA
                    ? config.internalAffairs?.reviewRole
                    : config.application?.reviewRole;

            // ==================================================
            // SEND APPLICATION
            // ==================================================

            const sentMessage =
                await pendingChannel.send({

                    content:
                        reviewRole
                            ? (
                                isIA
                                    ? `<@&${reviewRole}> New Internal Affairs application pending review.`
                                    : `<@&${reviewRole}> New Staff application pending review.`
                            )
                            : (
                                isIA
                                    ? "New Internal Affairs application pending review."
                                    : "New Staff application pending review."
                            ),

                    embeds: [
                        embed
                    ],

                    components: [
                        buttons
                    ]

                });

            // ==================================================
            // SAVE REVIEW MESSAGE ID
            // ==================================================

            application.messageId =
                sentMessage.id;

            if (
                isIA
            ) {

                saveIADB(
                    db
                );

            } else {

                saveDB(
                    db
                );
            }

            console.log(
                `${isIA ? "IA" : "Staff"} application submitted by ${message.author.tag}`
            );

        } catch (error) {

            console.error(
                "MessageCreate Error:",
                error
            );

            // Don't spam users if this was an internal
            // application/database problem.

        }
    }
};
