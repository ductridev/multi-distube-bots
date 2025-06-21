import { VoiceState } from "discord.js";
import BotInstance from "../../@types/botInstance";

export const onVoiceStateUpdate = (oldState: VoiceState, newState: VoiceState, activeBots: BotInstance[], noListenerTimeouts: Map<string, NodeJS.Timeout>) => {
    const botInstance = activeBots.find(b => b.client.user?.id === newState.id);
    if (botInstance) {
        botInstance.currentVoiceChannelId = newState.channelId ?? undefined;
    }

    const channel = newState.channel;
    const guildId = newState.guild.id;
    if (!channel || newState.member?.user.bot) return;

    const humans = channel.members.filter(m => !m.user.bot);
    if (humans.size > 0 && noListenerTimeouts?.has(guildId)) {
        clearTimeout(noListenerTimeouts.get(guildId));
        noListenerTimeouts.delete(guildId);
    }
};