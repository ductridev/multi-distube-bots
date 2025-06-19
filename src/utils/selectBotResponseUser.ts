// src/utils/selectBotResponseUser.ts
import BotInstance from "../@types/botInstance";
import { Command } from "../@types/command";

export default function selectBotForCommand(command: Command, activeBots: BotInstance[], userVCId?: string | null): [BotInstance, boolean] {
    if (command.category === 'music') {
        // 1. Bot already in same VC as user
        const sameVCBot = activeBots.find(bot => bot.currentVoiceChannelId === userVCId);
        if (sameVCBot) return [sameVCBot, true];

        // 2. Bot not in any VC
        const idleBot = activeBots.find(bot => !bot.currentVoiceChannelId);
        if (idleBot) return [idleBot, true];

        // 3. Fallback
        return [activeBots[0], false];
    }

    // Non-music → always use default
    return [activeBots[0], true];
}
