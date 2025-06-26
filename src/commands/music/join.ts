// src/commands/join.js
/* 
    Command: join
    Description: Joins the voice channel the user is in.
    Usage: b!join
    Category: music
    Aliases: j
*/

import { Command } from '../../@types/command';
import { Message } from 'discord.js';
import { DisTube } from 'distube';
import { replyWithEmbed } from '../../utils/embedHelper';
import { setInitiator } from '../../utils/sessionStore';
import { canBotJoinVC } from '../../utils/voicePermission';

const join: Command = {
    name: 'join',
    description: 'Tham gia kênh thoại của người dùng.',
    usage: 'b!join',
    category: 'music',
    aliases: ['j'],
    async execute(message: Message, args: string[], distube: DisTube) {
        try {
            const vc = message.member?.voice.channel;
            if (!vc) {
                await replyWithEmbed(message, 'error', 'Bạn cần vào một kênh thoại trước.');
                return;
            }

            const error = canBotJoinVC(vc, message.client.user!.id);
            if (error) {
                await replyWithEmbed(message, 'error', error);
                return;
            }

            setInitiator(message.guildId!, vc.id, message.author.id);

            try {
                // Note: DisTube handles join internally on play
                distube.voices.join(vc);
                await replyWithEmbed(message, 'success', `Đang sẵn sàng phát nhạc tại **${vc.name}**.`);
            } catch (err) {
                console.error('Lỗi khi tham gia kênh:', err);
                await replyWithEmbed(message, 'error', 'Không thể tham gia kênh thoại.');
            }
        } catch (err) {
            console.error(err);
            // Do nothing
        }
    },
};

export = join;
