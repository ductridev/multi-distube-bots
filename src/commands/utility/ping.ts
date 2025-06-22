// src/commands/ping.ts
/*
    Command: ping
    Description: Ping pong.
    Usage: b!ping
    Category: utility
    Aliases:
*/

import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../../@types/command';
import DisTube from 'distube';
import { replyEmbedWFooter, replyWithEmbed } from '../../utils/embedHelper';

const ping: Command = {
    name: 'ping',
    description: 'Ping pong.',
    usage: 'b!ping',
    category: 'utility',
    aliases: [],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        const embed = new EmbedBuilder()
            .setColor(0x00bfff)
            .setDescription('🏓 Đang đo độ trễ...');

        const sent = await replyEmbedWFooter(message, embed);

        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(message.client.ws.ping);

        const updatedEmbed = EmbedBuilder.from(embed)
            .setDescription(`🏓 Pong! Tin nhắn phản hồi mất **${latency}ms**\n🌐 Độ trễ API: **${apiPing}ms**`);

        await sent.edit({ embeds: [updatedEmbed] });
    },
};

export = ping;
