// src/events/discord/onVoiceStateUpdate.ts

import { VoiceState } from "discord.js";
import BotInstance from "../../@types/botInstance";

export const onVoiceStateUpdate = (oldState: VoiceState, newState: VoiceState, activeBots: BotInstance[], noListenerTimeouts: Map<string, NodeJS.Timeout>) => {
    try {
        const guildId = newState.guild.id;
        const botInstance = activeBots.find(b => b.client.user?.id === newState.id);

        if (botInstance) {
            if (newState.channelId) {
                botInstance.voiceChannelMap.set(guildId, newState.channelId);
            } else {
                botInstance.voiceChannelMap.delete(guildId);
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