// src/events/discord/onVoiceStateUpdate.ts

import { VoiceState } from "discord.js";
import BotInstance from "../../@types/botInstance";
import DisTube from "distube";
import { deleteByVoiceChannelId } from "../../utils/voiceChannelMap";

export const onVoiceStateUpdate = async (oldState: VoiceState, newState: VoiceState, activeBots: BotInstance[], noListenerTimeouts: Map<string, NodeJS.Timeout>, distube: DisTube) => {
    try {
        const guildId = newState.guild.id;
        const botInstance = activeBots.find(b => b.client.user?.id === newState.id);
        const wasInVC = oldState.channelId ?? '';
        const nowInVC = newState.channelId;

        if (botInstance) {
            if (wasInVC && !nowInVC) {
                const queue = distube.getQueue(wasInVC);
                if (queue) {
                    queue.voice.leave();
                    await queue.stop();
                    console.log(`[VoiceState] đã rời khỏi vc ${wasInVC}, dừng phát.`);
                }
                deleteByVoiceChannelId(botInstance.voiceChannelMap, wasInVC);
            } else if (nowInVC) {
                botInstance.voiceChannelMap.set(guildId, nowInVC);
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