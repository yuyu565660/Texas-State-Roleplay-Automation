const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ChannelType,
    PermissionsBitField
} = require("discord.js");

const { sendWebsiteLog } = require("./websiteLogs");

const ticketConfig = {
    categories: {
        general: { name: "General Support", role: "1403586703243083919", category: "1403586713212944447", transcript: "1523105644553568357" },
        ia: { name: "Internal Affairs", role: "1403586703381237969", category: "1403586713212944448", transcript: "1523105689181094048" },
        management: { name: "Management", role: "1403586703515582477", category: "1403586713212944449", transcript: "1523105745112137758" },
        board: { name: "Board Of Directors", role: "1403586703612186670", category: "1523086583228792902", transcript: "1523105784374890628" },
        marketplace: { name: "Server Marketplace", role: "1403586703612186670", category: "1537100056488845424", transcript: "1537100561235841115" },
        discord: { name: "Discord Team", role: "1403586703146483793", category: "1544848930074792076", transcript: "1544849195519705149" }
    }
};

const ticketCreationLocks = new Set();

async function createTicket(interaction, category, reason) {
    const blockedRole = "1403586702844498081";
    if (interaction.member.roles.cache.has(blockedRole)) {
        return interaction.reply({ content: "You are not permitted to create support tickets.", flags: 64 });
    }

    const data = ticketConfig.categories[category];
    if (!data) return interaction.reply({ content: "Invalid ticket category.", flags: 64 });

    const userId = interaction.user.id;

    if (ticketCreationLocks.has(userId)) {
        return interaction.reply({ content: "Your ticket is already being created. Please wait a moment.", flags: 64 });
    }

    ticketCreationLocks.add(userId);

    try {
        const existingTicket = interaction.guild.channels.cache.find(channel =>
            channel.type === ChannelType.GuildText &&
            (
                channel.topic === `ticket-owner:${userId}` ||
                (channel.name.toLowerCase().startsWith("ticket-") && channel.permissionOverwrites.cache.has(userId))
            )
        );

        if (existingTicket) {
            return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, flags: 64 });
        }

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: data.category,
            topic: `ticket-owner:${userId}`,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                { id: data.role, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
            ]
        });

        channel.ticketCategory = category;
        channel.ticketReason = reason;
        channel.ticketOwner = userId;

        const embed = new EmbedBuilder()
            .setTitle("Support Ticket")
            .setDescription(`Thank you for creating a ticket.\n\nA member of the support team will assist you shortly.\n\n**Category:**\n${data.name}\n\n**Reason:**\n${reason}\n\n━━━━━━━━━━━━━━━━━━\n\nPlease be patient and avoid pinging staff repeatedly.`)
            .setColor("#43E04E")
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim Ticket").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("unclaim_ticket").setLabel("Unclaim Ticket").setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${userId}> <@&${data.role}>`, embeds: [embed], components: [buttons] });
        await interaction.reply({ content: `Your ticket has been created: ${channel}`, flags: 64 });
    } finally {
        ticketCreationLocks.delete(userId);
    }
}

function ticketPanel() {
    const intro = new TextDisplayBuilder().setContent("# Texas State Roleplay Support\n\nSelect the category that best matches your request.");
    const general = new TextDisplayBuilder().setContent("> **General Support**\n> Questions • Assistance • Technical Issues • General Help");
    const ia = new TextDisplayBuilder().setContent("> **Internal Affairs**\n> Staff Reports • Investigations • Complaints • Misconduct");
    const management = new TextDisplayBuilder().setContent("> **Management**\n> Management Issues • Appeals • Staff Concerns • Escalations • Partnerships • Affiliations • Collaborations • Community Relations");
    const board = new TextDisplayBuilder().setContent("> **Leadership**\n> Executive Issues • Major Concerns • Director Review • High-Level Matters");
    const discord = new TextDisplayBuilder().setContent("> **Discord Team**\n> Discord Issues • Server Issues • Technical Discord Assistance");
    const notice = new TextDisplayBuilder().setContent("Please provide accurate and complete information when opening a ticket. Include any relevant details or evidence to help our team properly assist you. Make sure you follow the ticket TOS or you will be warned.\n\nPlease select the **most appropriate category** so your ticket can be directed to the correct support team.");

    const tosButton = new ButtonBuilder().setCustomId("ticket_tos").setLabel("Ticket TOS").setStyle(ButtonStyle.Secondary);
    const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_category")
        .setPlaceholder("Select a Ticket Category")
        .addOptions(
            { label: "General Support", description: "General Support", value: "general" },
            { label: "Internal Affairs", description: "Internal Affairs", value: "ia" },
            { label: "Management", description: "Management", value: "management" },
            { label: "Leadership", description: "Board Of Directors", value: "board" },
            { label: "Discord Team", description: "Discord Team", value: "discord" }
        );

    const bottomLogo = new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL("attachment://bottomembed.png")
    );

    const container = new ContainerBuilder()
        .setAccentColor(0x43E04E)
        .addTextDisplayComponents(intro)
        .addSeparatorComponents()
        .addTextDisplayComponents(general)
        .addSeparatorComponents()
        .addTextDisplayComponents(ia)
        .addSeparatorComponents()
        .addTextDisplayComponents(management)
        .addSeparatorComponents()
        .addTextDisplayComponents(board)
        .addSeparatorComponents()
        .addTextDisplayComponents(discord)
        .addSeparatorComponents()
        .addTextDisplayComponents(notice)
        .addSeparatorComponents()
        .addActionRowComponents(new ActionRowBuilder().addComponents(tosButton))
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
        .addMediaGalleryComponents(bottomLogo);

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files: [{ attachment: require("path").join(__dirname, "../logos/bottomembed.png"), name: "bottomembed.png" }]
    };
}

function ticketTosEmbed() {
    const rules = [
        "**1. Be Respectful** — Treat all staff and other users with respect and professionalism.", "**2. Use the Correct Category** — Select the category that best matches your request.", "**3. Provide Accurate Information** — All information provided must be truthful and accurate.", "**4. Provide Evidence** — When applicable, include screenshots, recordings, message links, or other relevant evidence.", "**5. Stay on Topic** — Keep the ticket focused on the original reason it was opened.", "**6. No Ticket Spam** — Do not repeatedly create tickets for the same issue.", "**7. No Ticket Abuse** — Do not use the ticket system for trolling, jokes, arguments, or unnecessary requests.", "**8. No False Reports** — False, exaggerated, or intentionally misleading reports are not permitted.", "**9. Follow Staff Instructions** — Cooperate with the staff member handling your ticket.", "**10. No Unnecessary Pings** — Do not repeatedly ping staff for responses.", "**11. Be Patient** — Allow staff reasonable time to review and respond to your ticket.", "**12. Do Not Demand Staff** — You may not demand a specific staff member to handle your ticket.", "**13. Keep Information Relevant** — Avoid sending unrelated messages or excessive content.", "**14. One Issue Per Ticket** — Whenever possible, keep each ticket focused on one primary issue.", "**15. Do Not Share Private Information** — Avoid posting passwords, personal information, or other sensitive information in tickets.", "**16. Respect Confidentiality** — Do not publicly share private ticket discussions or staff responses without authorization.", "**17. No Harassment** — Harassment, threats, insults, or targeted behavior toward staff will not be tolerated.", "**18. No Evading Decisions** — Do not create another ticket simply because you disagree with a previous decision.", "**19. Appeals** — Use the appropriate appeals category when requesting a review of a decision.", "**20. Staff Reports** — Use the Internal Affairs category for staff-related complaints or reports.", "**21. Ticket Ownership** — Staff may transfer your ticket to the appropriate department if the wrong category was selected.", "**22. Ticket Closure** — Staff may close tickets that are resolved, inactive, invalid, or in violation of the TOS.", "**23. Reopening Tickets** — Do not repeatedly reopen closed tickets without a valid reason.", "**24. No Manipulation** — Do not attempt to manipulate, pressure, or deceive staff into changing a decision.", "**25. Cooperation** — Answer staff questions clearly and provide any additional information requested.", "**26. No Solicitation** — Do not use support tickets for advertising or unauthorized promotions.", "**27. No Off-Topic Conversations** — Tickets are not intended for general chatting.", "**28. Respect Decisions** — Staff decisions must be respected unless you are using the appropriate appeal process.", "**29. Proper Use** — The ticket system is provided for legitimate support, reports, concerns, and official requests.", "**30. Consequences** — Failure to follow the Ticket TOS may result in a **warning, ticket closure, loss of ticket privileges, or further disciplinary action** depending on the severity of the violation."
    ];
    return new EmbedBuilder().setTitle("Ticket TOS").setDescription(rules.join("\n")).setColor("#43E04E").setFooter({ text: "Texas State Roleplay • Ticket TOS" });
}

function claimTicketPanel() {
    const embed = new EmbedBuilder().setTitle("Server Marketplace").setDescription(`Welcome to the Server Marketplace! Here you can find our exclusive server products, advertisements, premium perks, and other available offerings.\n\nEvery purchase helps support the community and contributes toward future development, liveries, giveaways, and other server improvements.\n\nPlease note that **all sales are final**. We reserve the right to refuse or decline any purchase or service at our discretion.\n\n**Accepted Payment Methods:** Robux.\n\nFor any questions regarding purchases or payment, please open a ticket.`).setColor("#43E04E").setTimestamp();
    const button = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("marketplace_ticket").setLabel("Open Marketplace Ticket").setStyle(ButtonStyle.Success));
    return { embeds: [embed], components: [button] };
}

function resolveTicketCategory(channel) {
    if (!channel) return null;

    if (channel.ticketCategory && ticketConfig.categories[channel.ticketCategory]) {
        return ticketConfig.categories[channel.ticketCategory];
    }

    // channel.ticketCategory is only in memory. After a restart it disappears,
    // so resolve the category from the permanent Discord parent ID.
    if (channel.parentId) {
        return Object.values(ticketConfig.categories).find(
            category => category.category === channel.parentId
        ) || null;
    }

    return null;
}

async function createTranscript(channel, closedBy, reason, closedByUser = null) {
    const category = resolveTicketCategory(channel);
    if (!category) {
        console.error(`[TICKET TRANSCRIPT] Could not resolve category for ${channel?.name || "unknown channel"} (${channel?.parentId || "no parent"})`);
        return false;
    }

    const messages = new Map();
    let lastMessageId = null;

    try {
        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const batch = await channel.messages.fetch(options);

            for (const [id, message] of batch) {
                messages.set(id, message);
            }

            if (batch.size < 100) break;

            const oldestMessage = batch.last();
            if (!oldestMessage) break;
            lastMessageId = oldestMessage.id;
        }
    } catch (error) {
        if (error?.code === 10003) {
            console.log(`[TICKET TRANSCRIPT] Channel ${channel.name} no longer exists.`);
            return false;
        }
        console.error(`[TICKET TRANSCRIPT] Failed reading ${channel.name}:`, error);
        return false;
    }

    const ordered = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const transcript = ordered.map(message => {
        const timestamp = message.createdAt ? message.createdAt.toISOString() : "";
        const attachments = message.attachments?.size
            ? ` [Attachments: ${[...message.attachments.values()].map(a => a.url).join(", ")}]`
            : "";
        const embeds = message.embeds?.length ? ` [Embeds: ${message.embeds.length}]` : "";
        return `[${timestamp}] ${message.author.tag} (${message.author.id}): ${message.content || "[No text content]"}${attachments}${embeds}`;
    }).join("\n");

    // Fetch the destination instead of relying only on the channel cache.
    const transcriptChannel =
        channel.guild.channels.cache.get(category.transcript) ||
        await channel.guild.channels.fetch(category.transcript).catch(() => null);

    if (!transcriptChannel || !transcriptChannel.isTextBased()) {
        console.error(`[TICKET TRANSCRIPT] Transcript channel ${category.transcript} is missing or inaccessible.`);
        return false;
    }

    const header = `**Ticket:**\n${channel.name}\n\n**Category:**\n${category.name}\n\n**Closed By:**\n${closedBy}\n\n**Close Reason:**\n${reason}\n\n━━━━━━━━━━━━━━━━━━\n\n`;
    const chunks = [];
    const maxDescription = 3400;

    if (!transcript.length) {
        chunks.push("[No messages found]");
    } else {
        for (let i = 0; i < transcript.length; i += maxDescription) {
            chunks.push(transcript.slice(i, i + maxDescription));
        }
    }

    try {
        for (let i = 0; i < chunks.length; i++) {
            const description = i === 0
                ? `${header}\`\`\`\n${chunks[i]}\n\`\`\``
                : `**Transcript — Part ${i + 1}**\n\`\`\`\n${chunks[i]}\n\`\`\``;

            await transcriptChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(i === 0 ? "Ticket Transcript" : `Ticket Transcript — Part ${i + 1}`)
                        .setDescription(description)
                        .setColor("#43E04E")
                        .setTimestamp()
                ]
            });
        }
    } catch (error) {
        console.error(`[TICKET TRANSCRIPT] Failed sending transcript for ${channel.name}:`, error);
        return false;
    }

    const ownerId = channel.ticketOwner || (channel.topic?.startsWith("ticket-owner:") ? channel.topic.slice("ticket-owner:".length) : null);
    let owner = ownerId ? channel.guild.members.cache.get(ownerId)?.user : null;
    if (!owner && ownerId) {
        try { owner = await channel.guild.client.users.fetch(ownerId); } catch {}
    }

    try {
        await sendWebsiteLog("transcript", {
            ticketName: channel.name,
            category: category.name,
            categoryKey: Object.entries(ticketConfig.categories).find(([, value]) => value === category)?.[0] || null,
            ownerId,
            ownerUsername: owner?.username || null,
            ownerTag: owner?.tag || null,
            ownerDisplay: owner ? `${owner.tag} (${owner.id})` : ownerId,
            closedById: closedByUser?.id || null,
            closedByUsername: closedByUser?.username || null,
            closedByTag: closedByUser?.tag || closedBy,
            closedByDisplay: closedByUser ? `${closedByUser.tag} (${closedByUser.id})` : closedBy,
            reason,
            transcript
        }, closedByUser);
    } catch (error) {
        console.error(`[TICKET TRANSCRIPT] Website transcript log failed for ${channel.name}:`, error);
    }

    console.log(`[TICKET TRANSCRIPT] Saved ${ordered.length} messages from ${channel.name} to ${category.transcript}.`);
    return true;
}

module.exports = { createTicket, ticketPanel, ticketTosEmbed, claimTicketPanel, createTranscript, ticketConfig };
