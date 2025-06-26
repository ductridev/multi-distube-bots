// src/commands/music/volume.ts
/* 
    Command: volume
    Description: Changes the volume.
    Usage: b!volume <0-200>
    Category: music
    Aliases: v
*/

import { Command } from "../../@types/command";
import { replyWithEmbed } from "../../utils/embedHelper";

const volume: Command = {
    name: 'volume',
    description: 'Thay đổi âm lượng.',
    usage: 'b!volume <0-200>',
    category: 'music',
    aliases: ['v'],
    execute: async (message, args, distube) => {
        try {
            const vc = message.member?.voice.channel;
            if (!vc) {
                await replyWithEmbed(message, 'error', 'Bạn cần vào kênh thoại.');
                return;
            }

            if (args[0] === 'default' || args.join(" ") === "mặc định") {
                distube.getQueue(message)?.setVolume(50);
                await replyWithEmbed(message, 'success', 'Đã thay đổi âm lượng phát về mặc định.');
                return;
            }

            const volume = parseFloat(args[0]);

            if (isNaN(volume) || volume < 0 || volume > 200) {
                await replyWithEmbed(message, 'error', 'Âm lượng phải nằm trong khoảng 0 đến 200.');
                return;
            }

            distube.getQueue(message)?.setVolume(volume);
            await replyWithEmbed(message, 'success', `Đã thay đổi âm lượng phát thành ${volume}.`);
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
}

export = volume;