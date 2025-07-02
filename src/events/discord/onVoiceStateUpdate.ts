// src/events/discord/onVoiceStateUpdate.ts

import { GuildTextBasedChannel, VoiceState } from "discord.js";
import BotInstance from "../../@types/botInstance";
import DisTube from "distube";
import { deleteByVoiceChannelId } from "../../utils/voiceChannelMap";
import { sendWithEmbed } from "../../utils/embedHelper";
import ExtendedClient from "../../@types/extendedClient";

export const onVoiceStateUpdate = async (oldState: VoiceState, newState: VoiceState, client: ExtendedClient, activeBots: BotInstance[], noSongTimeouts: Map<string, NodeJS.Timeout>, noListenerTimeouts: Map<string, NodeJS.Timeout>, noPlayWarningTimeouts: Map<string, NodeJS.Timeout>, distube: DisTube) => {
    try {
        const guildId = newState.guild.id;
        const botInstance = activeBots.find(b => b.client.user?.id === newState.id);
        const wasInVC = oldState.channelId ?? '';
        const nowInVC = newState.channelId;

        if (botInstance && newState.id === client.user.id) {
            // When the bot is leaving a voice channel, only act if the channel left
            // matches what the bot thinks it’s connected to.
            if (wasInVC && !nowInVC) {
                const queue = distube.getQueue(wasInVC);
                if (queue) {
                    queue.voice.leave();
                    await queue.stop();
                    console.log(`[${botInstance.name}][VoiceState] Bot đã rời khỏi vc ${wasInVC}, dừng phát.`);
                } else {
                    distube.voices.leave(guildId);
                }
                deleteByVoiceChannelId(botInstance.client.voiceChannelMap, wasInVC);
            }
            // When the bot is joining a voice channel, only set timeouts
            // if it already recorded as connected in this guild.
            else if (!wasInVC && nowInVC) {
                botInstance.client.voiceChannelMap.set(guildId, nowInVC);
                const queue = distube.getQueue(nowInVC);

                // If no song playing or queue is empty
                if (!queue || queue.songs.length === 0) {
                    // First timeout: warning after 5 minutes
                    const warningTimeout = setTimeout(async () => {
                        console.log(`[${botInstance.name}][VoiceState] Sẽ rời khỏi vc ${nowInVC} vì không phát bài hát nào sau 5 phút.`);
                        const q = distube.getQueue(nowInVC);
                        if (!q || q.songs.length === 0) {
                            const channel = newState.channel;
                            await sendWithEmbed(channel as GuildTextBasedChannel, 'warning', '⚠ Tôi sẽ rời khỏi phòng sau 5 phút nữa vì không có bài hát nào được phát.');

                            // Second timeout: leave after another 5 minutes
                            const leaveTimeout = setTimeout(async () => {
                                const q2 = distube.getQueue(nowInVC);
                                if (!q2 || q2.songs.length === 0) {
                                    const voice = distube.voices.get(nowInVC);
                                    if (voice) voice.leave();

                                    await q2?.stop();
                                    console.log(`[${botInstance.name}][VoiceState] Tự động rời khỏi vc ${nowInVC} vì không phát bài hát nào sau 10 phút.`);
                                    sendWithEmbed(channel as GuildTextBasedChannel, 'info', '👋 Tôi đã rời khỏi vì không có bài hát nào sau 10 phút.');
                                }

                                noSongTimeouts.delete(nowInVC);
                            }, 5 * 60_000); // 5 more mins

                            noSongTimeouts.set(nowInVC, leaveTimeout);
                        }

                        noPlayWarningTimeouts.delete(nowInVC);
                    }, 5 * 60_000); // First 5 mins

                    noPlayWarningTimeouts.set(nowInVC, warningTimeout);
                }

                // Record that this bot is now in the voice channel for this guild.
                botInstance.client.voiceChannelMap.set(guildId, nowInVC);
            }
        }

        const channel = newState.channel;
        if (!channel || newState.member?.user.bot) return;

        const humans = channel.members.filter(m => !m.user.bot);
        if (humans.size > 0 && noListenerTimeouts?.has(wasInVC)) {
            clearTimeout(noListenerTimeouts.get(wasInVC));
            noListenerTimeouts.delete(wasInVC);
        }
    } catch (err) {
        console.error(err);
        // Do nothing
    }
};