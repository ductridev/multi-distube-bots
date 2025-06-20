// src/commands/ping.ts
/*
    Command: ping
    Description: Ping pong.
    Usage: b!ping
    Category: utility
    Aliases:
*/

import { Message } from "discord.js";
import { Command } from "../@types/command";
import DisTube from "distube";
import { replyWithEmbed } from "../utils/embedHelper";

const ping: Command = {
    name: 'ping',
    description: 'Ping pong.',
    usage: 'b!ping',
    category: 'utility',
    aliases: [],
    execute: async (message: Message, args: string[], distube: DisTube) => {
        const sent = await replyWithEmbed(message, 'info', '🏓 Đang đo độ trễ...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(message.client.ws.ping);

        await sent.edit(`🏓 Pong! Tin nhắn phản hồi mất **${latency}ms**\n🌐 Độ trễ: **${apiPing}ms**`);
    }
};

export = ping;