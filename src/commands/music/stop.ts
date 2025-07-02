// src/commands/stop.ts
/* 
    Command: stop
    Description: Stops the bot and leaving the voice channel.
    Usage: b!stop
    Category: music
    Aliases: st
*/

import { Message } from "discord.js";
import { Command } from "../../@types/command";
import DisTube from "distube";
import { replyWithEmbed } from "../../utils/embedHelper";
import { startVotingUI } from "../../utils/startVotingUI";
import { QueueSessionModel } from "../../models/QueueSession";
import ExtendedClient from "../../@types/extendedClient";
import { clearVoiceTimeouts } from "../../utils/clearVoiceTimeouts";

const stop: Command = {
    name: 'stop',
    description: 'Dừng phát và rời khỏi kênh thoại.',
    usage: 'b!stop',
    category: 'music',
    aliases: ['st'],
    execute: async (message: Message, args: string[], distube: DisTube, client: ExtendedClient) => {
        try {
            await startVotingUI(message, distube, 'stop', async () => {
                const guildId = message.guild?.id;
                if (!guildId) return;

                const vc = message.member?.voice.channel;
                if (!vc) {
                    await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                    return;
                }

                if (!distube.voices.get(guildId)) {
                    await replyWithEmbed(message, 'error', 'Bot không ở trong kênh thoại.');
                    return;
                }

                const queue = distube.getQueue(guildId);
                if (queue) {
                    queue.voice.leave();
                    await queue.stop();
                } else {
                    distube.voices.leave(guildId);
                }

                const vcId = vc.id;
                clearVoiceTimeouts(vcId, client.noSongTimeouts!, client.noPlayWarningTimeouts!);
                client.voiceChannelMap.delete(guildId);

                QueueSessionModel.deleteOne({ userId: message.author.id });
                await replyWithEmbed(message, 'success', '👋 Đã dừng phát và rời khỏi kênh thoại. Hẹn gặp lại ✌💋');
            });
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
}

export = stop;