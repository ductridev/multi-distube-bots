// src/utils/embedHelper.ts
import { ActionRowBuilder, EmbedBuilder, GuildTextBasedChannel, Message } from 'discord.js';
import { getEmbedFooter } from './embedSettingsLoader';
import { canBotReadReply } from './channelPermission';

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

export async function replyWithEmbed(message: Message, type: MessageType, description: string, color?: number, title?: string, actionRow?: ActionRowBuilder<any> | ActionRowBuilder<any>[]) {
    try {
        const { msg, ableReply, ableSend } = canBotReadReply(message.channel as GuildTextBasedChannel, message.client.user!.id);
        if (msg) {
            const embed = await createEmbed('error', msg, color, title);
            if (ableReply) return message.reply({ embeds: [embed] });
            else if (ableSend) return (message.channel as GuildTextBasedChannel).send({ embeds: [embed] });
            return message.author.send({ embeds: [embed] });
        }

        const embed = await createEmbed(type, description, color, title);
        const components = actionRow
            ? Array.isArray(actionRow)
                ? actionRow
                : [actionRow]
            : [];
        return await message.reply({ embeds: [embed], components });
    } catch (e) {
        console.error(e);
    }
}

export async function replyEmbedWFooter(message: Message, embed: EmbedBuilder, actionRow?: ActionRowBuilder<any> | ActionRowBuilder<any>[]) {
    const footer = await getEmbedFooter();
    embed
        .setFooter(footer)
        .setTimestamp();
    const components = actionRow
        ? Array.isArray(actionRow)
            ? actionRow
            : [actionRow]
        : [];
    return message.reply({ embeds: [embed], components });
}

export async function sendWithEmbed(channel: GuildTextBasedChannel, type: MessageType, description: string, color?: number, title?: string, actionRow?: ActionRowBuilder<any> | ActionRowBuilder<any>[]) {
    try {
        const embed = await createEmbed(type, description, color, title);
        const components = actionRow
            ? Array.isArray(actionRow)
                ? actionRow
                : [actionRow]
            : [];
        return await channel.send({
            embeds: [embed], components, flags: [4096]
        });
    } catch (e) {
        console.error(e);
    }
}