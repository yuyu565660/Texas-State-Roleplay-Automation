const play = require("play-dl");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior,
    entersState
} = require("@discordjs/voice");

const queues = new Map();

function get(guildId) {
    if (!queues.has(guildId)) {
        const player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
        });

        const state = {
            guildId,
            player,
            connection: null,
            voiceChannelId: null,
            textChannelId: null,
            queue: [],
            current: null,
            volume: 100,
            loop: false,
            queueLoop: false,
            cycleHistory: [],
            resource: null
        };

        player.on(AudioPlayerStatus.Idle, () => {
            if (state.loop && state.current) {
                state.queue.unshift(state.current);
            }
            state.current = null;
            playNext(state).catch(error => {
                console.error("[MUSIC] Next track error:", error);
            });
        });

        player.on("error", error => {
            console.error("[MUSIC] Player error:", error);
            state.current = null;
            state.resource = null;
            playNext(state).catch(() => {});
        });

        queues.set(guildId, state);
    }

    return queues.get(guildId);
}

async function connect(state, voiceChannel) {
    if (
        state.connection &&
        state.voiceChannelId === voiceChannel.id &&
        state.connection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
        return state.connection;
    }

    if (state.connection) {
        try {
            state.connection.destroy();
        } catch {}
    }

    state.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
    });

    state.voiceChannelId = voiceChannel.id;

    await entersState(
        state.connection,
        VoiceConnectionStatus.Ready,
        15000
    );

    state.connection.subscribe(state.player);
    return state.connection;
}

async function resolveStream(track) {
    const stream = await play.stream(track.url, {
        quality: 2,
        discordPlayerCompatibility: true
    });

    return createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
    });
}

async function playNext(state) {
    if (state.queue.length === 0) {
        if (state.queueLoop && state.cycleHistory.length > 0) {
            state.queue = state.cycleHistory.slice();
            state.cycleHistory = [];
        } else {
            state.current = null;
            state.resource = null;
            return;
        }
    }

    const track = state.queue.shift();
    state.current = track;

    if (state.queueLoop) {
        state.cycleHistory.push(track);
    }

    try {
        const resource = await resolveStream(track);
        state.resource = resource;

        if (resource.volume) {
            resource.volume.setVolume(
                Math.max(0, Math.min(2, state.volume / 100))
            );
        }

        state.player.play(resource);

        if (state.textChannelId) {
            const channel = await track.guild.channels
                .fetch(state.textChannelId)
                .catch(() => null);

            if (channel && channel.isTextBased()) {
                await channel
                    .send("Now playing: **" + track.title + "**")
                    .catch(() => {});
            }
        }
    } catch (error) {
        console.error("[MUSIC] Failed to stream:", error);
        state.resource = null;
        state.current = null;
        await playNext(state);
    }
}

async function join(guild, voiceChannel) {
    const state = get(guild.id);
    await connect(state, voiceChannel);
    return state;
}

async function addTrack(guild, voiceChannel, textChannel, track) {
    const state = get(guild.id);

    await connect(state, voiceChannel);

    state.textChannelId = textChannel.id;
    track.guild = guild;
    state.queue.push(track);

    if (
        state.player.state.status === AudioPlayerStatus.Idle &&
        !state.current
    ) {
        await playNext(state);
    }

    return state;
}

async function search(query, limit = 5) {
    const results = await play.search(query, {
        limit,
        source: {
            youtube: "video"
        }
    });

    return results.map(result => ({
        title: result.title,
        url: result.url,
        duration: result.durationRaw || "Unknown",
        author: result.channel?.name || "Unknown",
        thumbnail: result.thumbnails?.[0]?.url || null
    }));
}

function current(guildId) {
    return get(guildId).current;
}

function queue(guildId) {
    return get(guildId).queue;
}

function clear(guildId) {
    get(guildId).queue = [];
}

function skip(guildId) {
    get(guildId).player.stop(true);
}

function pause(guildId) {
    return get(guildId).player.pause();
}

function resume(guildId) {
    return get(guildId).player.unpause();
}

function setVolume(guildId, value) {
    const state = get(guildId);

    state.volume = Math.max(
        1,
        Math.min(200, Number(value))
    );

    if (state.resource?.volume) {
        state.resource.volume.setVolume(state.volume / 100);
    }

    return state.volume;
}

function setLoop(guildId, enabled) {
    const state = get(guildId);
    state.loop = enabled;
    return enabled;
}

function setQueueLoop(guildId, enabled) {
    const state = get(guildId);
    state.queueLoop = enabled;
    return enabled;
}

function shuffle(guildId) {
    const state = get(guildId);

    for (let i = state.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.queue[i], state.queue[j]] = [
            state.queue[j],
            state.queue[i]
        ];
    }
}

function remove(guildId, position) {
    const state = get(guildId);

    if (
        position < 1 ||
        position > state.queue.length
    ) {
        return null;
    }

    return state.queue.splice(position - 1, 1)[0];
}

function move(guildId, from, to = 1) {
    const state = get(guildId);

    if (
        from < 1 ||
        from > state.queue.length
    ) {
        return false;
    }

    const item = state.queue.splice(from - 1, 1)[0];
    const index = Math.max(
        0,
        Math.min(state.queue.length, to - 1)
    );

    state.queue.splice(index, 0, item);
    return true;
}

function disconnect(guildId) {
    const state = get(guildId);

    state.queue = [];
    state.cycleHistory = [];
    state.current = null;
    state.resource = null;

    state.player.stop(true);

    if (state.connection) {
        try {
            state.connection.destroy();
        } catch {}
    }

    state.connection = null;
    state.voiceChannelId = null;
    state.textChannelId = null;
}

module.exports = {
    get,
    join,
    search,
    addTrack,
    current,
    queue,
    clear,
    skip,
    pause,
    resume,
    setVolume,
    setLoop,
    setQueueLoop,
    shuffle,
    remove,
    move,
    disconnect
};
