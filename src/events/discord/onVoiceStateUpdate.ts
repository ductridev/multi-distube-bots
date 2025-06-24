// src/events/discord/onVoiceStateUpdate.ts

import { VoiceState } from "discord.js";
import BotInstance from "../../@types/botInstance";
import DisTube from "distube";

export const onVoiceStateUpdate = (oldState: VoiceState, newState: VoiceState, activeBots: BotInstance[], noListenerTimeouts: Map<string, NodeJS.Timeout>, distube: DisTube) => {
    try {
        const guildId = newState.guild.id;
        const botInstance = activeBots.find(b => b.client.user?.id === newState.id);

        if (botInstance) {
            const wasInVC = oldState.channelId;
            const nowInVC = newState.channelId;

            if (wasInVC && !nowInVC) {
                const queue = distube.getQueue(guildId);
                if (queue) {
                    queue.stop();
                    console.log(`[VoiceState] Bot left VC in guild ${guildId}, queue stopped.`);
                }
                botInstance.voiceChannelMap.delete(guildId);
            } else if (nowInVC) {
                botInstance.voiceChannelMap.set(guildId, nowInVC);
            }
        }

        const channel = newState.channel;
        if (!channel || newState.member?.user.bot) return;

        const humans = channel.members.filter(m => !m.user.bot);
        if (humans.size > 0 && noListenerTimeouts?.has(guildId)) {
            clearTimeout(noListenerTimeouts.get(guildId));
            noListenerTimeouts.delete(guildId);
        }
    } catch (err) {
        console.error(err);
        // Do nothing
    }
};