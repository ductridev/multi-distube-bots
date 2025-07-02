// src/utils/selectBotResponseUser.ts
import BotInstance from "../@types/botInstance";
import { Command } from "../@types/command";

export default function selectBotForCommand(
    command: Command,
    activeBots: BotInstance[],
    guildId: string,
    userVCId?: string | null,
    usedPrefix?: string
): [BotInstance, boolean] {
    if (command.category === 'music') {
        // 1. Bot already in user's VC
        const sameVCBot = activeBots.find(bot =>
            bot.client.voiceChannelMap?.get(guildId) === userVCId
        );
        if (sameVCBot) return [sameVCBot, true];

        // 2. Matching prefix and idle
        if (usedPrefix) {
            const matchingFreeBot = activeBots.find(
                bot => bot.client.prefix === usedPrefix && !bot.client.voiceChannelMap?.get(guildId)
            );
            if (matchingFreeBot) return [matchingFreeBot, true];
        }

        // 3. Any idle bot
        const idleBot = activeBots.find(bot => !bot.client.voiceChannelMap?.get(guildId));
        if (idleBot) return [idleBot, true];

        // 4. Fallback to first bot
        return [activeBots[0], false];
    }

    // Non-music → fallback
    return [activeBots[0], true];
}
