// src/utils/embedHelper.ts
import { EmbedBuilder, GuildTextBasedChannel, Message } from 'discord.js';
import { getEmbedFooter } from './embedSettingsLoader';

export const messageType = {
    error: '❌ Lỗi',
    success: '✅ Thành công',
    info: 'ℹ️ Thông báo',
    warning: '⚠️ Cảnh báo',
    denied: '⛔ Không có quyền',
} as const;

export type MessageType = keyof typeof messageType;

export async function createEmbed(type: MessageType, description: string, color?: number, title?: string) {
    const footer = await getEmbedFooter();

    const defaultColors: Record<MessageType, number> = {
        error: 0xff5555,
        success: 0x57f287,
        info: 0x00bfff,
        warning: 0xffcc00,
        denied: 0xff0000
    };

    return new EmbedBuilder()
        // .setTitle(title ?? messageType[type])
        .setDescription(description)
        .setColor(color ?? defaultColors[type])
        .setFooter(footer)
        .setTimestamp();
}

export async function replyWithEmbed(message: Message, type: MessageType, description: string, color?: number, title?: string) {
    const embed = await createEmbed(type, description, color, title);
    return message.reply({ embeds: [embed] });
}

export async function replyEmbedWFooter(message: Message, embed: EmbedBuilder) {
    const footer = await getEmbedFooter();
    embed
        .setFooter(footer)
        .setTimestamp();
    return (message.channel as GuildTextBasedChannel).send({ embeds: [embed] });
}

export async function sendWithEmbed(channel: GuildTextBasedChannel, type: MessageType, description: string, color?: number, title?: string) {
    const embed = await createEmbed(type, description, color, title);
    return channel.send({ embeds: [embed] });
}