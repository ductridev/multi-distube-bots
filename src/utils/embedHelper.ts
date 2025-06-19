// src/utils/embedHelper.ts
import { EmbedBuilder, GuildTextBasedChannel, Message } from 'discord.js';

export const messageType = {
    error: '❌ Lỗi',
    success: '✅ Thành công',
    info: 'ℹ️ Thông báo',
    warning: '⚠️ Cảnh báo',
} as const;

export type MessageType = keyof typeof messageType;

export function createEmbed(type: MessageType, description: string, color?: number, title?: string) {
    const defaultColors: Record<MessageType, number> = {
        error: 0xff5555,
        success: 0x57f287,
        info: 0x00bfff,
        warning: 0xffcc00,
    };

    return new EmbedBuilder()
        // .setTitle(title ?? messageType[type])
        .setDescription(description)
        .setColor(color ?? defaultColors[type])
        .setFooter({ text: 'BuNgo Music Bot 🎵 • Maded by Tổ Rắm Độc with ♥️', iconURL: 'https://i.imgur.com/YOUR_ICON.png' })
        .setTimestamp();
}

export function replyWithEmbed(message: Message, type: MessageType, description: string, color?: number, title?: string) {
    const embed = createEmbed(type, description, color, title);
    return message.reply({ embeds: [embed] });
}

export function replyEmbedWFooter(message: Message, embed: EmbedBuilder) {
    embed
        .setFooter({ text: 'BuNgo Music Bot 🎵 • Maded by Tổ Rắm Độc with ♥️', iconURL: 'https://i.imgur.com/YOUR_ICON.png' })
        .setTimestamp();
    return (message.channel as GuildTextBasedChannel).send({ embeds: [embed] });
}

export function sendWithEmbed(channel: GuildTextBasedChannel, type: MessageType, description: string, color?: number, title?: string) {
    const embed = createEmbed(type, description, color, title);
    return channel.send({ embeds: [embed] });
}